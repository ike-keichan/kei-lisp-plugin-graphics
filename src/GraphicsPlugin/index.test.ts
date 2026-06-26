import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LispValue, PluginContext } from 'kei-lisp';
import { Cons, InterpretedSymbol, LispInterpreter, StreamManager } from 'kei-lisp';

import { GraphicsPlugin } from './index.js';

type FakeCtx = {
  fillStyle: string;
  strokeStyle: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  direction: string;
  fillRect: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  strokeText: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  quadraticCurveTo: ReturnType<typeof vi.fn>;
  bezierCurveTo: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  arcTo: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  createPattern: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
};

/**
 * Builds a stub CanvasRenderingContext2D with `vi.fn()`-wrapped methods for
 * every member the plugin touches. happy-dom's HTMLCanvasElement.getContext
 * returns null, so each test installs this fake via `vi.spyOn`.
 */
function makeFakeCtx(): FakeCtx {
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
 */
function makePlugin(): { canvas: HTMLCanvasElement; plugin: GraphicsPlugin } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  vi.spyOn(canvas, 'getContext').mockReturnValue(
    makeFakeCtx() as unknown as CanvasRenderingContext2D,
  );
  const plugin = new GraphicsPlugin(canvas);
  return { canvas, plugin };
}

/**
 * Builds a Lisp argument list (Cons) from JS values.
 */
