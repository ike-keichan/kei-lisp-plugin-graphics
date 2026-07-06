/* eslint-disable unicorn/prefer-math-min-max,
                  sonarjs/no-nested-conditional,
                  sonarjs/no-duplicate-string */

// These lint rules are disabled file-wide so the ported handlers can preserve
// the legacy Graphist patterns (clamp ternaries, mode-flag ternaries,
// repeated diagnostic strings) without per-line escape hatches.

import type { KeiLispPlugin, LispValue, PluginContext } from 'kei-lisp';
import { Cons, EvalError, InterpretedSymbol, Numeric } from 'kei-lisp';

// Allowed values for the enum-string setters, mirroring the Canvas 2D API
// types. Invalid values are rejected with a diagnostic instead of being
// silently ignored by the canvas.
const LINE_CAPS = new Set<string>(['butt', 'round', 'square']);
const LINE_JOINS = new Set<string>(['miter', 'round', 'bevel']);
const TEXT_ALIGNS = new Set<string>(['left', 'right', 'center', 'start', 'end']);
const TEXT_BASELINES = new Set<string>([
  'top',
  'hanging',
  'middle',
  'alphabetic',
  'ideographic',
  'bottom',
]);
const TEXT_DIRECTIONS = new Set<string>(['ltr', 'rtl', 'inherit']);
const FONT_KERNINGS = new Set<string>(['auto', 'normal', 'none']);
const FONT_STRETCHES = new Set<string>([
  'ultra-condensed',
  'extra-condensed',
  'condensed',
  'semi-condensed',
  'normal',
  'semi-expanded',
  'expanded',
  'extra-expanded',
  'ultra-expanded',
]);
const FONT_VARIANTS = new Set<string>([
  'normal',
  'small-caps',
  'all-small-caps',
  'petite-caps',
  'all-petite-caps',
  'unicase',
  'titling-caps',
]);
const TEXT_RENDERINGS = new Set<string>([
  'auto',
  'optimizeSpeed',
  'optimizeLegibility',
  'geometricPrecision',
]);
const PATTERN_REPETITIONS = new Set<string>(['repeat', 'repeat-x', 'repeat-y', 'no-repeat']);
const COMPOSITE_OPERATIONS = new Set<string>([
  'source-over',
  'source-in',
  'source-out',
  'source-atop',
  'destination-over',
  'destination-in',
  'destination-out',
  'destination-atop',
  'lighter',
  'copy',
  'xor',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]);

/**
 * @class
 * @classdesc Canvas2D drawing plugin for the kei-lisp interpreter. Implements
 *            the `KeiLispPlugin` contract (`name` / `has` / `apply`) and
 *            exposes 75 `g…` Lisp functions that proxy to a 2D rendering
 *            context. Failures (wrong arity,
 *            type mismatch, closed canvas, canvas-level errors) signal an
 *            `EvalError` that Lisp callers can intercept with
 *            `(handler-case … (eval-error (e) …))`; only diagnostics from
 *            asynchronous work (image loading, OffscreenCanvas file writes)
 *            still go to `process.stderr`, because they happen after the
 *            call has returned.
 * @author Keisuke Ikeda
 */
export class GraphicsPlugin implements KeiLispPlugin {
  /**
   * Dispatch map from a Lisp function name (InterpretedSymbol) to the name of
   * the GraphicsPlugin method that implements it. Private so hosts cannot
   * mutate the registered function set.
   */
  static readonly #builtInFunctions: Map<InterpretedSymbol, string> = GraphicsPlugin.#setup();

