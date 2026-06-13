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
