import { Cons, EvalError, InterpretedSymbol } from 'kei-lisp';
import type { KeiLispPlugin, LispValue, PluginContext } from 'kei-lisp';

/**
 * Method signature used by every entry in `GraphicsPlugin.buildInFunctions`.
 * Each handler receives the (already-evaluated) argument Cons and the current
 * plugin context, and returns the Lisp result value.
 */
type Handler = (args: Cons, ctx: PluginContext) => LispValue;

/** Cached `t` symbol, returned by every drawing method on success. */
const T = InterpretedSymbol.of('t');

/** Diagnostic emitted when a `g…` function is called while the canvas is closed. */
const CANVAS_CLOSED = 'The canvas is closed and cannot be executed.';

/** Diagnostic templated for type-mismatch failures. */
const cannotApply = (fn: string, value: LispValue): string =>
  `Can not apply "${fn}" to "${String(value)}"`;

/**
 * @class
 * @classdesc Class for the Canvas2D drawing plugin. Registers built-in `g…`
 *            Lisp functions that proxy to a `CanvasRenderingContext2D`. Ported
 *            from the legacy `Graphist` class while preserving its observable
 *            behavior (including quirks marked `Legacy:` in the source).
 * @author Keisuke Ikeda
 * @this {GraphicsPlugin}
 */
export class GraphicsPlugin extends Object implements KeiLispPlugin {
  /**
   * Plugin identifier, used for diagnostics.
   */
  readonly name: string = 'graphics';
  /**
   * Dispatch map from a Lisp function name (InterpretedSymbol) to the name of
   * the GraphicsPlugin method that implements it.
   */
  static readonly buildInFunctions: Map<InterpretedSymbol, string> = GraphicsPlugin.setup();

  /**
   * The canvas surface bound at construction.
   */
  canvas: HTMLCanvasElement | OffscreenCanvas;
  /**
   * The 2D rendering context obtained from the canvas.
   */
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  /**
   * Whether `gopen` has been called (and `gclose` has not yet been called).
   */
  isOpen: boolean;