  /**
   * Lists every Lisp function name this plugin registers.
   * @return the sorted `g…` function names
   */
  static functionNames(): string[] {
    // Iterator helpers and Array#toSorted are not typed under the ES2022 lib
    // this project compiles against, so spread the iterator and sort a copy.
    return (
      // eslint-disable-next-line unicorn/prefer-iterator-to-array
      [...GraphicsPlugin.#builtInFunctions.keys()]
        .map(String)
        // Array#toSorted is not typed under the ES2022 lib this project
        // compiles against, so sort a fresh copy in place.
        // eslint-disable-next-line unicorn/no-array-sort
        .sort((a, b) => a.localeCompare(b))
    );
  }

  /**
   * Builds the dispatch table.
   * @return the dispatch table
   */
  static #setup(): Map<InterpretedSymbol, string> {
    const aTable = new Map<InterpretedSymbol, string>();
    aTable.set(InterpretedSymbol.of('galpha'), 'gAlpha');
    aTable.set(InterpretedSymbol.of('garc'), 'gArc');
    aTable.set(InterpretedSymbol.of('garc-to'), 'gArcTo');
    aTable.set(InterpretedSymbol.of('gbezcurve-to'), 'gBezCurveTo');
    aTable.set(InterpretedSymbol.of('gclear'), 'gClear');
    aTable.set(InterpretedSymbol.of('gclose'), 'gClose');
    aTable.set(InterpretedSymbol.of('gcolor'), 'gColor');
    aTable.set(InterpretedSymbol.of('gfill'), 'gFill');
    aTable.set(InterpretedSymbol.of('gfill-color'), 'gFillColor');
    aTable.set(InterpretedSymbol.of('gfill-rect'), 'gFillRect');
    aTable.set(InterpretedSymbol.of('gfill-text'), 'gFillText');
    aTable.set(InterpretedSymbol.of('gfill-tri'), 'gFillTri');
    aTable.set(InterpretedSymbol.of('gfinish-path'), 'gFinishPath');
    aTable.set(InterpretedSymbol.of('gimage'), 'gImage');
    aTable.set(InterpretedSymbol.of('gmove-to'), 'gMoveTo');
    aTable.set(InterpretedSymbol.of('gline-to'), 'gLineTo');
    aTable.set(InterpretedSymbol.of('gline-cap'), 'gLineCap');
    aTable.set(InterpretedSymbol.of('gline-join'), 'gLineJoin');
    aTable.set(InterpretedSymbol.of('gline-width'), 'gLineWidth');
    aTable.set(InterpretedSymbol.of('gopen'), 'gOpen');
    aTable.set(InterpretedSymbol.of('gpattern'), 'gPattern');
    aTable.set(InterpretedSymbol.of('gquadcurve-to'), 'gQuadCurveTo');
    aTable.set(InterpretedSymbol.of('gsave-jpeg'), 'gSaveJpeg');
    aTable.set(InterpretedSymbol.of('gsave-png'), 'gSavePng');
    aTable.set(InterpretedSymbol.of('gscale'), 'gScale');
    aTable.set(InterpretedSymbol.of('gshadow-blur'), 'gShadowBlur');
    aTable.set(InterpretedSymbol.of('gshadow-color'), 'gShadowColor');
    aTable.set(InterpretedSymbol.of('gshadow-offsetx'), 'gShadowOffsetX');
    aTable.set(InterpretedSymbol.of('gshadow-offsety'), 'gShadowOffsetY');
    aTable.set(InterpretedSymbol.of('gsleep'), 'gSleep');
    aTable.set(InterpretedSymbol.of('gstart-path'), 'gStartPath');
    aTable.set(InterpretedSymbol.of('gstroke'), 'gStroke');
    aTable.set(InterpretedSymbol.of('gstroke-color'), 'gStrokeColor');
    aTable.set(InterpretedSymbol.of('gstroke-rect'), 'gStrokeRect');
    aTable.set(InterpretedSymbol.of('gstroke-text'), 'gStrokeText');
    aTable.set(InterpretedSymbol.of('gstroke-tri'), 'gStrokeTri');
    aTable.set(InterpretedSymbol.of('gtext-align'), 'gTextAlign');
    aTable.set(InterpretedSymbol.of('gtext-direction'), 'gTextDirection');
    aTable.set(InterpretedSymbol.of('gtext-font'), 'gTextFont');
    aTable.set(InterpretedSymbol.of('gtext-baseline'), 'gTextBaseline');
    aTable.set(InterpretedSymbol.of('gtranslate'), 'gTranslate');
    aTable.set(InterpretedSymbol.of('grect'), 'gRect');
    aTable.set(InterpretedSymbol.of('grotate'), 'gRotate');
    aTable.set(InterpretedSymbol.of('gsave'), 'gSave');
    aTable.set(InterpretedSymbol.of('grestore'), 'gRestore');
    aTable.set(InterpretedSymbol.of('gellipse'), 'gEllipse');
    aTable.set(InterpretedSymbol.of('ground-rect'), 'gRoundRect');
    aTable.set(InterpretedSymbol.of('gline-dash'), 'gLineDash');
    aTable.set(InterpretedSymbol.of('gline-dash-offset'), 'gLineDashOffset');
    aTable.set(InterpretedSymbol.of('gmiter-limit'), 'gMiterLimit');
    aTable.set(InterpretedSymbol.of('gclip'), 'gClip');
    aTable.set(InterpretedSymbol.of('gis-point-in-path'), 'gIsPointInPath');
    aTable.set(InterpretedSymbol.of('gis-point-in-stroke'), 'gIsPointInStroke');
    aTable.set(InterpretedSymbol.of('gtransform'), 'gTransform');
    aTable.set(InterpretedSymbol.of('gset-transform'), 'gSetTransform');
    aTable.set(InterpretedSymbol.of('greset-transform'), 'gResetTransform');
    aTable.set(InterpretedSymbol.of('gcomposite'), 'gComposite');
    aTable.set(InterpretedSymbol.of('gfilter'), 'gFilter');
    aTable.set(InterpretedSymbol.of('gimage-smoothing'), 'gImageSmoothing');
    aTable.set(InterpretedSymbol.of('gmeasure-text'), 'gMeasureText');
    aTable.set(InterpretedSymbol.of('gletter-spacing'), 'gLetterSpacing');
    aTable.set(InterpretedSymbol.of('gword-spacing'), 'gWordSpacing');
    aTable.set(InterpretedSymbol.of('gfont-kerning'), 'gFontKerning');
    aTable.set(InterpretedSymbol.of('gfont-stretch'), 'gFontStretch');
    aTable.set(InterpretedSymbol.of('gfont-variant'), 'gFontVariant');
    aTable.set(InterpretedSymbol.of('gtext-rendering'), 'gTextRendering');
    aTable.set(InterpretedSymbol.of('gclear-rect'), 'gClearRect');
    aTable.set(InterpretedSymbol.of('greset'), 'gReset');
    aTable.set(InterpretedSymbol.of('gwidth'), 'gWidth');
    aTable.set(InterpretedSymbol.of('gheight'), 'gHeight');
    aTable.set(InterpretedSymbol.of('gpixel'), 'gPixel');
    aTable.set(InterpretedSymbol.of('gset-pixel'), 'gSetPixel');
    aTable.set(InterpretedSymbol.of('glinear-gradient'), 'gLinearGradient');
    aTable.set(InterpretedSymbol.of('gradial-gradient'), 'gRadialGradient');
    aTable.set(InterpretedSymbol.of('gconic-gradient'), 'gConicGradient');
    return aTable;
  }

  /**
   * Loaded-image cache shared by `gimage` and `gpattern`. Repeated draws of
   * the same `src` reuse the loaded element and run synchronously, so they
   * keep their place in the drawing order instead of racing the load.
   */
  readonly #imageCache = new Map<string, HTMLImageElement>();

  /**
   * Plugin identifier, used for diagnostics.
   */
  readonly name: string = 'graphics';

  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  isOpen: boolean;