function args(...values: LispValue[]): Cons {
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
 * Builds a minimal PluginContext for tests that pass one to `apply`.
 * The current GraphicsPlugin no longer reads the context, so the shape
 * only has to type-check; a single `{}` would do, but we keep a small
 * eval-capable stub so that tests exercising the host interpreter's
 * dispatch path do not collapse the context out from under it.
 */
function makeCtx(): PluginContext {
  const interpreter = new LispInterpreter();
  return {
    environment: interpreter.root,
    streamManager: null as unknown as StreamManager,
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

  describe('buildInFunction', () => {
    it('throws TypeError when the dispatch table points to a missing method', () => {
      const { plugin } = makePlugin();
      // Temporarily inject a symbol that maps to a non-existent method name.
      const orphan = InterpretedSymbol.of('test-orphan');
      GraphicsPlugin.buildInFunctions.set(orphan, 'methodDoesNotExist');
      try {
        expect(() => plugin.buildInFunction(orphan, Cons.nil)).toThrow(TypeError);
      } finally {
        GraphicsPlugin.buildInFunctions.delete(orphan);
      }
    });
  });

  describe('_print', () => {
    it('writes the line plus a newline to process.stderr', () => {
      const { plugin } = makePlugin();
      const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      try {
        plugin._print('hello');
        expect(spy).toHaveBeenCalledWith('hello\n');
      } finally {
        spy.mockRestore();
      }
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
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fillRect');
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
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'moveTo');
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
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fillRect');
      spy.mockClear();
      plugin.apply(InterpretedSymbol.of('gfill-rect'), args(10, 20, 100, 50), makeCtx());
      expect(spy).toHaveBeenCalledWith(10, 20, 100, 50);
    });
  });

  describe('gArc', () => {
    it('converts degrees to radians and treats >= 0 flag as counter-clockwise', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'arc');
      plugin.apply(InterpretedSymbol.of('garc'), args(50, 50, 25, 0, 180, 1), makeCtx());
      expect(spy).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI, true);
    });
  });

  describe('gFillTri', () => {
    it('emits beginPath, moveTo, two lineTo, and fill', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const moveTo = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'moveTo');
      const lineTo = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'lineTo');
      const fill = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fill');
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
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('red');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('red');
    });

    it('accepts a 3-number RGB tuple', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gcolor'), args(10, 20, 30), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('rgb(10, 20, 30)');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('rgb(10, 20, 30)');
    });

    it('accepts a 4-number RGBA tuple', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gcolor'), args(10, 20, 30, 0.5), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('rgba(10, 20, 30, 0.5)');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('rgba(10, 20, 30, 0.5)');
    });
  });

  describe('gFillColor', () => {
    it('sets fillStyle but leaves strokeStyle unchanged', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      (plugin.ctx as CanvasRenderingContext2D).strokeStyle = 'initial';
      plugin.apply(InterpretedSymbol.of('gfill-color'), args('blue'), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('blue');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('initial');
    });
  });

  describe('gStrokeColor', () => {
    it('sets strokeStyle but leaves fillStyle unchanged', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      (plugin.ctx as CanvasRenderingContext2D).fillStyle = 'initial';
      plugin.apply(InterpretedSymbol.of('gstroke-color'), args('green'), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('green');
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('initial');
    });
  });

  describe('gAlpha', () => {
    it('clamps values below zero to zero', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('galpha'), args(-1), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).globalAlpha).toBe(0);
    });

    it('passes through mid-range values unchanged', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('galpha'), args(0.5), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).globalAlpha).toBe(0.5);
    });

    it('clamps values above one to one', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('galpha'), args(5), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).globalAlpha).toBe(1);
    });
  });

  describe('gLineCap', () => {
    it('maps zero to "butt"', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gline-cap'), args(0), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).lineCap).toBe('butt');
    });

    it('maps a positive flag to "round"', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gline-cap'), args(1), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).lineCap).toBe('round');
    });

    it('maps a negative flag to "square"', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gline-cap'), args(-1), makeCtx());
      expect((plugin.ctx as CanvasRenderingContext2D).lineCap).toBe('square');
    });
  });

  describe('gShadowBlur', () => {
    it('preserves the legacy typo by writing ctx.Blur instead of ctx.shadowBlur', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      plugin.apply(InterpretedSymbol.of('gshadow-blur'), args(8), makeCtx());
      expect((plugin.ctx as unknown as { Blur: number }).Blur).toBe(8);
    });
  });

  describe('gStrokeText', () => {
    it('calls ctx.strokeText with the correct arguments', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'strokeText');
      plugin.apply(InterpretedSymbol.of('gstroke-text'), args('hello', 10, 20), makeCtx());
      expect(spy).toHaveBeenCalledWith('hello', 10, 20);
    });

    it('preserves the legacy typo by emitting "Can not draw fill text." on failure', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      try {
        plugin.apply(InterpretedSymbol.of('gstroke-text'), args(10, 20), makeCtx());
        expect(spy).toHaveBeenCalledWith('Can not draw fill text.\n');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('gRotate', () => {
    it('converts degrees to radians before calling ctx.rotate', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'rotate');
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

    it('returns "black" for zero arguments', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(Cons.nil)).toBe('black');
    });

    it('returns "black" for unrecognized arity (2 args)', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(args(1, 2))).toBe('black');
    });

    it('returns "black" when a 3-element tuple contains a non-number', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(args(1, 'two', 3))).toBe('black');
    });
  });

  describe('gImage', () => {
    it('returns t for a valid 3-arg call', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const result = plugin.apply(
        InterpretedSymbol.of('gimage'),
        args('http://example.test/img.png', 10, 20),
        makeCtx(),
      );
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns t for a valid 5-arg call', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const result = plugin.apply(
        InterpretedSymbol.of('gimage'),
        args('http://example.test/img.png', 10, 20, 100, 80),
        makeCtx(),
      );
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns nil for wrong arity', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      const result = plugin.apply(
        InterpretedSymbol.of('gimage'),
        args('http://example.test/img.png', 10),
        makeCtx(),
      );
      expect(result).toBe(Cons.nil);
    });
  });

  describe('checkSupport', () => {
    it('returns nil from any g* method when ctx is null', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);
      const plugin = new GraphicsPlugin(canvas);
      const result = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeCtx());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('end-to-end via LispInterpreter', () => {
    let interpreter: LispInterpreter;
    let plugin: GraphicsPlugin;
    let fillRect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 100;
      vi.spyOn(canvas, 'getContext').mockReturnValue(
        makeFakeCtx() as unknown as CanvasRenderingContext2D,
      );
      plugin = new GraphicsPlugin(canvas);
      fillRect = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fillRect');
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
