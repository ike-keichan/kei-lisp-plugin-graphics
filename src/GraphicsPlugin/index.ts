/* eslint-disable unicorn/prefer-add-event-listener,
                  unicorn/prefer-math-min-max,
                  sonarjs/no-nested-conditional,
                  sonarjs/no-duplicate-string */

// These lint rules are disabled file-wide so the ported handlers can preserve
// the legacy Graphist patterns (Image#onload, clamp ternaries, mode-flag
// ternaries, repeated diagnostic strings) without per-line escape hatches.

import type { KeiLispPlugin, LispValue, PluginContext } from 'kei-lisp';
import { Cons, InterpretedSymbol } from 'kei-lisp';

/**
 * @class
 * @classdesc Canvas2D drawing plugin for the kei-lisp interpreter. Implements
 *            the `KeiLispPlugin` contract (`name` / `has` / `apply`) and
 *            exposes 45 `g…` Lisp functions that proxy to a 2D rendering
 *            context.
 * @author Keisuke Ikeda
 * @this {GraphicsPlugin}
 */
export class GraphicsPlugin extends Object implements KeiLispPlugin {
  /**
   * Dispatch map from a Lisp function name (InterpretedSymbol) to the name of
   * the GraphicsPlugin method that implements it.
   */
  static readonly buildInFunctions: Map<InterpretedSymbol, string> = GraphicsPlugin.setup();

