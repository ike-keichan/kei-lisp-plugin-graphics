import { type MockInstance, beforeEach, describe, expect, it, vi } from 'vitest';

import { Cons, EvalError, InterpretedSymbol, LispInterpreter, StreamManager } from 'kei-lisp';
import type { PluginContext } from 'kei-lisp';

import { GraphicsPlugin } from './index.js';

/**
 * Builds a stub CanvasRenderingContext2D with `vi.fn()`-wrapped methods for
 * every member the plugin touches. happy-dom's HTMLCanvasElement.getContext
 * returns null, so each test installs this fake via `vi.spyOn`.
 */
function makeFakeCtx(): CanvasRenderingContext2D {
  const fake = {
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
    strokeStyle: '' as string | CanvasGradient | CanvasPattern,
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    direction: 'inherit' as CanvasDirection,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    rect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    createPattern: vi.fn().mockReturnValue(null),
    drawImage: vi.fn(),
  };
  return fake as unknown as CanvasRenderingContext2D;
}

/** Creates a fresh canvas-backed plugin for a single test. */
function makePlugin(): { canvas: HTMLCanvasElement; plugin: GraphicsPlugin } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  vi.spyOn(canvas, 'getContext').mockReturnValue(makeFakeCtx());
  const plugin = new GraphicsPlugin(canvas);
  return { canvas, plugin };
}

/** Builds a Lisp argument list (Cons) from JS values. */
function args(...values: (number | string)[]): Cons {
  const head = new Cons();
  let tail = head;
  let first = true;
  for (const v of values) {
    if (first) {
      head.car = v;
      first = false;
    } else {
      tail.cdr = new Cons(v);
      tail = tail.cdr;
    }
  }
  if (first) {
    return Cons.nil;
  }
  return head;
}

/** Builds an empty PluginContext for tests that don't use ctx.eval. */
function makeCtx(): PluginContext {
  const interpreter = new LispInterpreter();
  return {
    environment: interpreter.root,
    streamManager: new StreamManager(),
    depth: 1,
    eval: (form) => interpreter.eval(form),
  };
}

