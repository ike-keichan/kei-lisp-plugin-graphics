import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cons, InterpretedSymbol, LispInterpreter, StreamManager } from 'kei-lisp';

import { GraphicsPlugin } from './index.js';

/**
 * Builds a stub CanvasRenderingContext2D with `vi.fn()`-wrapped methods for
 * every member the plugin touches. happy-dom's HTMLCanvasElement.getContext
 * returns null, so each test installs this fake via `vi.spyOn`.
 * @return {object} the fake context
 */
function makeFakeCtx() {
  return {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'inherit',
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
}

/**
 * Creates a fresh canvas-backed plugin for a single test.
 * @return {{ canvas: HTMLCanvasElement, plugin: GraphicsPlugin }} the canvas + plugin pair
 */
function makePlugin() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  vi.spyOn(canvas, 'getContext').mockReturnValue(makeFakeCtx());
  const plugin = new GraphicsPlugin(canvas);
  return { canvas, plugin };
}

/**
 * Builds a Lisp argument list (Cons) from JS values.
 * @param {...(number | string)} values - the values to put in the list
 * @return {Cons} the resulting Cons (or Cons.nil for an empty list)
 */
function args(...values) {
  if (values.length === 0) {
    return Cons.nil;
  }
  const head = new Cons(values[0]);
  let tail = head;
  for (let i = 1; i < values.length; i++) {
    tail.cdr = new Cons(values[i]);
    tail = tail.cdr;
  }
  return head;
}

/**
 * Builds a PluginContext for tests that need ctx.streamManager.
 * @return {object} the context
 */
function makeCtx() {
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

    it('returns nil for an unregistered symbol (legacy: prints + returns nil)', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('unknown-fn'), Cons.nil, makeCtx());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gOpen', () => {
    it('marks the plugin as open', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      expect(plugin.isOpen).toBe(true);
    });

    it('returns t on success', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns nil when the canvas is already open (legacy: print + nil)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const second = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      expect(second).toBe(Cons.nil);
    });
  });

  describe('gClose', () => {
    it('marks the plugin as closed', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gclose'), Cons.nil, makeCtx());
      expect(plugin.isOpen).toBe(false);
    });

    it('returns nil when the canvas is already closed', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gclose'), Cons.nil, makeCtx());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gClear', () => {
    it('paints the canvas white (legacy clear strategy)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'fillRect');
      spy.mockClear();
      plugin.apply(InterpretedSymbol.of('gclear'), Cons.nil, makeCtx());
      expect(spy).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('returns nil when the canvas is not open', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gclear'), Cons.nil, makeCtx());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gMoveTo', () => {
    it('forwards x and y to ctx.moveTo', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'moveTo');
      plugin.apply(InterpretedSymbol.of('gmove-to'), args(10, 20), makeCtx());
      expect(spy).toHaveBeenCalledWith(10, 20);
    });

    it('returns nil on wrong arity (legacy: print + nil)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const result = plugin.apply(InterpretedSymbol.of('gmove-to'), args(10), makeCtx());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gFillRect', () => {
    it('forwards x, y, w, h to ctx.fillRect', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'fillRect');
      spy.mockClear();
      plugin.apply(InterpretedSymbol.of('gfill-rect'), args(10, 20, 100, 50), makeCtx());
      expect(spy).toHaveBeenCalledWith(10, 20, 100, 50);
    });
  });

  describe('gArc', () => {
    it('converts degrees to radians and treats >= 0 flag as counter-clockwise', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'arc');
      plugin.apply(InterpretedSymbol.of('garc'), args(50, 50, 25, 0, 180, 1), makeCtx());
      expect(spy).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI, true);
    });
  });

  describe('gFillTri', () => {
    it('emits beginPath, moveTo, two lineTo, and fill', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const moveTo = vi.spyOn(plugin.ctx, 'moveTo');
      const lineTo = vi.spyOn(plugin.ctx, 'lineTo');
      const fill = vi.spyOn(plugin.ctx, 'fill');
      plugin.apply(InterpretedSymbol.of('gfill-tri'), args(0, 0, 10, 0, 5, 10), makeCtx());
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
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gcolor'), args('red'), makeCtx());
      expect(plugin.ctx.fillStyle).toBe('red');
    });

    it('accepts a 3-number RGB tuple', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gcolor'), args(10, 20, 30), makeCtx());
      expect(plugin.ctx.fillStyle).toBe('rgb(10, 20, 30)');
    });

    it('accepts a 4-number RGBA tuple', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gcolor'), args(10, 20, 30, 0.5), makeCtx());
      expect(plugin.ctx.fillStyle).toBe('rgba(10, 20, 30, 0.5)');
    });
  });

  describe('gAlpha', () => {
    it('clamps values below zero to zero', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('galpha'), args(-1), makeCtx());
      expect(plugin.ctx.globalAlpha).toBe(0);
    });

    it('clamps values above one to one', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('galpha'), args(5), makeCtx());
      expect(plugin.ctx.globalAlpha).toBe(1);
    });
  });

  describe('gLineCap', () => {
    it('maps zero to "butt"', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gline-cap'), args(0), makeCtx());
      expect(plugin.ctx.lineCap).toBe('butt');
    });

    it('maps a positive flag to "round"', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gline-cap'), args(1), makeCtx());
      expect(plugin.ctx.lineCap).toBe('round');
    });
  });

  describe('gShadowBlur', () => {
    it('preserves the legacy typo by writing ctx.Blur instead of ctx.shadowBlur', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gshadow-blur'), args(8), makeCtx());
      expect(plugin.ctx.Blur).toBe(8);
    });
  });

  describe('gRotate', () => {
    it('converts degrees to radians before calling ctx.rotate', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx, 'rotate');
      plugin.apply(InterpretedSymbol.of('grotate'), args(90), makeCtx());
      expect(spy).toHaveBeenCalledWith(Math.PI / 2);
    });
  });

  describe('selectColor', () => {
    it('returns a string argument verbatim', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(args('navy'))).toBe('navy');
    });

    it('formats a 3-number tuple as rgb(...)', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(args(1, 2, 3))).toBe('rgb(1, 2, 3)');
    });

    it('formats a 4-number tuple as rgba(...)', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(args(1, 2, 3, 0.5))).toBe('rgba(1, 2, 3, 0.5)');
    });
  });

  describe('end-to-end via LispInterpreter', () => {
    let interpreter;
    let plugin;
    let fillRect;

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
  });
});