  /**
   * Constructor.
   * @constructor
   * @param canvas - the canvas to draw to
   */
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isOpen = false;
  }

  /**
   * Writes a diagnostic line to `process.stderr`, matching the convention
   * used by kei-lisp itself (`Applier.format` writes to `process.stdout`).
   * Used only where an `EvalError` cannot reach the caller: asynchronous
   * work (image loading), best-effort color parsing, and the informational
   * line printed by `gopen`. In a Node runtime this hits the real stderr; in
   * a browser kei-lisp host (e.g. kei-lisp-web) the host typically swaps
   * `process.stderr.write` for a sink that routes to the REPL output panel.
   * In a plain browser with no `process` shim at all, the line falls back to
   * `console.error` instead of throwing.
   * @param line - the line to write
   */
  #print(line: string): void {
    const stderr = (globalThis as { process?: { stderr?: { write?: (chunk: string) => boolean } } })
      .process?.stderr;
    if (typeof stderr?.write === 'function') {
      stderr.write(line + '\n');
      return;
    }
    console.error(line);
  }

  /**
   * Resolves an image for the given source and runs `draw` with it —
   * synchronously when the image is already loaded, on its `load` event
   * otherwise. A load failure prints a diagnostic once (the failure happens
   * asynchronously, after the calling `g…` function has already returned, so
   * it cannot signal an `EvalError`).
   * @param source - the image URL / data URI
   * @param draw - the drawing action to run once the image is available
   */
  #withImage(source: string, draw: (image: HTMLImageElement) => void): void {
    const cached = this.#imageCache.get(source);
    const image = cached ?? new Image();
    if (cached === undefined) {
      image.src = source;
      this.#imageCache.set(source, image);
      image.addEventListener('error', () => {
        this.#print(`Can not load image: ${source}`);
      });
    }
    if (image.complete) {
      draw(image);
      return;
    }
    image.addEventListener('load', () => {
      draw(image);
    });
  }

  /**
   * Returns the 2D context, signaling an `EvalError` when the canvas exposes
   * no usable context or has not been opened with `gopen`.
   * @return the 2D rendering context
   */
  #requireOpenContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    if (this.ctx === null) {
      throw new EvalError(
        'Unable to initialize canvas. The browser or machine may not support it.',
      );
    }
    if (!this.isOpen) {
      throw new EvalError('The canvas is closed and cannot be executed.');
    }
    return this.ctx;
  }

  /**
   * Shared guard-and-dispatch skeleton for the `g…` methods: requires an
   * open canvas context, runs `body`, and signals an `EvalError` carrying
   * `failureMessage` when `body` returns `null` (bad arguments) or throws a
   * canvas-level error. The error propagates through the evaluator, where
   * Lisp callers can intercept it with
   * `(handler-case … (eval-error (e) …))`.
   * @param failureMessage - the message of the signaled `EvalError`
   * @param body - the drawing action; returns the Lisp result, or `null` on
   *               bad arguments
   * @return the body's result
   */
  #execute(
    failureMessage: string,
    body: (
      context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ) => LispValue | null,
  ): LispValue {
    const context = this.#requireOpenContext();
    let result: LispValue | null;
    try {
      result = body(context);
    } catch (error) {
      throw error instanceof EvalError ? error : new EvalError(failureMessage);
    }
    if (result === null) {
      throw new EvalError(failureMessage);
    }
    return result;
  }

  /**
   * Reads a single string argument and validates it against an allowlist.
   * @param arguments_ - the evaluated argument list
   * @param allowed - the accepted values
   * @return the validated string, or `null` on wrong arity, a non-string
   *         argument, or a value outside the allowlist
   */
  #enumString(arguments_: Cons, allowed: ReadonlySet<string>): string | null {
    if (arguments_.length() !== 1 || !Cons.isString(arguments_.car)) return null;
    return allowed.has(arguments_.car) ? arguments_.car : null;
  }

  /**
   * Reads exactly `count` numbers from the argument list. kei-lisp v3
   * evaluates integers to `bigint` and exact division to `Rational`, so each
   * value is converted to a JS float for the Canvas 2D API.
   * @param arguments_ - the evaluated argument list
   * @param count - the expected argument count
   * @return the numbers, or `null` on wrong arity or a non-number argument
   */
  #numbers(arguments_: Cons, count: number): number[] | null {
    if (arguments_.length() !== count) return null;
    const values: number[] = [];
    let rest = arguments_;
    for (let index = 0; index < count; index++) {
      if (!Cons.isNumber(rest.car)) return null;
      values.push(Numeric.toFloat(rest.car));
      rest = rest.cdr as Cons;
    }
    return values;
  }

  /**
   * Flattens the argument list into a JS array.
   * @param arguments_ - the evaluated argument list
   * @return the argument values in order
   */
  #listValues(arguments_: Cons): LispValue[] {
    const values: LispValue[] = [];
    let rest = arguments_;
    for (let index = arguments_.length(); index > 0; index--) {
      values.push(rest.car);
      rest = rest.cdr as Cons;
    }
    return values;
  }

  /**
   * Builds a Lisp list (Cons chain) from JS values.
   * @param values - the values, at least one
   * @return the list head
   */
  #toList(values: LispValue[]): Cons {
    const head = new Cons(values[0]);
    let tail = head;
    for (let index = 1; index < values.length; index++) {
      tail.cdr = new Cons(values[index]);
      tail = tail.cdr;
    }
    return head;
  }

  /**
   * Applies `(offset color)` pairs to a gradient.
   * @param gradient - the gradient to add stops to
   * @param stops - alternating numeric offsets (0–1) and CSS color strings
   * @return true when every pair was valid and at least one was applied
   */
  #applyGradientStops(gradient: CanvasGradient, stops: LispValue[]): boolean {
    if (stops.length === 0 || stops.length % 2 !== 0) return false;
    for (let index = 0; index < stops.length; index += 2) {
      const offset = stops[index];
      const color = stops[index + 1];
      if (!Cons.isNumber(offset) || !Cons.isString(color)) return false;
      gradient.addColorStop(Numeric.toFloat(offset), color);
    }
    return true;
  }

  /**
   * Sets both `fillStyle` and `strokeStyle` to the given gradient after
   * applying its stops, mirroring how `gcolor` sets both styles at once.
   * @param context - the 2D context
   * @param gradient - the gradient to install
   * @param stops - alternating offsets and colors (see #applyGradientStops)
   * @return `t` on success, `null` on invalid stops
   */
  #installGradient(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    gradient: CanvasGradient,
    stops: LispValue[],
  ): LispValue | null {
    if (!this.#applyGradientStops(gradient, stops)) return null;
    context.fillStyle = gradient;
    context.strokeStyle = gradient;
    return InterpretedSymbol.of('t');
  }

  /**
   * Encodes the canvas via `toDataURL` and triggers a browser download through
   * a temporary `<a download>` element. Requires a DOM (`document`) and an
   * `HTMLCanvasElement`; `OffscreenCanvas` has no `toDataURL`, and Node.js has
   * no `document` — those callers must pass a file path instead.
   * @param mimeType - the image MIME type to encode
   * @param label - the format name used in diagnostics ("jpeg" / "png")
   * @return `t` on success
   */
  #downloadCanvas(mimeType: string, label: string): LispValue {
    if (typeof document === 'undefined' || !('toDataURL' in this.canvas)) {
      throw new EvalError(
        `Can not save ${label}. Browser download needs a DOM and an HTMLCanvasElement; pass a file path to save on Node.js.`,
      );
    }
    try {
      const link = document.createElement('a');
      link.href = this.canvas.toDataURL(mimeType);
      link.download = 'canvas';
      document.body.append(link);
      link.click();
      link.remove();
      return InterpretedSymbol.of('t');
    } catch {
      throw new EvalError(
        `Can not save ${label}. If you are using an image in the canvas, you can't save ${label}.`,
      );
    }
  }

  /**
   * Writes the encoded canvas image to a file path on Node.js, using
   * `process.getBuiltinModule('node:fs')` so browser bundles never see a
   * `node:fs` import. `HTMLCanvasElement` (and node-canvas) encode
   * synchronously via `toDataURL`; `OffscreenCanvas` only offers the async
   * `convertToBlob`, so its file is written after this returns — the same
   * fire-and-forget contract as `gImage`.
   * @param path - the destination file path
   * @param mimeType - the image MIME type to encode
   * @param label - the format name used in diagnostics ("jpeg" / "png")
   * @return `t` on success
   */
  #writeCanvasToFile(path: string, mimeType: string, label: string): LispValue {
    const fs =
      typeof process.getBuiltinModule === 'function'
        ? process.getBuiltinModule('node:fs')
        : undefined;
    if (fs === undefined) {
      throw new EvalError(`Can not save ${label}. Saving to a file path requires Node.js.`);
    }
    try {
      if ('toDataURL' in this.canvas) {
        const dataUrl = this.canvas.toDataURL(mimeType);
        const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
        // Uint8Array.fromBase64 is unavailable on Node 24 (the minimum supported
        // engine), so decode with Buffer instead.
        // eslint-disable-next-line unicorn/prefer-uint8array-base64
        fs.writeFileSync(path, Buffer.from(base64, 'base64'));
        return InterpretedSymbol.of('t');
      }
      void this.canvas.convertToBlob({ type: mimeType }).then(async (blob) => {
        fs.writeFileSync(path, new Uint8Array(await blob.arrayBuffer()));
      });
      return InterpretedSymbol.of('t');
    } catch {
      throw new EvalError(`Can not save ${label}.`);
    }
  }

  /**
   * Returns true if this plugin handles the given symbol.
   * @param aSymbol - the call symbol
   * @return true if `apply` should be called
   */
  has(aSymbol: InterpretedSymbol): boolean {
    return GraphicsPlugin.#builtInFunctions.has(aSymbol);
  }

  /**
   * Dispatches the given symbol to the matching `g…` method.
   * @param aSymbol - the call symbol
   * @param arguments_ - the evaluated argument list
   * @param _context - the interpreter context (unused by this plugin)
   * @return the method's result
   */
  apply(aSymbol: InterpretedSymbol, arguments_: Cons, _context: PluginContext): LispValue {
    const methodName = GraphicsPlugin.#builtInFunctions.get(aSymbol);
    if (methodName === undefined) {
      throw new EvalError(`I could find no procedure description for ${String(aSymbol)}`);
    }
    const target = this as unknown as Record<string, (arguments__: Cons) => LispValue>;
    return target[methodName].call(this, arguments_);
  }

  gAlpha(arguments_: Cons): LispValue {
    return this.#execute('Can not set alpha.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      const aNumber = a[0] <= 0 ? 0 : a[0] >= 1 ? 1 : a[0];
      context.globalAlpha = aNumber;
      return InterpretedSymbol.of('t');
    });
  }

  gArc(arguments_: Cons): LispValue {
    return this.#execute('Can not draw arc.', (context) => {
      const a = this.#numbers(arguments_, 6);
      if (a === null) return null;
      const isAFlag = a[5] >= 0;
      context.arc(a[0], a[1], a[2], (Math.PI / 180) * a[3], (Math.PI / 180) * a[4], isAFlag);
      return InterpretedSymbol.of('t');
    });
  }

  gArcTo(arguments_: Cons): LispValue {
    return this.#execute('Can not draw arc to.', (context) => {
      const a = this.#numbers(arguments_, 5);
      if (a === null) return null;
      context.arcTo(a[0], a[1], a[2], a[3], a[4]);
      return InterpretedSymbol.of('t');
    });
  }

  gBezCurveTo(arguments_: Cons): LispValue {
    return this.#execute('Can not draw bezier curve.', (context) => {
      const a = this.#numbers(arguments_, 6);
      if (a === null) return null;
      context.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
      return InterpretedSymbol.of('t');
    });
  }

  gClear(arguments_: Cons): LispValue {
    return this.#execute('Can not clear.', (context) => {
      const aColor = arguments_.length() === 0 ? '#ffffff' : this.selectColor(arguments_);
      const previous = context.fillStyle;
      context.fillStyle = aColor;
      context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      context.fillStyle = previous;
      return InterpretedSymbol.of('t');
    });
  }

  gClose(): LispValue {
    if (this.ctx === null) {
      throw new EvalError(
        'Unable to initialize canvas. The browser or machine may not support it.',
      );
    }
    if (!this.isOpen) {
      throw new EvalError('The canvas has already been closed.');
    }
    try {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } catch {
      throw new EvalError('Can not close.');
    }
    this.isOpen = false;
    return InterpretedSymbol.of('t');
  }

  gColor(arguments_: Cons): LispValue {
    return this.#execute('Can not set color.', (context) => {
      if (arguments_.length() < 1) return null;
      const aColor = this.selectColor(arguments_);
      context.fillStyle = aColor;
      context.strokeStyle = aColor;
      return InterpretedSymbol.of('t');
    });
  }

  gFill(): LispValue {
    return this.#execute('Can not fill.', (context) => {
      context.fill();
      return InterpretedSymbol.of('t');
    });
  }

  gFillColor(arguments_: Cons): LispValue {
    return this.#execute('Can not set fill color.', (context) => {
      if (arguments_.length() < 1) return null;
      context.fillStyle = this.selectColor(arguments_);
      return InterpretedSymbol.of('t');
    });
  }

  gFillRect(arguments_: Cons): LispValue {
    return this.#execute('Can not draw fill rectangle.', (context) => {
      const a = this.#numbers(arguments_, 4);
      if (a === null) return null;
      context.fillRect(a[0], a[1], a[2], a[3]);
      return InterpretedSymbol.of('t');
    });
  }

  gFillText(arguments_: Cons): LispValue {
    return this.#execute('Can not draw fill text.', (context) => {
      const length_ = arguments_.length();
      if (length_ !== 3 && length_ !== 4) return null;
      const [a0, a1, a2, a3] = this.#listValues(arguments_);
      if (!Cons.isString(a0) || !Cons.isNumber(a1) || !Cons.isNumber(a2)) return null;
      if (length_ === 4) {
        if (!Cons.isNumber(a3)) return null;
        context.fillText(a0, Numeric.toFloat(a1), Numeric.toFloat(a2), Numeric.toFloat(a3));
      } else {
        context.fillText(a0, Numeric.toFloat(a1), Numeric.toFloat(a2));
      }
      return InterpretedSymbol.of('t');
    });
  }

  gFillTri(arguments_: Cons): LispValue {
    return this.#execute('Can not draw fill triangle.', (context) => {
      const a = this.#numbers(arguments_, 6);
      if (a === null) return null;
      context.beginPath();
      context.moveTo(a[0], a[1]);
      context.lineTo(a[2], a[3]);
      context.lineTo(a[4], a[5]);
      context.fill();
      return InterpretedSymbol.of('t');
    });
  }

  gFinishPath(): LispValue {
    return this.#execute('Can not finish path.', (context) => {
      context.closePath();
      return InterpretedSymbol.of('t');
    });
  }

  gImage(arguments_: Cons): LispValue {
    return this.#execute('Can not draw Image.', (context) => {
      const length_ = arguments_.length();
      if (length_ !== 3 && length_ !== 5) return null;
      const [a0, a1, a2, a3, a4] = this.#listValues(arguments_);
      if (!Cons.isString(a0) || !Cons.isNumber(a1) || !Cons.isNumber(a2)) return null;
      if (length_ === 5) {
        if (!Cons.isNumber(a3) || !Cons.isNumber(a4)) return null;
        this.#withImage(a0, (image) => {
          context.drawImage(
            image,
            Numeric.toFloat(a1),
            Numeric.toFloat(a2),
            Numeric.toFloat(a3),
            Numeric.toFloat(a4),
          );
        });
      } else {
        this.#withImage(a0, (image) => {
          context.drawImage(image, Numeric.toFloat(a1), Numeric.toFloat(a2));
        });
      }
      return InterpretedSymbol.of('t');
    });
  }

  gLineTo(arguments_: Cons): LispValue {
    return this.#execute('Can not draw line to', (context) => {
      const a = this.#numbers(arguments_, 2);
      if (a === null) return null;
      context.lineTo(a[0], a[1]);
      return InterpretedSymbol.of('t');
    });
  }

  gLineCap(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set line cap. Expected "butt" / "round" / "square".',
      (context) => {
        const value = this.#enumString(arguments_, LINE_CAPS);
        if (value === null) return null;
        context.lineCap = value as CanvasLineCap;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gLineJoin(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set line join. Expected "miter" / "round" / "bevel".',
      (context) => {
        const value = this.#enumString(arguments_, LINE_JOINS);
        if (value === null) return null;
        context.lineJoin = value as CanvasLineJoin;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gLineWidth(arguments_: Cons): LispValue {
    return this.#execute('Can not set line width.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      context.lineWidth = a[0] <= 0 ? 1 : a[0];
      return InterpretedSymbol.of('t');
    });
  }

  gMoveTo(arguments_: Cons): LispValue {
    return this.#execute('Can not move', (context) => {
      const a = this.#numbers(arguments_, 2);
      if (a === null) return null;
      context.moveTo(a[0], a[1]);
      return InterpretedSymbol.of('t');
    });
  }

  gOpen(): LispValue {
    if (this.ctx === null) {
      throw new EvalError(
        'Unable to initialize canvas. The browser or machine may not support it.',
      );
    }
    if (this.isOpen) {
      throw new EvalError('The canvas has already been opened.');
    }
    try {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#000000';
    } catch {
      // The canvas stays closed when the initial clear fails, so a later
      // gopen can retry (the legacy code left it marked open).
      throw new EvalError('Can not open.');
    }
    this.isOpen = true;
    this.#print(`canvas size, width : ${this.canvas.width} height : ${this.canvas.height}`);
    return InterpretedSymbol.of('t');
  }

  gPattern(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set pattern. Expected an image source and a repetition ("repeat" / "repeat-x" / "repeat-y" / "no-repeat").',
      (context) => {
        if (arguments_.length() !== 2) return null;
        const [a0, a1] = this.#listValues(arguments_);
        if (!Cons.isString(a0) || !Cons.isString(a1) || !PATTERN_REPETITIONS.has(a1)) return null;
        this.#withImage(a0, (image) => {
          const pattern = context.createPattern(image, a1);
          if (pattern === null) {
            this.#print('Can not set pattern. The image could not be used as a pattern.');
            return;
          }
          context.fillStyle = pattern;
        });
        return InterpretedSymbol.of('t');
      },
    );
  }

  gQuadCurveTo(arguments_: Cons): LispValue {
    return this.#execute('Can not draw quadratic curve.', (context) => {
      const a = this.#numbers(arguments_, 4);
      if (a === null) return null;
      context.quadraticCurveTo(a[0], a[1], a[2], a[3]);
      return InterpretedSymbol.of('t');
    });
  }

  gSaveJpeg(arguments_: Cons): LispValue {
    return this.saveCanvas(arguments_, 'image/jpeg', 'jpeg');
  }

  gSavePng(arguments_: Cons): LispValue {
    return this.saveCanvas(arguments_, 'image/png', 'png');
  }

  /**
   * Shared implementation of `gsave-jpeg` / `gsave-png`. With no argument it
   * triggers a browser download; with a single string argument it writes the
   * encoded image to that file path on Node.js.
   * @param arguments_ - the evaluated argument list (empty, or one path string)
   * @param mimeType - the image MIME type to encode
   * @param label - the format name used in diagnostics ("jpeg" / "png")
   * @return `t` on success
   */
  saveCanvas(arguments_: Cons, mimeType: string, label: string): LispValue {
    this.#requireOpenContext();
    const length_ = arguments_.length();
    if (length_ === 0) {
      return this.#downloadCanvas(mimeType, label);
    }
    if (length_ === 1 && Cons.isString(arguments_.car)) {
      return this.#writeCanvasToFile(arguments_.car, mimeType, label);
    }
    throw new EvalError(`Can not save ${label}.`);
  }

  gScale(arguments_: Cons): LispValue {
    return this.#execute('Can not scale.', (context) => {
      const a = this.#numbers(arguments_, 2);
      if (a === null) return null;
      context.scale(a[0], a[1]);
      return InterpretedSymbol.of('t');
    });
  }

  gShadowBlur(arguments_: Cons): LispValue {
    return this.#execute('Can not set shadow blur.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      context.shadowBlur = a[0];
      return InterpretedSymbol.of('t');
    });
  }

  gShadowColor(arguments_: Cons): LispValue {
    return this.#execute('Can not set shadow color.', (context) => {
      if (arguments_.length() !== 1) return null;
      context.shadowColor = this.selectColor(arguments_);
      return InterpretedSymbol.of('t');
    });
  }

  gShadowOffsetX(arguments_: Cons): LispValue {
    return this.#execute('Can not set shadow offsetX.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      context.shadowOffsetX = a[0];
      return InterpretedSymbol.of('t');
    });
  }

  gShadowOffsetY(arguments_: Cons): LispValue {
    return this.#execute('Can not set shadow offsetY.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      context.shadowOffsetY = a[0];
      return InterpretedSymbol.of('t');
    });
  }

  gSleep(arguments_: Cons): LispValue {
    return this.#execute('Can not sleep', () => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      const time = Date.now() + a[0];
      while (Date.now() < time) {
        // busy wait
      }
      return InterpretedSymbol.of('t');
    });
  }

  gStartPath(): LispValue {
    return this.#execute('Can not start path.', (context) => {
      context.beginPath();
      return InterpretedSymbol.of('t');
    });
  }

  gStroke(): LispValue {
    return this.#execute('Can not stroke.', (context) => {
      context.stroke();
      return InterpretedSymbol.of('t');
    });
  }

  gStrokeColor(arguments_: Cons): LispValue {
    return this.#execute('Can not set stroke color', (context) => {
      if (arguments_.length() < 1) return null;
      context.strokeStyle = this.selectColor(arguments_);
      return InterpretedSymbol.of('t');
    });
  }

  gStrokeRect(arguments_: Cons): LispValue {
    return this.#execute('Can not draw stroke rectangle.', (context) => {
      const a = this.#numbers(arguments_, 4);
      if (a === null) return null;
      context.strokeRect(a[0], a[1], a[2], a[3]);
      return InterpretedSymbol.of('t');
    });
  }

  gStrokeText(arguments_: Cons): LispValue {
    return this.#execute('Can not draw stroke text.', (context) => {
      const length_ = arguments_.length();
      if (length_ !== 3 && length_ !== 4) return null;
      const [a0, a1, a2, a3] = this.#listValues(arguments_);
      if (!Cons.isString(a0) || !Cons.isNumber(a1) || !Cons.isNumber(a2)) return null;
      if (length_ === 4) {
        if (!Cons.isNumber(a3)) return null;
        context.strokeText(a0, Numeric.toFloat(a1), Numeric.toFloat(a2), Numeric.toFloat(a3));
      } else {
        context.strokeText(a0, Numeric.toFloat(a1), Numeric.toFloat(a2));
      }
      return InterpretedSymbol.of('t');
    });
  }

  gStrokeTri(arguments_: Cons): LispValue {
    return this.#execute('Can not draw stroke triangle.', (context) => {
      const a = this.#numbers(arguments_, 6);
      if (a === null) return null;
      context.beginPath();
      context.moveTo(a[0], a[1]);
      context.lineTo(a[2], a[3]);
      context.lineTo(a[4], a[5]);
      context.closePath();
      context.stroke();
      return InterpretedSymbol.of('t');
    });
  }

  gTextAlign(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set text align. Expected "left" / "right" / "center" / "start" / "end".',
      (context) => {
        const value = this.#enumString(arguments_, TEXT_ALIGNS);
        if (value === null) return null;
        context.textAlign = value as CanvasTextAlign;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gTextBaseline(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set text baseline. Expected "top" / "hanging" / "middle" / "alphabetic" / "ideographic" / "bottom".',
      (context) => {
        const value = this.#enumString(arguments_, TEXT_BASELINES);
        if (value === null) return null;
        context.textBaseline = value as CanvasTextBaseline;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gTextDirection(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set text direction. Expected "ltr" / "rtl" / "inherit".',
      (context) => {
        const value = this.#enumString(arguments_, TEXT_DIRECTIONS);
        if (value === null) return null;
        context.direction = value as CanvasDirection;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gTextFont(arguments_: Cons): LispValue {
    return this.#execute('Can not set text font.', (context) => {
      if (arguments_.length() !== 1 || !Cons.isString(arguments_.car)) return null;
      context.font = arguments_.car;
      return InterpretedSymbol.of('t');
    });
  }

  gTranslate(arguments_: Cons): LispValue {
    return this.#execute('Can not translate.', (context) => {
      const a = this.#numbers(arguments_, 2);
      if (a === null) return null;
      context.translate(a[0], a[1]);
      return InterpretedSymbol.of('t');
    });
  }

  gRect(arguments_: Cons): LispValue {
    return this.#execute('Can not draw rectangle.', (context) => {
      const a = this.#numbers(arguments_, 4);
      if (a === null) return null;
      context.rect(a[0], a[1], a[2], a[3]);
      return InterpretedSymbol.of('t');
    });
  }

  gRotate(arguments_: Cons): LispValue {
    return this.#execute('Can not rotate.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      context.rotate((Math.PI / 180) * a[0]);
      return InterpretedSymbol.of('t');
    });
  }

  /**
   * Pushes the current drawing state (styles, transform, clip) onto the
   * context's state stack. Pairs with `gRestore` to let Lisp callers manage
   * state explicitly. Replaces the legacy per-method `context.save()` calls, which
   * pushed state on every draw with no matching `restore()` and grew the stack
   * unbounded.
   * @return `t` on success
   */
  gSave(): LispValue {
    return this.#execute('Can not save.', (context) => {
      context.save();
      return InterpretedSymbol.of('t');
    });
  }

  /**
   * Pops the most recently saved drawing state off the context's state stack.
   * Pairs with `gSave`. Popping an empty stack is a no-op per the Canvas spec.
   * @return `t` on success
   */
  gRestore(): LispValue {
    return this.#execute('Can not restore.', (context) => {
      context.restore();
      return InterpretedSymbol.of('t');
    });
  }

  gEllipse(arguments_: Cons): LispValue {
    return this.#execute('Can not draw ellipse.', (context) => {
      const a = this.#numbers(arguments_, 8);
      if (a === null) return null;
      context.ellipse(
        a[0],
        a[1],
        a[2],
        a[3],
        (Math.PI / 180) * a[4],
        (Math.PI / 180) * a[5],
        (Math.PI / 180) * a[6],
        a[7] >= 0,
      );
      return InterpretedSymbol.of('t');
    });
  }

  gRoundRect(arguments_: Cons): LispValue {
    return this.#execute('Can not draw round rectangle.', (context) => {
      const a = this.#numbers(arguments_, 5);
      if (a === null) return null;
      context.roundRect(a[0], a[1], a[2], a[3], a[4]);
      return InterpretedSymbol.of('t');
    });
  }

  gLineDash(arguments_: Cons): LispValue {
    return this.#execute('Can not set line dash.', (context) => {
      const segments = this.#numbers(arguments_, arguments_.length());
      if (segments === null) return null;
      context.setLineDash(segments);
      return InterpretedSymbol.of('t');
    });
  }

  gLineDashOffset(arguments_: Cons): LispValue {
    return this.#execute('Can not set line dash offset.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      context.lineDashOffset = a[0];
      return InterpretedSymbol.of('t');
    });
  }

  gMiterLimit(arguments_: Cons): LispValue {
    return this.#execute('Can not set miter limit.', (context) => {
      const a = this.#numbers(arguments_, 1);
      if (a === null) return null;
      context.miterLimit = a[0];
      return InterpretedSymbol.of('t');
    });
  }

  gClip(): LispValue {
    return this.#execute('Can not clip.', (context) => {
      context.clip();
      return InterpretedSymbol.of('t');
    });
  }

  gIsPointInPath(arguments_: Cons): LispValue {
    return this.#execute('Can not test point in path.', (context) => {
      const a = this.#numbers(arguments_, 2);
      if (a === null) return null;
      return context.isPointInPath(a[0], a[1]) ? InterpretedSymbol.of('t') : Cons.nil;
    });
  }

  gIsPointInStroke(arguments_: Cons): LispValue {
    return this.#execute('Can not test point in stroke.', (context) => {
      const a = this.#numbers(arguments_, 2);
      if (a === null) return null;
      return context.isPointInStroke(a[0], a[1]) ? InterpretedSymbol.of('t') : Cons.nil;
    });
  }

  gTransform(arguments_: Cons): LispValue {
    return this.#execute('Can not transform.', (context) => {
      const a = this.#numbers(arguments_, 6);
      if (a === null) return null;
      context.transform(a[0], a[1], a[2], a[3], a[4], a[5]);
      return InterpretedSymbol.of('t');
    });
  }

  gSetTransform(arguments_: Cons): LispValue {
    return this.#execute('Can not set transform.', (context) => {
      const a = this.#numbers(arguments_, 6);
      if (a === null) return null;
      context.setTransform(a[0], a[1], a[2], a[3], a[4], a[5]);
      return InterpretedSymbol.of('t');
    });
  }

  gResetTransform(): LispValue {
    return this.#execute('Can not reset transform.', (context) => {
      context.resetTransform();
      return InterpretedSymbol.of('t');
    });
  }

  gComposite(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set composite operation. Expected a globalCompositeOperation keyword such as "source-over" / "multiply" / "screen".',
      (context) => {
        const value = this.#enumString(arguments_, COMPOSITE_OPERATIONS);
        if (value === null) return null;
        context.globalCompositeOperation = value as GlobalCompositeOperation;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gFilter(arguments_: Cons): LispValue {
    return this.#execute('Can not set filter.', (context) => {
      if (arguments_.length() !== 1 || !Cons.isString(arguments_.car)) return null;
      context.filter = arguments_.car;
      return InterpretedSymbol.of('t');
    });
  }

  gImageSmoothing(arguments_: Cons): LispValue {
    return this.#execute('Can not set image smoothing.', (context) => {
      const quality = arguments_.length() === 1 ? arguments_.car : null;
      if (quality !== 'off' && quality !== 'low' && quality !== 'medium' && quality !== 'high') {
        return null;
      }
      if (quality === 'off') {
        context.imageSmoothingEnabled = false;
      } else {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = quality;
      }
      return InterpretedSymbol.of('t');
    });
  }

  gMeasureText(arguments_: Cons): LispValue {
    return this.#execute('Can not measure text.', (context) => {
      if (arguments_.length() !== 1 || !Cons.isString(arguments_.car)) return null;
      return context.measureText(arguments_.car).width;
    });
  }

  gLetterSpacing(arguments_: Cons): LispValue {
    return this.#execute('Can not set letter spacing.', (context) => {
      if (arguments_.length() !== 1 || !Cons.isString(arguments_.car)) return null;
      context.letterSpacing = arguments_.car;
      return InterpretedSymbol.of('t');
    });
  }

  gWordSpacing(arguments_: Cons): LispValue {
    return this.#execute('Can not set word spacing.', (context) => {
      if (arguments_.length() !== 1 || !Cons.isString(arguments_.car)) return null;
      context.wordSpacing = arguments_.car;
      return InterpretedSymbol.of('t');
    });
  }

  gFontKerning(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set font kerning. Expected "auto" / "normal" / "none".',
      (context) => {
        const value = this.#enumString(arguments_, FONT_KERNINGS);
        if (value === null) return null;
        context.fontKerning = value as CanvasFontKerning;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gFontStretch(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set font stretch. Expected a font-stretch keyword such as "condensed" / "normal" / "expanded".',
      (context) => {
        const value = this.#enumString(arguments_, FONT_STRETCHES);
        if (value === null) return null;
        context.fontStretch = value as CanvasFontStretch;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gFontVariant(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set font variant. Expected a font-variant-caps keyword such as "normal" / "small-caps".',
      (context) => {
        const value = this.#enumString(arguments_, FONT_VARIANTS);
        if (value === null) return null;
        context.fontVariantCaps = value as CanvasFontVariantCaps;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gTextRendering(arguments_: Cons): LispValue {
    return this.#execute(
      'Can not set text rendering. Expected "auto" / "optimizeSpeed" / "optimizeLegibility" / "geometricPrecision".',
      (context) => {
        const value = this.#enumString(arguments_, TEXT_RENDERINGS);
        if (value === null) return null;
        context.textRendering = value as CanvasTextRendering;
        return InterpretedSymbol.of('t');
      },
    );
  }

  gClearRect(arguments_: Cons): LispValue {
    return this.#execute('Can not clear rectangle.', (context) => {
      const a = this.#numbers(arguments_, 4);
      if (a === null) return null;
      context.clearRect(a[0], a[1], a[2], a[3]);
      return InterpretedSymbol.of('t');
    });
  }

  gReset(): LispValue {
    return this.#execute('Can not reset.', (context) => {
      context.reset();
      return InterpretedSymbol.of('t');
    });
  }

  // gWidth / gHeight / gPixel return bigint so their integer results are
  // kei-lisp v3 integers (exact, `integerp` → t) rather than floats.
  gWidth(): LispValue {
    return this.#execute('Can not get width.', () => BigInt(this.canvas.width));
  }

  gHeight(): LispValue {
    return this.#execute('Can not get height.', () => BigInt(this.canvas.height));
  }

  gPixel(arguments_: Cons): LispValue {
    return this.#execute('Can not read pixel.', (context) => {
      const a = this.#numbers(arguments_, 2);
      if (a === null) return null;
      const data = context.getImageData(a[0], a[1], 1, 1).data;
      return this.#toList([BigInt(data[0]), BigInt(data[1]), BigInt(data[2]), BigInt(data[3])]);
    });
  }

  gSetPixel(arguments_: Cons): LispValue {
    return this.#execute('Can not write pixel.', (context) => {
      const a = this.#numbers(arguments_, 6);
      if (a === null) return null;
      const imageData = context.createImageData(1, 1);
      imageData.data[0] = a[2];
      imageData.data[1] = a[3];
      imageData.data[2] = a[4];
      imageData.data[3] = a[5];
      context.putImageData(imageData, a[0], a[1]);
      return InterpretedSymbol.of('t');
    });
  }

  gLinearGradient(arguments_: Cons): LispValue {
    return this.#execute('Can not set linear gradient.', (context) => {
      const [x0, y0, x1, y1, ...stops] = this.#listValues(arguments_);
      if (
        stops.length < 2 ||
        !Cons.isNumber(x0) ||
        !Cons.isNumber(y0) ||
        !Cons.isNumber(x1) ||
        !Cons.isNumber(y1)
      ) {
        return null;
      }
      return this.#installGradient(
        context,
        context.createLinearGradient(
          Numeric.toFloat(x0),
          Numeric.toFloat(y0),
          Numeric.toFloat(x1),
          Numeric.toFloat(y1),
        ),
        stops,
      );
    });
  }

  gRadialGradient(arguments_: Cons): LispValue {
    return this.#execute('Can not set radial gradient.', (context) => {
      const [x0, y0, r0, x1, y1, r1, ...stops] = this.#listValues(arguments_);
      if (
        stops.length < 2 ||
        !Cons.isNumber(x0) ||
        !Cons.isNumber(y0) ||
        !Cons.isNumber(r0) ||
        !Cons.isNumber(x1) ||
        !Cons.isNumber(y1) ||
        !Cons.isNumber(r1)
      ) {
        return null;
      }
      return this.#installGradient(
        context,
        context.createRadialGradient(
          Numeric.toFloat(x0),
          Numeric.toFloat(y0),
          Numeric.toFloat(r0),
          Numeric.toFloat(x1),
          Numeric.toFloat(y1),
          Numeric.toFloat(r1),
        ),
        stops,
      );
    });
  }

  gConicGradient(arguments_: Cons): LispValue {
    return this.#execute('Can not set conic gradient.', (context) => {
      const [angle, x, y, ...stops] = this.#listValues(arguments_);
      if (stops.length < 2 || !Cons.isNumber(angle) || !Cons.isNumber(x) || !Cons.isNumber(y)) {
        return null;
      }
      return this.#installGradient(
        context,
        context.createConicGradient(
          (Math.PI / 180) * Numeric.toFloat(angle),
          Numeric.toFloat(x),
          Numeric.toFloat(y),
        ),
        stops,
      );
    });
  }

  /**
   * Parses a color spec from the head of the argument Cons. Accepts
   * (1 string), (3 numbers — rgb), or (4 numbers — rgba); falls back to
   * `'black'` on anything else (legacy behavior — a best-effort color parse
   * that prints a diagnostic instead of signaling an error).
   * @param arguments_ - the argument Cons to parse
   * @return CSS color string
   */
  selectColor(arguments_: Cons): string {
    let aColor = 'black';
    const length_ = arguments_.length();
    const a0 = arguments_.car;
    if (length_ === 1 && Cons.isString(a0)) {
      aColor = a0;
    } else if (length_ === 3) {
      const cdr1 = arguments_.cdr as Cons;
      const a1 = cdr1.car;
      const cdr2 = cdr1.cdr as Cons;
      const a2 = cdr2.car;
      if (Cons.isNumber(a0) && Cons.isNumber(a1) && Cons.isNumber(a2)) {
        aColor = `rgb(${Numeric.toFloat(a0)}, ${Numeric.toFloat(a1)}, ${Numeric.toFloat(a2)})`;
      } else {
        this.#print('Can not set color. set color "black".');
      }
    } else if (length_ === 4) {
      const cdr1 = arguments_.cdr as Cons;
      const a1 = cdr1.car;
      const cdr2 = cdr1.cdr as Cons;
      const a2 = cdr2.car;
      const cdr3 = cdr2.cdr as Cons;
      const a3 = cdr3.car;
      if (Cons.isNumber(a0) && Cons.isNumber(a1) && Cons.isNumber(a2) && Cons.isNumber(a3)) {
        aColor = `rgba(${Numeric.toFloat(a0)}, ${Numeric.toFloat(a1)}, ${Numeric.toFloat(a2)}, ${Numeric.toFloat(a3)})`;
      } else {
        this.#print('Can not set color. set color "black".');
      }
    } else {
      this.#print('Can not set color. set color "black".');
    }
    return aColor;
  }
}