describe('GraphicsPlugin', () => {
  describe('constructor', () => {
    it('binds the given canvas', () => {
      const { canvas, plugin } = makePlugin();
      expect(plugin.canvas).toBe(canvas);
    });

    it('starts in the closed state', () => {
      const { plugin } = makePlugin();
      expect(plugin.isOpen).toBe(false);
    });

    it('exposes the plugin name "graphics"', () => {
      const { plugin } = makePlugin();
      expect(plugin.name).toBe('graphics');
    });
  });

  describe('has', () => {
    it('returns true for a registered symbol', () => {
      const { plugin } = makePlugin();
      expect(plugin.has(InterpretedSymbol.of('gopen'))).toBe(true);
    });

    it('returns false for an unknown symbol', () => {
      const { plugin } = makePlugin();
      expect(plugin.has(InterpretedSymbol.of('unknown-fn'))).toBe(false);
    });
  });

  describe('apply', () => {
    it('dispatches the symbol to its corresponding method', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('throws when no method is registered for the symbol', () => {
      const { plugin } = makePlugin();
      expect(() => plugin.apply(InterpretedSymbol.of('unknown-fn'), Cons.nil, makeCtx())).toThrow(
        EvalError,
      );
    });
  });

  describe('gOpen', () => {
    it('marks the plugin as open', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      expect(plugin.isOpen).toBe(true);
    });

    it('returns the symbol t on success', () => {
      const { plugin } = makePlugin();
      expect(plugin.gOpen(Cons.nil, makeCtx())).toBe(InterpretedSymbol.of('t'));
    });

    it('throws when the canvas is already open', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      expect(() => plugin.gOpen(Cons.nil, makeCtx())).toThrow(EvalError);
    });
  });

  describe('gClose', () => {
    it('marks the plugin as closed', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gClose();
      expect(plugin.isOpen).toBe(false);
    });

    it('throws when the canvas is already closed', () => {
      const { plugin } = makePlugin();
      expect(() => plugin.gClose()).toThrow(EvalError);
    });
  });

  describe('gClear', () => {
    it('paints the canvas white (legacy behavior)', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'fillRect');
      plugin.gClear();
      expect(spy).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('throws when the canvas is not open', () => {
      const { plugin } = makePlugin();
      expect(() => plugin.gClear()).toThrow(EvalError);
    });
  });

  describe('gSleep', () => {
    it('throws when the canvas is not open', () => {
      const { plugin } = makePlugin();
      expect(() => plugin.gSleep(args(1))).toThrow(EvalError);
    });

    it('blocks for approximately the requested duration', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const before = Date.now();
      plugin.gSleep(args(20));
      const elapsed = Date.now() - before;
      expect(elapsed).toBeGreaterThanOrEqual(20);
    });
  });

  describe('gStartPath', () => {
    it('calls ctx.beginPath', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'beginPath');
      plugin.gStartPath();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('gFinishPath', () => {
    it('calls ctx.closePath', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'closePath');
      plugin.gFinishPath();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('gMoveTo', () => {
    it('forwards x and y to ctx.moveTo', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'moveTo');
      plugin.gMoveTo(args(10, 20));
      expect(spy).toHaveBeenCalledWith(10, 20);
    });

    it('throws on wrong arity', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      expect(() => plugin.gMoveTo(args(10))).toThrow(EvalError);
    });

    it('throws when an argument is not a number', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      expect(() => plugin.gMoveTo(args(10, 'oops'))).toThrow(EvalError);
    });
  });

  describe('gFillRect', () => {
    it('forwards x, y, w, h to ctx.fillRect', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'fillRect');
      spy.mockClear();
      plugin.gFillRect(args(10, 20, 100, 50));
      expect(spy).toHaveBeenCalledWith(10, 20, 100, 50);
    });

    it('throws on wrong arity', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      expect(() => plugin.gFillRect(args(10, 20, 100))).toThrow(EvalError);
    });
  });

  describe('gArc', () => {
    it('converts the start and end angles from degrees to radians', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'arc');
      plugin.gArc(args(50, 50, 25, 0, 180, 1));
      expect(spy).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI, true);
    });

    it('treats a negative direction flag as clockwise', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'arc');
      plugin.gArc(args(50, 50, 25, 0, 90, -1));
      expect(spy).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI / 2, false);
    });
  });

  describe('gFillTri', () => {
    it('emits beginPath, moveTo, two lineTo, and fill calls', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const moveTo = vi.spyOn(plugin.ctx, 'moveTo');
      const lineTo = vi.spyOn(plugin.ctx, 'lineTo');
      const fill = vi.spyOn(plugin.ctx, 'fill');
      plugin.gFillTri(args(0, 0, 10, 0, 5, 10));
      expect(moveTo).toHaveBeenCalledWith(0, 0);
      expect(lineTo.mock.calls).toEqual([
        [10, 0],
        [5, 10],
      ]);
      expect(fill).toHaveBeenCalled();
    });
  });

  describe('gColor', () => {
    it('sets fillStyle from a string color', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gColor(args('red'));
      expect(plugin.ctx.fillStyle).toBe('red');
    });

    it('sets strokeStyle from a string color', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gColor(args('red'));
      expect(plugin.ctx.strokeStyle).toBe('red');
    });

    it('accepts a 3-number RGB tuple', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gColor(args(10, 20, 30));
      expect(plugin.ctx.fillStyle).toBe('rgb(10, 20, 30)');
    });

    it('accepts a 4-number RGBA tuple', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gColor(args(10, 20, 30, 0.5));
      expect(plugin.ctx.fillStyle).toBe('rgba(10, 20, 30, 0.5)');
    });
  });

  describe('gAlpha', () => {
    it('clamps values below zero to zero', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gAlpha(args(-1));
      expect(plugin.ctx.globalAlpha).toBe(0);
    });

    it('clamps values above one to one', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gAlpha(args(5));
      expect(plugin.ctx.globalAlpha).toBe(1);
    });

    it('passes mid-range values through unchanged', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gAlpha(args(0.5));
      expect(plugin.ctx.globalAlpha).toBe(0.5);
    });
  });

  describe('gLineCap', () => {
    it('maps zero to "butt"', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gLineCap(args(0));
      expect(plugin.ctx.lineCap).toBe('butt');
    });

    it('maps a positive flag to "round"', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gLineCap(args(1));
      expect(plugin.ctx.lineCap).toBe('round');
    });

    it('maps a negative flag to "square"', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gLineCap(args(-1));
      expect(plugin.ctx.lineCap).toBe('square');
    });
  });

  describe('gLineWidth', () => {
    it('coerces values <= 0 to 1 (legacy clamp)', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gLineWidth(args(-5));
      expect(plugin.ctx.lineWidth).toBe(1);
    });

    it('passes positive values through', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gLineWidth(args(3));
      expect(plugin.ctx.lineWidth).toBe(3);
    });
  });

  describe('gShadowBlur', () => {
    it('preserves the legacy typo by writing to ctx.Blur, not shadowBlur', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gShadowBlur(args(8));
      const probe = plugin.ctx as unknown as Record<string, number>;
      expect(probe['Blur']).toBe(8);
    });
  });

  describe('gTextFont', () => {
    it('forwards the string to ctx.font', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      plugin.gTextFont(args('16px sans-serif'));
      expect(plugin.ctx.font).toBe('16px sans-serif');
    });
  });

  describe('gRotate', () => {
    it('converts degrees to radians before calling ctx.rotate', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'rotate');
      plugin.gRotate(args(90));
      expect(spy).toHaveBeenCalledWith(Math.PI / 2);
    });
  });

  describe('gTranslate', () => {
    it('forwards dx and dy to ctx.translate', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'translate');
      plugin.gTranslate(args(10, 20));
      expect(spy).toHaveBeenCalledWith(10, 20);
    });
  });

  describe('gScale', () => {
    it('forwards sx and sy to ctx.scale', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'scale');
      plugin.gScale(args(2, 3));
      expect(spy).toHaveBeenCalledWith(2, 3);
    });
  });

  describe('gImage', () => {
    it('throws on an arity other than 3 or 5', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      expect(() => plugin.gImage(args('a.png', 10))).toThrow(EvalError);
    });

    it('returns t immediately without waiting for the image to load', () => {
      const { plugin } = makePlugin();
      plugin.gOpen(Cons.nil, makeCtx());
      expect(plugin.gImage(args('a.png', 0, 0))).toBe(InterpretedSymbol.of('t'));
    });
  });

  describe('parseColor', () => {
    it('returns a string argument verbatim', () => {
      const { plugin } = makePlugin();
      expect(plugin.parseColor(args('navy'))).toBe('navy');
    });

    it('formats a 3-number tuple as rgb(...)', () => {
      const { plugin } = makePlugin();
      expect(plugin.parseColor(args(1, 2, 3))).toBe('rgb(1, 2, 3)');
    });

    it('formats a 4-number tuple as rgba(...)', () => {
      const { plugin } = makePlugin();
      expect(plugin.parseColor(args(1, 2, 3, 0.5))).toBe('rgba(1, 2, 3, 0.5)');
    });

    it('falls back to "black" on an unrecognized shape', () => {
      const { plugin } = makePlugin();
      expect(plugin.parseColor(args(1, 2))).toBe('black');
    });
  });

  describe('lineCapOf', () => {
    it('maps 0 to "butt"', () => {
      const { plugin } = makePlugin();
      expect(plugin.lineCapOf(0)).toBe('butt');
    });

    it('maps a positive value to "round"', () => {
      const { plugin } = makePlugin();
      expect(plugin.lineCapOf(2)).toBe('round');
    });

    it('maps a negative value to "square"', () => {
      const { plugin } = makePlugin();
      expect(plugin.lineCapOf(-3)).toBe('square');
    });
  });

  describe('lineJoinOf', () => {
    it('maps 0 to "miter"', () => {
      const { plugin } = makePlugin();
      expect(plugin.lineJoinOf(0)).toBe('miter');
    });

    it('maps a positive value to "round"', () => {
      const { plugin } = makePlugin();
      expect(plugin.lineJoinOf(1)).toBe('round');
    });

    it('maps a negative value to "bevel"', () => {
      const { plugin } = makePlugin();
      expect(plugin.lineJoinOf(-1)).toBe('bevel');
    });
  });

  describe('textDirectionOf', () => {
    it('maps 0 to "inherit"', () => {
      const { plugin } = makePlugin();
      expect(plugin.textDirectionOf(0)).toBe('inherit');
    });

    it('maps a positive value to "rtl"', () => {
      const { plugin } = makePlugin();
      expect(plugin.textDirectionOf(1)).toBe('rtl');
    });

    it('maps a negative value to "ltr"', () => {
      const { plugin } = makePlugin();
      expect(plugin.textDirectionOf(-1)).toBe('ltr');
    });
  });

  describe('end-to-end via LispInterpreter', () => {
    let interpreter: LispInterpreter;
    let plugin: GraphicsPlugin;
    let fillRect: MockInstance<CanvasRenderingContext2D['fillRect']>;

    beforeEach(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      vi.spyOn(canvas, 'getContext').mockReturnValue(makeFakeCtx());
      plugin = new GraphicsPlugin(canvas);
      fillRect = vi.spyOn(plugin.ctx, 'fillRect');
      interpreter = new LispInterpreter();
      interpreter.use(plugin);
    });

    it('routes a g... call from Lisp source to the canvas method', () => {
      interpreter.evalString('(gopen)');
      fillRect.mockClear();
      interpreter.evalString('(gfill-rect 5 10 50 30)');
      expect(fillRect).toHaveBeenCalledWith(5, 10, 50, 30);
    });

    it('falls through to built-ins for non-g... symbols', () => {
      expect(interpreter.evalString('(+ 1 2 3)')).toBe(6);
    });

    it('returns t on a successful drawing call', () => {
      interpreter.evalString('(gopen)');
      const result = interpreter.evalString('(gline-width 3)');
      expect(result).toBe(InterpretedSymbol.of('t'));
    });
  });
});