  /**
   * Builds the dispatch table.
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
    aTable.set(InterpretedSymbol.of('gsave'), 'gSave');
    aTable.set(InterpretedSymbol.of('grestore'), 'gRestore');
    return aTable;
  }

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
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isOpen = false;
  }

  /**
   * Writes a diagnostic line directly to `process.stderr`, matching the
   * convention used by kei-lisp itself (`Applier.format` writes to
   * `process.stdout`). In a Node runtime this hits the real stderr; in a
   * browser kei-lisp host (e.g. kei-lisp-web) the host typically swaps
   * `process.stderr.write` for a sink that routes to the REPL output panel,
   * so the same call reaches the user via the host's normal output channel.
   * @param line - the line to write
   */
  #print(line: string): void {
    process.stderr.write(line + '\n');
  }

  /**
   * Encodes the canvas via `toDataURL` and triggers a browser download through
   * a temporary `<a download>` element. Requires a DOM (`document`) and an
   * `HTMLCanvasElement`; `OffscreenCanvas` has no `toDataURL`, and Node.js has
   * no `document` — those callers must pass a file path instead.
   * @param mimeType - the image MIME type to encode
   * @param label - the format name used in diagnostics ("jpeg" / "png")
   * @return `t` on success, `Cons.nil` otherwise
   */
  #downloadCanvas(mimeType: string, label: string): LispValue {
    if (typeof document === 'undefined' || !('toDataURL' in this.canvas)) {
      this.#print(
        `Can not save ${label}. Browser download needs a DOM and an HTMLCanvasElement; pass a file path to save on Node.js.`,
      );
      return Cons.nil;
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
      this.#print(
        `Can not save ${label}. If you are using an image in the canvas, you can't save ${label}.`,
      );
      return Cons.nil;
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
   * @return `t` on success, `Cons.nil` otherwise
   */
  #writeCanvasToFile(path: string, mimeType: string, label: string): LispValue {
    const fs =
      typeof process.getBuiltinModule === 'function'
        ? process.getBuiltinModule('node:fs')
        : undefined;
    if (fs === undefined) {
      this.#print(`Can not save ${label}. Saving to a file path requires Node.js.`);
      return Cons.nil;
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
      this.#print(`Can not save ${label}.`);
      return Cons.nil;
    }
  }

  /**
   * Returns true if this plugin handles the given symbol.
   * @param aSymbol - the call symbol
   * @return true if `apply` should be called
   */
  has(aSymbol: InterpretedSymbol): boolean {
    return GraphicsPlugin.buildInFunctions.has(aSymbol);
  }

  /**
   * Dispatches the given symbol to the matching `g…` method.
   * @param aSymbol - the call symbol
   * @param arguments_ - the evaluated argument list
   * @param _context - the interpreter context (unused by this plugin)
   * @return the method's result, or `Cons.nil` if dispatch fails
   */
  apply(aSymbol: InterpretedSymbol, arguments_: Cons, _context: PluginContext): LispValue {
    return this.selectProcedure(aSymbol, arguments_);
  }

  /**
   * Resolves the procedure name and invokes the matching method.
   * @param procedure - the Lisp symbol
   * @param arguments_ - the evaluated argument list
   * @return the method's result, or `Cons.nil` if not registered
   */
  selectProcedure(procedure: InterpretedSymbol, arguments_: Cons): LispValue {
    if (GraphicsPlugin.buildInFunctions.has(procedure)) {
      return this.buildInFunction(procedure, arguments_);
    }
    this.#print(`I could find no procedure description for ${String(procedure)}`);
    return Cons.nil;
  }

  /**
   * Looks up and invokes the JS method that implements the given Lisp symbol.
   * Throws `TypeError` when the dispatch table points to a method that does
   * not exist on the instance — this matches the legacy behavior, where the
   * Ramda `R.invoker(1, methodName)(args, this)` call would surface the same
   * error by attempting to call `undefined`.
   * @param procedure - the Lisp symbol
   * @param arguments_ - the evaluated argument list
   * @return the method's result
   */
  buildInFunction(procedure: InterpretedSymbol, arguments_: Cons): LispValue {
    const methodName = GraphicsPlugin.buildInFunctions.get(procedure) as string;
    const target = this as unknown as Record<string, unknown>;
    const method = target[methodName];
    if (typeof method !== 'function') {
      throw new TypeError(`${this.constructor.name} does not have a method named "${methodName}"`);
    }
    return (method as (arguments__: Cons) => LispValue).call(this, arguments_);
  }

  /**
   * Checks whether the canvas exposes a usable 2D context, and narrows
   * `this.ctx` to non-null for the caller when it returns true.
   * @return type predicate — true when ctx is non-null
   */
  checkSupport(): this is GraphicsPlugin & {
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  } {
    if (this.ctx === null) {
      this.#print('Unable to initialize canvas. The browser or machine may not support it.');
      return false;
    }
    return true;
  }

  gAlpha(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isNumber(arguments_.car)) {
          const aNumber = arguments_.car <= 0 ? 0 : arguments_.car >= 1 ? 1 : arguments_.car;
          this.ctx.globalAlpha = aNumber;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set alpha.');
        return Cons.nil;
      } catch {
        this.#print('Can not set alpha.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gArc(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 6) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          const cdr4 = cdr3.cdr as Cons;
          const a4 = cdr4.car;
          const cdr5 = cdr4.cdr as Cons;
          const a5 = cdr5.car;
          if (
            Cons.isNumber(a0) &&
            Cons.isNumber(a1) &&
            Cons.isNumber(a2) &&
            Cons.isNumber(a3) &&
            Cons.isNumber(a4) &&
            Cons.isNumber(a5)
          ) {
            const isAFlag = a5 >= 0;
            this.ctx.arc(a0, a1, a2, (Math.PI / 180) * a3, (Math.PI / 180) * a4, isAFlag);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw arc.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw arc.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gArcTo(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 5) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          const cdr4 = cdr3.cdr as Cons;
          const a4 = cdr4.car;
          if (
            Cons.isNumber(a0) &&
            Cons.isNumber(a1) &&
            Cons.isNumber(a2) &&
            Cons.isNumber(a3) &&
            Cons.isNumber(a4)
          ) {
            this.ctx.arcTo(a0, a1, a2, a3, a4);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw arc to.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw arc to.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gBezCurveTo(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 6) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          const cdr4 = cdr3.cdr as Cons;
          const a4 = cdr4.car;
          const cdr5 = cdr4.cdr as Cons;
          const a5 = cdr5.car;
          if (
            Cons.isNumber(a0) &&
            Cons.isNumber(a1) &&
            Cons.isNumber(a2) &&
            Cons.isNumber(a3) &&
            Cons.isNumber(a4) &&
            Cons.isNumber(a5)
          ) {
            this.ctx.bezierCurveTo(a0, a1, a2, a3, a4, a5);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw bezier curve.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw bezier curve.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gClear(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not clear.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gClose(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isOpen = false;
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not close.');
        return Cons.nil;
      }
    }
    this.#print('The canvas has already been closed.');
    return Cons.nil;
  }

  gColor(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() >= 1) {
          const aColor = this.selectColor(arguments_);
          this.ctx.fillStyle = aColor;
          this.ctx.strokeStyle = aColor;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set color.');
        return Cons.nil;
      } catch {
        this.#print('Can not set color.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gFill(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.fill();
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not fill.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gFillColor(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() >= 1) {
          const aColor = this.selectColor(arguments_);
          this.ctx.fillStyle = aColor;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set fill color.');
        return Cons.nil;
      } catch {
        this.#print('Can not set fill color.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gFillRect(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 4) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1) && Cons.isNumber(a2) && Cons.isNumber(a3)) {
            this.ctx.fillRect(a0, a1, a2, a3);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw fill rectangle.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw fill rectangle.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gFillText(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 3) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          if (Cons.isString(a0) && Cons.isNumber(a1) && Cons.isNumber(a2)) {
            this.ctx.fillText(a0, a1, a2);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw fill text.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw fill text.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gFillTri(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 6) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          const cdr4 = cdr3.cdr as Cons;
          const a4 = cdr4.car;
          const cdr5 = cdr4.cdr as Cons;
          const a5 = cdr5.car;
          if (
            Cons.isNumber(a0) &&
            Cons.isNumber(a1) &&
            Cons.isNumber(a2) &&
            Cons.isNumber(a3) &&
            Cons.isNumber(a4) &&
            Cons.isNumber(a5)
          ) {
            this.ctx.beginPath();
            this.ctx.moveTo(a0, a1);
            this.ctx.lineTo(a2, a3);
            this.ctx.lineTo(a4, a5);
            this.ctx.fill();
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw fill triangle.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw fill triangle.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gFinishPath(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.closePath();
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not finish path.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gImage(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        const length_ = arguments_.length();
        if (length_ === 3) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          if (Cons.isString(a0) && Cons.isNumber(a1) && Cons.isNumber(a2)) {
            const context = this.ctx;
            const anImage = new Image();
            anImage.src = a0;
            anImage.onload = () => {
              context.drawImage(anImage, a1, a2);
            };
            return InterpretedSymbol.of('t');
          }
        } else if (length_ === 5) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          const cdr4 = cdr3.cdr as Cons;
          const a4 = cdr4.car;
          if (
            Cons.isString(a0) &&
            Cons.isNumber(a1) &&
            Cons.isNumber(a2) &&
            Cons.isNumber(a3) &&
            Cons.isNumber(a4)
          ) {
            const context = this.ctx;
            const anImage = new Image();
            anImage.src = a0;
            anImage.onload = () => {
              context.drawImage(anImage, a1, a2, a3, a4);
            };
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw Image.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw Image.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gLineTo(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 2) {
          const a0 = arguments_.car;
          const a1 = (arguments_.cdr as Cons).car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1)) {
            this.ctx.lineTo(a0, a1);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw line to');
        return Cons.nil;
      } catch {
        this.#print('Can not draw line to');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gLineCap(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isString(arguments_.car)) {
          this.ctx.lineCap = arguments_.car as CanvasLineCap;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set line cap.');
        return Cons.nil;
      } catch {
        this.#print('Can not set line cap.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gLineJoin(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isString(arguments_.car)) {
          this.ctx.lineJoin = arguments_.car as CanvasLineJoin;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set line join.');
        return Cons.nil;
      } catch {
        this.#print('Can not set line join.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gLineWidth(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isNumber(arguments_.car)) {
          const aNumber = arguments_.car <= 0 ? 1 : arguments_.car;
          this.ctx.lineWidth = aNumber;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set line width.');
        return Cons.nil;
      } catch {
        this.#print('Can not set line width.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gMoveTo(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 2) {
          const a0 = arguments_.car;
          const a1 = (arguments_.cdr as Cons).car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1)) {
            this.ctx.moveTo(a0, a1);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not move');
        return Cons.nil;
      } catch {
        this.#print('Can not move');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gOpen(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (!this.isOpen) {
      try {
        this.isOpen = true;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.#print(`canvas size, width : ${this.canvas.width} height : ${this.canvas.height}`);
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not open.');
        return Cons.nil;
      }
    }
    this.#print('The canvas has already been opened.');
    return Cons.nil;
  }

  gPattern(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 2) {
          const a0 = arguments_.car;
          const a1 = (arguments_.cdr as Cons).car;
          if (Cons.isString(a0) && Cons.isNumber(a1)) {
            const aString = a1 === 0 ? 'repeat' : a1 > 0 ? 'repeat-x' : 'repeat-y';
            const context = this.ctx;
            const anImage = new Image();
            anImage.src = a0;
            anImage.onload = () => {
              // Legacy bug: createPattern() may return null; assigning null to fillStyle
              // is a no-op in practice (browsers ignore or coerce it).
              context.fillStyle = context.createPattern(anImage, aString) as CanvasPattern;
            };
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not set pattern.');
        return Cons.nil;
      } catch {
        this.#print('Can not set pattern.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gQuadCurveTo(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 4) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1) && Cons.isNumber(a2) && Cons.isNumber(a3)) {
            this.ctx.quadraticCurveTo(a0, a1, a2, a3);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw quadratic curve.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw quadratic curve.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
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
   * @return `t` on success, `Cons.nil` otherwise
   */
  saveCanvas(arguments_: Cons, mimeType: string, label: string): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      const length_ = arguments_.length();
      if (length_ === 0) {
        return this.#downloadCanvas(mimeType, label);
      }
      if (length_ === 1 && Cons.isString(arguments_.car)) {
        return this.#writeCanvasToFile(arguments_.car, mimeType, label);
      }
      this.#print(`Can not save ${label}.`);
      return Cons.nil;
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gScale(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 2) {
          const a0 = arguments_.car;
          const a1 = (arguments_.cdr as Cons).car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1)) {
            this.ctx.scale(a0, a1);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not scale.');
        return Cons.nil;
      } catch {
        this.#print('Can not scale.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gShadowBlur(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      if (arguments_.length() === 1 && Cons.isNumber(arguments_.car)) {
        this.ctx.shadowBlur = arguments_.car;
        return InterpretedSymbol.of('t');
      }
      this.#print('Can not set shadow blur.');
      return Cons.nil;
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gShadowColor(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1) {
          const aColor = this.selectColor(arguments_);
          this.ctx.shadowColor = aColor;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set shadow color.');
        return Cons.nil;
      } catch {
        this.#print('Can not set shadow color.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  // NOTE: gShadowOffsetX, gShadowOffsetY, and gShadowBlur intentionally omit try/catch.
  // The original Graphist.js had the same structure for all three shadow-property setters.
  gShadowOffsetX(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      if (arguments_.length() === 1 && Cons.isNumber(arguments_.car)) {
        this.ctx.shadowOffsetX = arguments_.car;
        return InterpretedSymbol.of('t');
      }
      this.#print('Can not set shadow offsetX.');
      return Cons.nil;
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gShadowOffsetY(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      if (arguments_.length() === 1 && Cons.isNumber(arguments_.car)) {
        this.ctx.shadowOffsetY = arguments_.car;
        return InterpretedSymbol.of('t');
      }
      this.#print('Can not set shadow offsetY.');
      return Cons.nil;
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gSleep(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      const sleep = (ms: number): void => {
        const time = Date.now() + ms;
        while (Date.now() < time) {
          // busy wait
        }
      };
      if (arguments_.length() === 1 && Cons.isNumber(arguments_.car)) {
        sleep(arguments_.car);
        return InterpretedSymbol.of('t');
      }
      this.#print('Can not sleep');
      return Cons.nil;
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gStartPath(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.beginPath();
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not start path.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gStroke(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.stroke();
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not stroke.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gStrokeColor(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() >= 1) {
          const aColor = this.selectColor(arguments_);
          this.ctx.strokeStyle = aColor;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set stroke color');
        return Cons.nil;
      } catch {
        this.#print('Can not set stroke color');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gStrokeRect(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 4) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1) && Cons.isNumber(a2) && Cons.isNumber(a3)) {
            this.ctx.strokeRect(a0, a1, a2, a3);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw stroke rectangle.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw stroke rectangle.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gStrokeText(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 3) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          if (Cons.isString(a0) && Cons.isNumber(a1) && Cons.isNumber(a2)) {
            this.ctx.strokeText(a0, a1, a2);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw stroke text.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw stroke text.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gStrokeTri(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 6) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          const cdr4 = cdr3.cdr as Cons;
          const a4 = cdr4.car;
          const cdr5 = cdr4.cdr as Cons;
          const a5 = cdr5.car;
          if (
            Cons.isNumber(a0) &&
            Cons.isNumber(a1) &&
            Cons.isNumber(a2) &&
            Cons.isNumber(a3) &&
            Cons.isNumber(a4) &&
            Cons.isNumber(a5)
          ) {
            this.ctx.beginPath();
            this.ctx.moveTo(a0, a1);
            this.ctx.lineTo(a2, a3);
            this.ctx.lineTo(a4, a5);
            this.ctx.closePath();
            this.ctx.stroke();
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw stroke triangle.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw stroke triangle.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gTextAlign(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isString(arguments_.car)) {
          this.ctx.textAlign = arguments_.car as CanvasTextAlign;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set text align.');
        return Cons.nil;
      } catch {
        this.#print('Can not set text align.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gTextBaseline(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isString(arguments_.car)) {
          this.ctx.textBaseline = arguments_.car as CanvasTextBaseline;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set text baseline.');
        return Cons.nil;
      } catch {
        this.#print('Can not set text baseline.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gTextDirection(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isString(arguments_.car)) {
          this.ctx.direction = arguments_.car as CanvasDirection;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set text direction.');
        return Cons.nil;
      } catch {
        this.#print('Can not set text direction.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gTextFont(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isString(arguments_.car)) {
          this.ctx.font = arguments_.car;
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not set text font.');
        return Cons.nil;
      } catch {
        this.#print('Can not set text font.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gTranslate(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 2) {
          const a0 = arguments_.car;
          const a1 = (arguments_.cdr as Cons).car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1)) {
            this.ctx.translate(a0, a1);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not translate.');
        return Cons.nil;
      } catch {
        this.#print('Can not translate.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gRect(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 4) {
          const a0 = arguments_.car;
          const cdr1 = arguments_.cdr as Cons;
          const a1 = cdr1.car;
          const cdr2 = cdr1.cdr as Cons;
          const a2 = cdr2.car;
          const cdr3 = cdr2.cdr as Cons;
          const a3 = cdr3.car;
          if (Cons.isNumber(a0) && Cons.isNumber(a1) && Cons.isNumber(a2) && Cons.isNumber(a3)) {
            this.ctx.rect(a0, a1, a2, a3);
            return InterpretedSymbol.of('t');
          }
        }
        this.#print('Can not draw rectangle.');
        return Cons.nil;
      } catch {
        this.#print('Can not draw rectangle.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  gRotate(arguments_: Cons): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        if (arguments_.length() === 1 && Cons.isNumber(arguments_.car)) {
          this.ctx.rotate((Math.PI / 180) * arguments_.car);
          return InterpretedSymbol.of('t');
        }
        this.#print('Can not rotate.');
        return Cons.nil;
      } catch {
        this.#print('Can not rotate.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * Pushes the current drawing state (styles, transform, clip) onto the
   * context's state stack. Pairs with `gRestore` to let Lisp callers manage
   * state explicitly. Replaces the legacy per-method `ctx.save()` calls, which
   * pushed state on every draw with no matching `restore()` and grew the stack
   * unbounded.
   * @return `t` on success, `Cons.nil` otherwise
   */
  gSave(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.save();
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not save.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * Pops the most recently saved drawing state off the context's state stack.
   * Pairs with `gSave`. Popping an empty stack is a no-op per the Canvas spec.
   * @return `t` on success, `Cons.nil` otherwise
   */
  gRestore(): LispValue {
    if (!this.checkSupport()) return Cons.nil;
    if (this.isOpen) {
      try {
        this.ctx.restore();
        return InterpretedSymbol.of('t');
      } catch {
        this.#print('Can not restore.');
        return Cons.nil;
      }
    }
    this.#print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * Parses a color spec from the head of the argument Cons. Accepts
   * (1 string), (3 numbers — rgb), or (4 numbers — rgba); falls back to
   * `'black'` on anything else (legacy behavior).
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
        aColor = `rgb(${a0}, ${a1}, ${a2})`;
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
        aColor = `rgba(${a0}, ${a1}, ${a2}, ${a3})`;
      } else {
        this.#print('Can not set color. set color "black".');
      }
    } else {
      this.#print('Can not set color. set color "black".');
    }
    return aColor;
  }
}
