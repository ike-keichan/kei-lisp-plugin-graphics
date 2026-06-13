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