  /**
   * Constructor.
   * @constructor
   * @param canvas the canvas to draw to
   */
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    super();
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new EvalError(
        'Unable to initialize canvas. The browser or machine may not support it.',
      );
    }
    this.ctx = ctx;
    this.isOpen = false;
  }

  /**
   * Returns true if this plugin handles the given symbol.
   * @param aSymbol the call symbol to check
   * @return true if `apply` should be called for this symbol
   */
  has(aSymbol: InterpretedSymbol): boolean {
    return GraphicsPlugin.buildInFunctions.has(aSymbol);
  }

  /**
   * Dispatches the given symbol to its corresponding `g…` method.
   * @param aSymbol the call symbol
   * @param args the evaluated argument list (Cons.nil for nullary calls)
   * @param ctx the interpreter context (used for stream output by `gopen`)
   * @return the method's result
   */
  apply(aSymbol: InterpretedSymbol, args: Cons, ctx: PluginContext): LispValue {
    const methodName = GraphicsPlugin.buildInFunctions.get(aSymbol);
    if (methodName === undefined) {
      throw new EvalError(`I could find no procedure description for ${String(aSymbol)}`);
    }
    const method = (this as unknown as Record<string, Handler>)[methodName];
    return method.call(this, args, ctx);
  }

  /**
   * Implementation of the Lisp `gopen` function. Opens the canvas: paints it
   * white, marks the plugin as open, and emits a debug line to the interpreter
   * stream (preserved from the legacy Graphist).
   * @param _ ignored (nullary, accepted for dispatch compatibility)
   * @param ctx the plugin context, used to access the stream manager
   * @return the symbol `t`
   */
  gOpen(_: Cons, ctx: PluginContext): LispValue {
    if (this.isOpen) {
      throw new EvalError('The canvas has already been opened.');
    }
    this.isOpen = true;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#000000';
    this.ctx.save();
    // Legacy debug print preserved verbatim from the original Graphist.
    const stream = ctx.streamManager.getStream();
    if (stream !== null) {
      stream.write('canvas size, width : 600 height : 300\n');
    }
    return T;
  }

  /**
   * Implementation of the Lisp `gclose` function. Marks the plugin as closed
   * and clears the canvas.
   * @return the symbol `t`
   */
  gClose(): LispValue {
    if (!this.isOpen) {
      throw new EvalError('The canvas has already been closed.');
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isOpen = false;
    return T;
  }

  /**
   * Implementation of the Lisp `gclear` function. Paints the canvas white
   * (the legacy clear strategy, preserved verbatim).
   * @return the symbol `t`
   */
  gClear(): LispValue {
    this.requireOpen();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#000000';
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gsleep` function. Blocks for the given number
   * of milliseconds via a busy loop (preserved verbatim — Lisp evaluation is
   * synchronous, so non-blocking wait is not viable here).
   * @param args the argument Cons containing the wait duration in ms
   * @return the symbol `t`
   */
  gSleep(args: Cons): LispValue {
    this.requireOpen();
    const ms = this.requireNumberAt(args, 0, 'gsleep');
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      // busy wait
    }
    return T;
  }

  /**
   * Implementation of the Lisp `gimage` function. Loads an image from the
   * given URL asynchronously, then draws it at the requested position.
   * Supports 3-arg `(src x y)` and 5-arg `(src x y w h)` forms. Returns
   * immediately, before the image finishes loading (preserved verbatim).
   * @param args the argument Cons
   * @return the symbol `t`
   */
  gImage(args: Cons): LispValue {
    this.requireOpen();
    const n = args.length();
    if (n !== 3 && n !== 5) {
      throw new EvalError(`Can not apply "gimage" with ${String(n)} arguments`);
    }
    const src = this.requireStringAt(args, 0, 'gimage');
    const x = this.requireNumberAt(args, 1, 'gimage');
    const y = this.requireNumberAt(args, 2, 'gimage');
    const image = new Image();
    image.src = src;
    if (n === 3) {
      image.addEventListener('load', () => {
        this.ctx.drawImage(image, x, y);
      });
    } else {
      const w = this.requireNumberAt(args, 3, 'gimage');
      const h = this.requireNumberAt(args, 4, 'gimage');
      image.addEventListener('load', () => {
        this.ctx.drawImage(image, x, y, w, h);
      });
    }
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gsave-png` function. Exports the current
   * canvas as a PNG and triggers a download. Requires a browser DOM
   * (`document` and an attachable `<a download>` element); throws otherwise.
   * @return the symbol `t`
   */
  gSavePng(): LispValue {
    this.requireOpen();
    this.downloadCanvas('image/png');
    return T;
  }

  /**
   * Implementation of the Lisp `gsave-jpeg` function. Exports the current
   * canvas as a JPEG and triggers a download. Requires a browser DOM.
   * @return the symbol `t`
   */
  gSaveJpeg(): LispValue {
    this.requireOpen();
    this.downloadCanvas('image/jpeg');
    return T;
  }

  /**
   * Encodes the canvas as the given MIME type and triggers a browser
   * download via an `<a download>` link click. Throws if the runtime does
   * not expose `document` or the canvas does not expose `toDataURL`
   * (OffscreenCanvas in workers, Node, etc.).
   * @param mimeType the export MIME type (e.g. `"image/png"`)
   * @return void
   */
  downloadCanvas(mimeType: string): void {
    if (typeof document === 'undefined') {
      throw new EvalError('Can not save: document is not available in this environment.');
    }
    const surface = this.canvas as HTMLCanvasElement;
    if (typeof surface.toDataURL !== 'function') {
      throw new EvalError('Can not save: canvas does not support toDataURL.');
    }
    const link = document.createElement('a');
    link.href = surface.toDataURL(mimeType);
    link.download = 'canvas';
    document.body.append(link);
    link.click();
    link.remove();
  }

  /**
   * Implementation of the Lisp `gshadow-blur` function. Sets the shadow blur.
   *
   * Legacy: the original Graphist writes to `ctx.Blur` (capital B), not the
   * standard `ctx.shadowBlur`. The mis-spelled assignment has no rendering
   * effect. Preserved verbatim per the port-as-is policy.
   * @param args the argument Cons (blur in pixels)
   * @return the symbol `t`
   */
  gShadowBlur(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gshadow-blur');
    const blur = this.requireNumberAt(args, 0, 'gshadow-blur');
    (this.ctx as unknown as Record<string, number>)['Blur'] = blur;
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gshadow-color` function. Sets shadowColor.
   * @param args the argument Cons (color spec — see parseColor)
   * @return the symbol `t`
   */
  gShadowColor(args: Cons): LispValue {
    this.requireOpen();
    this.ctx.shadowColor = this.parseColor(args);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gshadow-offsetx` function.
   * @param args the argument Cons (offset in pixels)
   * @return the symbol `t`
   */
  gShadowOffsetX(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gshadow-offsetx');
    this.ctx.shadowOffsetX = this.requireNumberAt(args, 0, 'gshadow-offsetx');
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gshadow-offsety` function.
   * @param args the argument Cons (offset in pixels)
   * @return the symbol `t`
   */
  gShadowOffsetY(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gshadow-offsety');
    this.ctx.shadowOffsetY = this.requireNumberAt(args, 0, 'gshadow-offsety');
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gtext-font` function. Sets the canvas font.
   * @param args the argument Cons (CSS font string)
   * @return the symbol `t`
   */
  gTextFont(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gtext-font');
    this.ctx.font = this.requireStringAt(args, 0, 'gtext-font');
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gtext-align` function. Sets textAlign.
   * @param args the argument Cons (alignment string, e.g. `"left"`, `"center"`)
   * @return the symbol `t`
   */
  gTextAlign(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gtext-align');
    this.ctx.textAlign = this.requireStringAt(args, 0, 'gtext-align') as CanvasTextAlign;
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gtext-line` function. Sets textBaseline.
   * @param args the argument Cons (baseline string, e.g. `"top"`, `"middle"`)
   * @return the symbol `t`
   */
  gTextBaseline(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gtext-line');
    this.ctx.textBaseline = this.requireStringAt(args, 0, 'gtext-line') as CanvasTextBaseline;
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gtext-dire` function. Sets the text direction
   * via a numeric flag (0 → inherit, positive → rtl, negative → ltr).
   * @param args the argument Cons (direction flag)
   * @return the symbol `t`
   */
  gTextDirection(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gtext-dire');
    const flag = this.requireNumberAt(args, 0, 'gtext-dire');
    this.ctx.direction = this.textDirectionOf(flag);
    this.ctx.save();
    return T;
  }

  /**
   * Maps a numeric flag to the corresponding `direction` string.
   * @param flag a number selecting the direction mode
   * @return one of `"inherit"`, `"rtl"`, `"ltr"`
   */
  textDirectionOf(flag: number): CanvasDirection {
    if (flag === 0) {
      return 'inherit';
    }
    if (flag > 0) {
      return 'rtl';
    }
    return 'ltr';
  }

  /**
   * Implementation of the Lisp `gtranslate` function. Translates the origin.
   * @param args the argument Cons (dx, dy)
   * @return the symbol `t`
   */
  gTranslate(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 2, 'gtranslate');
    const dx = this.requireNumberAt(args, 0, 'gtranslate');
    const dy = this.requireNumberAt(args, 1, 'gtranslate');
    this.ctx.translate(dx, dy);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gscale` function. Scales the coordinate system.
   * @param args the argument Cons (sx, sy)
   * @return the symbol `t`
   */
  gScale(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 2, 'gscale');
    const sx = this.requireNumberAt(args, 0, 'gscale');
    const sy = this.requireNumberAt(args, 1, 'gscale');
    this.ctx.scale(sx, sy);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `grotate` function. Rotates the coordinate
   * system by the given angle in degrees (converted to radians internally).
   * @param args the argument Cons (angle in degrees)
   * @return the symbol `t`
   */
  gRotate(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'grotate');
    const deg = this.requireNumberAt(args, 0, 'grotate');
    this.ctx.rotate((Math.PI / 180) * deg);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `galpha` function. Sets the global alpha
   * (clamped to the range [0, 1]).
   * @param args the argument Cons (alpha)
   * @return the symbol `t`
   */
  gAlpha(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'galpha');
    const a = this.requireNumberAt(args, 0, 'galpha');
    this.ctx.globalAlpha = Math.max(0, Math.min(1, a));
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gcolor` function. Sets both fillStyle and
   * strokeStyle to the same color.
   * @param args the argument Cons (color spec — see parseColor)
   * @return the symbol `t`
   */
  gColor(args: Cons): LispValue {
    this.requireOpen();
    const color = this.parseColor(args);
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gfill-color` function. Sets fillStyle.
   * @param args the argument Cons (color spec)
   * @return the symbol `t`
   */
  gFillColor(args: Cons): LispValue {
    this.requireOpen();
    this.ctx.fillStyle = this.parseColor(args);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gstroke-color` function. Sets strokeStyle.
   * @param args the argument Cons (color spec)
   * @return the symbol `t`
   */
  gStrokeColor(args: Cons): LispValue {
    this.requireOpen();
    this.ctx.strokeStyle = this.parseColor(args);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gline-cap` function. Maps a numeric arg to
   * one of `butt` (0), `round` (positive), or `square` (negative).
   * @param args the argument Cons (mode flag)
   * @return the symbol `t`
   */
  gLineCap(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gline-cap');
    const flag = this.requireNumberAt(args, 0, 'gline-cap');
    this.ctx.lineCap = this.lineCapOf(flag);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gline-join` function. Maps a numeric arg to
   * one of `miter` (0), `round` (positive), or `bevel` (negative).
   * @param args the argument Cons (mode flag)
   * @return the symbol `t`
   */
  gLineJoin(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gline-join');
    const flag = this.requireNumberAt(args, 0, 'gline-join');
    this.ctx.lineJoin = this.lineJoinOf(flag);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gline-width` function. Sets the line width
   * (values ≤ 0 are coerced to 1, preserving legacy clamping).
   * @param args the argument Cons (width)
   * @return the symbol `t`
   */
  gLineWidth(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 1, 'gline-width');
    const w = this.requireNumberAt(args, 0, 'gline-width');
    this.ctx.lineWidth = w <= 0 ? 1 : w;
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gpattern` function. Loads an image from the
   * given URL asynchronously; once loaded, installs it as fillStyle in the
   * requested repeat mode (0 → repeat, positive → repeat-x, negative →
   * repeat-y). Returns immediately, before the image finishes loading
   * (preserved verbatim from legacy Graphist).
   * @param args the argument Cons (imageSrc, modeFlag)
   * @return the symbol `t`
   */
  gPattern(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 2, 'gpattern');
    const src = this.requireStringAt(args, 0, 'gpattern');
    const flag = this.requireNumberAt(args, 1, 'gpattern');
    const mode = this.patternModeOf(flag);
    const image = new Image();
    image.src = src;
    image.addEventListener('load', () => {
      const pattern = this.ctx.createPattern(image, mode);
      if (pattern !== null) {
        this.ctx.fillStyle = pattern;
      }
    });
    this.ctx.save();
    return T;
  }

  /**
   * Maps a numeric flag to the corresponding `lineCap` string.
   * @param flag a number selecting the cap style
   * @return one of `"butt"`, `"round"`, `"square"`
   */
  lineCapOf(flag: number): CanvasLineCap {
    if (flag === 0) {
      return 'butt';
    }
    if (flag > 0) {
      return 'round';
    }
    return 'square';
  }

  /**
   * Maps a numeric flag to the corresponding `lineJoin` string.
   * @param flag a number selecting the join style
   * @return one of `"miter"`, `"round"`, `"bevel"`
   */
  lineJoinOf(flag: number): CanvasLineJoin {
    if (flag === 0) {
      return 'miter';
    }
    if (flag > 0) {
      return 'round';
    }
    return 'bevel';
  }

  /**
   * Maps a numeric flag to the corresponding pattern repeat mode string.
   * @param flag a number selecting the repeat mode
   * @return one of `"repeat"`, `"repeat-x"`, `"repeat-y"`
   */
  patternModeOf(flag: number): 'repeat' | 'repeat-x' | 'repeat-y' {
    if (flag === 0) {
      return 'repeat';
    }
    if (flag > 0) {
      return 'repeat-x';
    }
    return 'repeat-y';
  }

  /**
   * Parses a color spec from the head of the argument Cons. Accepts one of
   * three forms (matching legacy Graphist):
   *   - 1 string: used verbatim (e.g. `"red"`, `"#fff"`)
   *   - 3 numbers: formatted as `rgb(r, g, b)`
   *   - 4 numbers: formatted as `rgba(r, g, b, a)`
   * Any other shape yields the fallback color `"black"`.
   * @param args the argument Cons
   * @return the CSS color string
   */
  parseColor(args: Cons): string {
    const n = args.length();
    if (n === 1 && Cons.isString(args.car)) {
      return args.car;
    }
    if (n === 3) {
      const r = this.requireNumberAt(args, 0, 'gcolor');
      const g = this.requireNumberAt(args, 1, 'gcolor');
      const b = this.requireNumberAt(args, 2, 'gcolor');
      return `rgb(${String(r)}, ${String(g)}, ${String(b)})`;
    }
    if (n === 4) {
      const r = this.requireNumberAt(args, 0, 'gcolor');
      const g = this.requireNumberAt(args, 1, 'gcolor');
      const b = this.requireNumberAt(args, 2, 'gcolor');
      const a = this.requireNumberAt(args, 3, 'gcolor');
      return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(a)})`;
    }
    return 'black';
  }

  /**
   * Implementation of the Lisp `gfill` function. Fills the current path.
   * @return the symbol `t`
   */
  gFill(): LispValue {
    this.requireOpen();
    this.ctx.fill();
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gstroke` function. Strokes the current path.
   * @return the symbol `t`
   */
  gStroke(): LispValue {
    this.requireOpen();
    this.ctx.stroke();
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gfill-rect` function. Fills a rectangle.
   * @param args the argument Cons (x, y, width, height)
   * @return the symbol `t`
   */
  gFillRect(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 4, 'gfill-rect');
    const x = this.requireNumberAt(args, 0, 'gfill-rect');
    const y = this.requireNumberAt(args, 1, 'gfill-rect');
    const w = this.requireNumberAt(args, 2, 'gfill-rect');
    const h = this.requireNumberAt(args, 3, 'gfill-rect');
    this.ctx.fillRect(x, y, w, h);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gstroke-rect` function. Strokes a rectangle.
   * @param args the argument Cons (x, y, width, height)
   * @return the symbol `t`
   */
  gStrokeRect(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 4, 'gstroke-rect');
    const x = this.requireNumberAt(args, 0, 'gstroke-rect');
    const y = this.requireNumberAt(args, 1, 'gstroke-rect');
    const w = this.requireNumberAt(args, 2, 'gstroke-rect');
    const h = this.requireNumberAt(args, 3, 'gstroke-rect');
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gfill-text` function. Fills text at (x, y).
   * @param args the argument Cons (text, x, y)
   * @return the symbol `t`
   */
  gFillText(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 3, 'gfill-text');
    const text = this.requireStringAt(args, 0, 'gfill-text');
    const x = this.requireNumberAt(args, 1, 'gfill-text');
    const y = this.requireNumberAt(args, 2, 'gfill-text');
    this.ctx.fillText(text, x, y);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gstroke-text` function. Strokes text at (x, y).
   * @param args the argument Cons (text, x, y)
   * @return the symbol `t`
   */
  gStrokeText(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 3, 'gstroke-text');
    const text = this.requireStringAt(args, 0, 'gstroke-text');
    const x = this.requireNumberAt(args, 1, 'gstroke-text');
    const y = this.requireNumberAt(args, 2, 'gstroke-text');
    this.ctx.strokeText(text, x, y);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gfill-tri` function. Fills a triangle
   * described by three vertex pairs.
   * @param args the argument Cons (x1, y1, x2, y2, x3, y3)
   * @return the symbol `t`
   */
  gFillTri(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 6, 'gfill-tri');
    const x1 = this.requireNumberAt(args, 0, 'gfill-tri');
    const y1 = this.requireNumberAt(args, 1, 'gfill-tri');
    const x2 = this.requireNumberAt(args, 2, 'gfill-tri');
    const y2 = this.requireNumberAt(args, 3, 'gfill-tri');
    const x3 = this.requireNumberAt(args, 4, 'gfill-tri');
    const y3 = this.requireNumberAt(args, 5, 'gfill-tri');
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.fill();
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gstroke-tri` function. Strokes the outline of
   * a triangle described by three vertex pairs.
   * @param args the argument Cons (x1, y1, x2, y2, x3, y3)
   * @return the symbol `t`
   */
  gStrokeTri(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 6, 'gstroke-tri');
    const x1 = this.requireNumberAt(args, 0, 'gstroke-tri');
    const y1 = this.requireNumberAt(args, 1, 'gstroke-tri');
    const x2 = this.requireNumberAt(args, 2, 'gstroke-tri');
    const y2 = this.requireNumberAt(args, 3, 'gstroke-tri');
    const x3 = this.requireNumberAt(args, 4, 'gstroke-tri');
    const y3 = this.requireNumberAt(args, 5, 'gstroke-tri');
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gstart-path` function. Begins a new path.
   * @return the symbol `t`
   */
  gStartPath(): LispValue {
    this.requireOpen();
    this.ctx.beginPath();
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gfinish-path` function. Closes the current path.
   * @return the symbol `t`
   */
  gFinishPath(): LispValue {
    this.requireOpen();
    this.ctx.closePath();
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gmove-to` function. Moves the path cursor.
   * @param args the argument Cons (x, y)
   * @return the symbol `t`
   */
  gMoveTo(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 2, 'gmove-to');
    const x = this.requireNumberAt(args, 0, 'gmove-to');
    const y = this.requireNumberAt(args, 1, 'gmove-to');
    this.ctx.moveTo(x, y);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gline-to` function. Draws a straight line from
   * the current path cursor to the given point.
   * @param args the argument Cons (x, y)
   * @return the symbol `t`
   */
  gLineTo(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 2, 'gline-to');
    const x = this.requireNumberAt(args, 0, 'gline-to');
    const y = this.requireNumberAt(args, 1, 'gline-to');
    this.ctx.lineTo(x, y);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gquadcurve-to` function. Adds a quadratic
   * Bezier curve to the path.
   * @param args the argument Cons (cpx, cpy, x, y)
   * @return the symbol `t`
   */
  gQuadCurveTo(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 4, 'gquadcurve-to');
    const cpx = this.requireNumberAt(args, 0, 'gquadcurve-to');
    const cpy = this.requireNumberAt(args, 1, 'gquadcurve-to');
    const x = this.requireNumberAt(args, 2, 'gquadcurve-to');
    const y = this.requireNumberAt(args, 3, 'gquadcurve-to');
    this.ctx.quadraticCurveTo(cpx, cpy, x, y);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `gbezcurve-to` function. Adds a cubic Bezier
   * curve to the path.
   * @param args the argument Cons (cp1x, cp1y, cp2x, cp2y, x, y)
   * @return the symbol `t`
   */
  gBezCurveTo(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 6, 'gbezcurve-to');
    const cp1x = this.requireNumberAt(args, 0, 'gbezcurve-to');
    const cp1y = this.requireNumberAt(args, 1, 'gbezcurve-to');
    const cp2x = this.requireNumberAt(args, 2, 'gbezcurve-to');
    const cp2y = this.requireNumberAt(args, 3, 'gbezcurve-to');
    const x = this.requireNumberAt(args, 4, 'gbezcurve-to');
    const y = this.requireNumberAt(args, 5, 'gbezcurve-to');
    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `garc` function. Draws an arc.
   * Angle arguments are degrees (converted to radians internally).
   * The 6th argument selects direction: a non-negative value selects
   * counter-clockwise (matching the legacy Graphist convention).
   * @param args the argument Cons (x, y, radius, startDeg, endDeg, ccwFlag)
   * @return the symbol `t`
   */
  gArc(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 6, 'garc');
    const x = this.requireNumberAt(args, 0, 'garc');
    const y = this.requireNumberAt(args, 1, 'garc');
    const r = this.requireNumberAt(args, 2, 'garc');
    const startDeg = this.requireNumberAt(args, 3, 'garc');
    const endDeg = this.requireNumberAt(args, 4, 'garc');
    const ccwFlag = this.requireNumberAt(args, 5, 'garc');
    this.ctx.arc(x, y, r, (Math.PI / 180) * startDeg, (Math.PI / 180) * endDeg, ccwFlag >= 0);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `garc-to` function. Draws an arc connecting
   * two tangent points.
   * @param args the argument Cons (x1, y1, x2, y2, radius)
   * @return the symbol `t`
   */
  gArcTo(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 5, 'garc-to');
    const x1 = this.requireNumberAt(args, 0, 'garc-to');
    const y1 = this.requireNumberAt(args, 1, 'garc-to');
    const x2 = this.requireNumberAt(args, 2, 'garc-to');
    const y2 = this.requireNumberAt(args, 3, 'garc-to');
    const r = this.requireNumberAt(args, 4, 'garc-to');
    this.ctx.arcTo(x1, y1, x2, y2, r);
    this.ctx.save();
    return T;
  }

  /**
   * Implementation of the Lisp `grect` function. Adds a rectangle subpath.
   * @param args the argument Cons (x, y, width, height)
   * @return the symbol `t`
   */
  gRect(args: Cons): LispValue {
    this.requireOpen();
    this.requireArity(args, 4, 'grect');
    const x = this.requireNumberAt(args, 0, 'grect');
    const y = this.requireNumberAt(args, 1, 'grect');
    const w = this.requireNumberAt(args, 2, 'grect');
    const h = this.requireNumberAt(args, 3, 'grect');
    this.ctx.rect(x, y, w, h);
    this.ctx.save();
    return T;
  }

  /**
   * Throws if the canvas is not currently open. Most drawing methods call
   * this first to enforce `gopen`/`gclose` lifecycle.
   * @return void
   */
  requireOpen(): void {
    if (!this.isOpen) {
      throw new EvalError(CANVAS_CLOSED);
    }
  }

  /**
   * Returns the nth element (0-based) of the given argument Cons.
   * @param args the argument Cons
   * @param index the 0-based position
   * @return the value at that position, or `Cons.nil` past the end
   */
  nthArg(args: Cons, index: number): LispValue {
    let aCons: LispValue = args;
    let i = index;
    while (i > 0 && Cons.isCons(aCons)) {
      aCons = aCons.cdr;
      i--;
    }
    if (Cons.isCons(aCons)) {
      return aCons.car;
    }
    return Cons.nil;
  }

  /**
   * Returns the requested positional Number argument, or throws.
   * @param args the argument Cons
   * @param index the 0-based position
   * @param fn the Lisp function name (for the error message)
   * @return the number at the given position
   */
  requireNumberAt(args: Cons, index: number, fn: string): number {
    const each = this.nthArg(args, index);
    if (Cons.isNumber(each)) {
      return each;
    }
    throw new EvalError(cannotApply(fn, each));
  }

  /**
   * Returns the requested positional String argument, or throws.
   * @param args the argument Cons
   * @param index the 0-based position
   * @param fn the Lisp function name (for the error message)
   * @return the string at the given position
   */
  requireStringAt(args: Cons, index: number, fn: string): string {
    const each = this.nthArg(args, index);
    if (Cons.isString(each)) {
      return each;
    }
    throw new EvalError(cannotApply(fn, each));
  }

  /**
   * Validates that the argument Cons has exactly the given length, or throws.
   * @param args the argument Cons
   * @param expected the required argument count
   * @param fn the Lisp function name (for the error message)
   * @return void
   */
  requireArity(args: Cons, expected: number, fn: string): void {
    if (args.length() !== expected) {
      throw new EvalError(`Can not apply "${fn}" with ${String(args.length())} arguments`);
    }
  }

  /**
   * Builds the dispatch table from Lisp symbol → method name on this class.
   * @return the dispatch table
   */
  static setup(): Map<InterpretedSymbol, string> {
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
    aTable.set(InterpretedSymbol.of('gtext-dire'), 'gTextDirection');
    aTable.set(InterpretedSymbol.of('gtext-font'), 'gTextFont');
    aTable.set(InterpretedSymbol.of('gtext-line'), 'gTextBaseline');
    aTable.set(InterpretedSymbol.of('gtranslate'), 'gTranslate');
    aTable.set(InterpretedSymbol.of('grect'), 'gRect');
    aTable.set(InterpretedSymbol.of('grotate'), 'gRotate');
    return aTable;
  }
}
