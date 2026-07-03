import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LispValue, PluginContext } from 'kei-lisp';
import { Cons, InterpretedSymbol, LispInterpreter, StreamManager } from 'kei-lisp';

import { createGraphicsPlugin } from '../index.js';
import { GraphicsPlugin } from './index.js';

type FakeContext = {
  fillStyle: string;
  strokeStyle: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  shadowColor: string;
  shadowBlur: number;
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
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  createPattern: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  lineDashOffset: number;
  miterLimit: number;
  globalCompositeOperation: string;
  filter: string;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: string;
  letterSpacing: string;
  wordSpacing: string;
  fontKerning: string;
  fontStretch: string;
  fontVariantCaps: string;
  textRendering: string;
  ellipse: ReturnType<typeof vi.fn>;
  roundRect: ReturnType<typeof vi.fn>;
  setLineDash: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  isPointInPath: ReturnType<typeof vi.fn>;
  isPointInStroke: ReturnType<typeof vi.fn>;
  transform: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  resetTransform: ReturnType<typeof vi.fn>;
  measureText: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  putImageData: ReturnType<typeof vi.fn>;
  createImageData: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  createRadialGradient: ReturnType<typeof vi.fn>;
  createConicGradient: ReturnType<typeof vi.fn>;
};

/**
 * Builds a stub CanvasRenderingContext2D with `vi.fn()`-wrapped methods for
 * every member the plugin touches. happy-dom's HTMLCanvasElement.getContext
 * returns null, so each test installs this fake via `vi.spyOn`.
 */
function makeFakeContext(): FakeContext {
  return {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowColor: '',
    shadowBlur: 0,
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
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    createPattern: vi.fn().mockReturnValue(null),
    drawImage: vi.fn(),
    lineDashOffset: 0,
    miterLimit: 10,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    letterSpacing: '0px',
    wordSpacing: '0px',
    fontKerning: 'auto',
    fontStretch: 'normal',
    fontVariantCaps: 'normal',
    textRendering: 'auto',
    ellipse: vi.fn(),
    roundRect: vi.fn(),
    setLineDash: vi.fn(),
    clip: vi.fn(),
    isPointInPath: vi.fn().mockReturnValue(true),
    isPointInStroke: vi.fn().mockReturnValue(false),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 42 }),
    reset: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: [10, 20, 30, 255] }),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    createConicGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
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
    makeFakeContext() as unknown as CanvasRenderingContext2D,
  );
  const plugin = new GraphicsPlugin(canvas);
  return { canvas, plugin };
}

/**
 * Builds a Lisp argument list (Cons) from JS values.
 */
function arguments_(...values: LispValue[]): Cons {
  if (values.length === 0) {
    return Cons.nil;
  }
  const head = new Cons(values[0]);
  let tail = head;
  for (let index = 1; index < values.length; index++) {
    tail.cdr = new Cons(values[index]);
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
function makeContext(): PluginContext {
  const interpreter = new LispInterpreter();
  return {
    environment: interpreter.root,
    streamManager: null as unknown as StreamManager,
    depth: 1,
    eval: (form) => interpreter.eval(form),
  };
}

/**
 * Creates an already-opened plugin and exposes the fake context for asserts.
 */
function openPlugin(): { plugin: GraphicsPlugin; ctx: FakeContext } {
  const { plugin } = makePlugin();
  plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
  return { plugin, ctx: plugin.ctx as unknown as FakeContext };
}

/**
 * Applies the named Lisp function with the given arguments.
 */
function call(plugin: GraphicsPlugin, name: string, ...values: LispValue[]): LispValue {
  return plugin.apply(InterpretedSymbol.of(name), arguments_(...values), makeContext());
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
      const result = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns nil for an unregistered symbol (legacy: prints + returns nil)', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('unknown-fn'), Cons.nil, makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('functionNames', () => {
    it('lists every registered Lisp function, sorted', () => {
      const names = GraphicsPlugin.functionNames();
      expect(names).toContain('gopen');
      expect(names).toContain('glinear-gradient');
      // eslint-disable-next-line unicorn/no-array-sort -- toSorted is untyped under lib ES2022
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it('includes the deprecated aliases alongside the new names', () => {
      const names = GraphicsPlugin.functionNames();
      expect(names).toEqual(
        expect.arrayContaining(['gtext-dire', 'gtext-direction', 'gtext-line', 'gtext-baseline']),
      );
    });
  });

  describe('#print (via closed-canvas path)', () => {
    it('writes the line plus a newline to process.stderr', () => {
      const { plugin } = makePlugin();
      const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      try {
        plugin.gAlpha(arguments_(0));
        expect(spy).toHaveBeenCalledWith('The canvas is closed and cannot be executed.\n');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('gOpen', () => {
    it('marks the plugin as open', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      expect(plugin.isOpen).toBe(true);
    });

    it('returns t on success', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns nil when the canvas is already open (legacy: print + nil)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const second = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      expect(second).toBe(Cons.nil);
    });

    it('prints the actual canvas dimensions', () => {
      const { plugin } = makePlugin();
      const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      try {
        plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
        expect(spy).toHaveBeenCalledWith('canvas size, width : 800 height : 600\n');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('gClose', () => {
    it('marks the plugin as closed', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('gclose'), Cons.nil, makeContext());
      expect(plugin.isOpen).toBe(false);
    });

    it('returns nil when the canvas is already closed', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gclose'), Cons.nil, makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gClear', () => {
    it('paints the canvas white (legacy clear strategy)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fillRect');
      spy.mockClear();
      plugin.apply(InterpretedSymbol.of('gclear'), Cons.nil, makeContext());
      expect(spy).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('returns nil when the canvas is not open', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gclear'), Cons.nil, makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gMoveTo', () => {
    it('forwards x and y to ctx.moveTo', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'moveTo');
      plugin.apply(InterpretedSymbol.of('gmove-to'), arguments_(10, 20), makeContext());
      expect(spy).toHaveBeenCalledWith(10, 20);
    });

    it('returns nil on wrong arity (legacy: print + nil)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(InterpretedSymbol.of('gmove-to'), arguments_(10), makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gLineTo', () => {
    it('forwards x and y to ctx.lineTo', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'lineTo');
      plugin.apply(InterpretedSymbol.of('gline-to'), arguments_(30, 40), makeContext());
      expect(spy).toHaveBeenCalledWith(30, 40);
    });

    it('returns nil on wrong arity', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(InterpretedSymbol.of('gline-to'), arguments_(30), makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gFillRect', () => {
    it('forwards x, y, w, h to ctx.fillRect', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fillRect');
      spy.mockClear();
      plugin.apply(InterpretedSymbol.of('gfill-rect'), arguments_(10, 20, 100, 50), makeContext());
      expect(spy).toHaveBeenCalledWith(10, 20, 100, 50);
    });
  });

  describe('gFillText', () => {
    it('forwards text, x, y to ctx.fillText', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fillText');
      plugin.apply(InterpretedSymbol.of('gfill-text'), arguments_('hello', 5, 15), makeContext());
      expect(spy).toHaveBeenCalledWith('hello', 5, 15);
    });

    it('returns nil when first argument is not a string', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(
        InterpretedSymbol.of('gfill-text'),
        arguments_(42, 5, 15),
        makeContext(),
      );
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gArc', () => {
    it('converts degrees to radians and treats >= 0 flag as counter-clockwise', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'arc');
      plugin.apply(InterpretedSymbol.of('garc'), arguments_(50, 50, 25, 0, 180, 1), makeContext());
      expect(spy).toHaveBeenCalledWith(50, 50, 25, 0, Math.PI, true);
    });
  });

  describe('gFillTri', () => {
    it('emits beginPath, moveTo, two lineTo, and fill', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const moveTo = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'moveTo');
      const lineTo = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'lineTo');
      const fill = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'fill');
      plugin.apply(
        InterpretedSymbol.of('gfill-tri'),
        arguments_(0, 0, 10, 0, 5, 10),
        makeContext(),
      );
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
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('gcolor'), arguments_('red'), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('red');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('red');
    });

    it('accepts a 3-number RGB tuple', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('gcolor'), arguments_(10, 20, 30), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('rgb(10, 20, 30)');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('rgb(10, 20, 30)');
    });

    it('accepts a 4-number RGBA tuple', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('gcolor'), arguments_(10, 20, 30, 0.5), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('rgba(10, 20, 30, 0.5)');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('rgba(10, 20, 30, 0.5)');
    });
  });

  describe('gFillColor', () => {
    it('sets fillStyle but leaves strokeStyle unchanged', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      (plugin.ctx as CanvasRenderingContext2D).strokeStyle = 'initial';
      plugin.apply(InterpretedSymbol.of('gfill-color'), arguments_('blue'), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('blue');
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('initial');
    });
  });

  describe('gStrokeColor', () => {
    it('sets strokeStyle but leaves fillStyle unchanged', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      (plugin.ctx as CanvasRenderingContext2D).fillStyle = 'initial';
      plugin.apply(InterpretedSymbol.of('gstroke-color'), arguments_('green'), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).strokeStyle).toBe('green');
      expect((plugin.ctx as CanvasRenderingContext2D).fillStyle).toBe('initial');
    });
  });

  describe('gAlpha', () => {
    it('clamps values below zero to zero', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('galpha'), arguments_(-1), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).globalAlpha).toBe(0);
    });

    it('passes through mid-range values unchanged', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('galpha'), arguments_(0.5), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).globalAlpha).toBe(0.5);
    });

    it('clamps values above one to one', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('galpha'), arguments_(5), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).globalAlpha).toBe(1);
    });
  });

  describe('gLineCap', () => {
    it.each(['butt', 'round', 'square'])('forwards "%s" to ctx.lineCap', (cap) => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(
        InterpretedSymbol.of('gline-cap'),
        arguments_(cap),
        makeContext(),
      );
      expect(result).toBe(InterpretedSymbol.of('t'));
      expect((plugin.ctx as CanvasRenderingContext2D).lineCap).toBe(cap);
    });

    it('returns nil for a number argument (legacy flag no longer accepted)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(InterpretedSymbol.of('gline-cap'), arguments_(1), makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gLineJoin', () => {
    it.each(['miter', 'round', 'bevel'])('forwards "%s" to ctx.lineJoin', (join) => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(
        InterpretedSymbol.of('gline-join'),
        arguments_(join),
        makeContext(),
      );
      expect(result).toBe(InterpretedSymbol.of('t'));
      expect((plugin.ctx as CanvasRenderingContext2D).lineJoin).toBe(join);
    });

    it('returns nil for a number argument (legacy flag no longer accepted)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(InterpretedSymbol.of('gline-join'), arguments_(0), makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gTextDirection', () => {
    it.each(['ltr', 'rtl', 'inherit'])('forwards "%s" to ctx.direction', (direction) => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(
        InterpretedSymbol.of('gtext-dire'),
        arguments_(direction),
        makeContext(),
      );
      expect(result).toBe(InterpretedSymbol.of('t'));
      expect((plugin.ctx as CanvasRenderingContext2D).direction).toBe(direction);
    });

    it('returns nil for a number argument (legacy flag no longer accepted)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(InterpretedSymbol.of('gtext-dire'), arguments_(1), makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gShadowBlur', () => {
    it('writes the blur radius to ctx.shadowBlur', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      plugin.apply(InterpretedSymbol.of('gshadow-blur'), arguments_(8), makeContext());
      expect((plugin.ctx as CanvasRenderingContext2D).shadowBlur).toBe(8);
    });
  });

  describe('gStrokeText', () => {
    it('calls ctx.strokeText with the correct arguments', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'strokeText');
      plugin.apply(
        InterpretedSymbol.of('gstroke-text'),
        arguments_('hello', 10, 20),
        makeContext(),
      );
      expect(spy).toHaveBeenCalledWith('hello', 10, 20);
    });

    it('emits "Can not draw stroke text." on failure', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
      try {
        plugin.apply(InterpretedSymbol.of('gstroke-text'), arguments_(10, 20), makeContext());
        expect(spy).toHaveBeenCalledWith('Can not draw stroke text.\n');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('gRotate', () => {
    it('converts degrees to radians before calling ctx.rotate', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'rotate');
      plugin.apply(InterpretedSymbol.of('grotate'), arguments_(90), makeContext());
      expect(spy).toHaveBeenCalledWith(Math.PI / 2);
    });
  });

  describe('gSave', () => {
    it('forwards to ctx.save', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'save');
      spy.mockClear();
      const result = plugin.apply(InterpretedSymbol.of('gsave'), Cons.nil, makeContext());
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns nil when the canvas is not open', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gsave'), Cons.nil, makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gRestore', () => {
    it('forwards to ctx.restore', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'restore');
      const result = plugin.apply(InterpretedSymbol.of('grestore'), Cons.nil, makeContext());
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns nil when the canvas is not open', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('grestore'), Cons.nil, makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('drawing methods no longer auto-push the save stack', () => {
    it('does not call ctx.save() on a plain draw (legacy leak removed)', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const spy = vi.spyOn(plugin.ctx as CanvasRenderingContext2D, 'save');
      spy.mockClear();
      plugin.apply(InterpretedSymbol.of('gfill-rect'), arguments_(0, 0, 10, 10), makeContext());
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('selectColor', () => {
    it('returns a string argument verbatim', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(arguments_('navy'))).toBe('navy');
    });

    it('formats a 3-number tuple as rgb(...)', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(arguments_(1, 2, 3))).toBe('rgb(1, 2, 3)');
    });

    it('formats a 4-number tuple as rgba(...)', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(arguments_(1, 2, 3, 0.5))).toBe('rgba(1, 2, 3, 0.5)');
    });

    it('returns "black" for zero arguments', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(Cons.nil)).toBe('black');
    });

    it('returns "black" for unrecognized arity (2 args)', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(arguments_(1, 2))).toBe('black');
    });

    it('returns "black" when a 3-element tuple contains a non-number', () => {
      const { plugin } = makePlugin();
      expect(plugin.selectColor(arguments_(1, 'two', 3))).toBe('black');
    });
  });

  describe('gImage', () => {
    it('returns t for a valid 3-arg call', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(
        InterpretedSymbol.of('gimage'),
        arguments_('https://example.test/img.png', 10, 20),
        makeContext(),
      );
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns t for a valid 5-arg call', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(
        InterpretedSymbol.of('gimage'),
        arguments_('https://example.test/img.png', 10, 20, 100, 80),
        makeContext(),
      );
      expect(result).toBe(InterpretedSymbol.of('t'));
    });

    it('returns nil for wrong arity', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(
        InterpretedSymbol.of('gimage'),
        arguments_('https://example.test/img.png', 10),
        makeContext(),
      );
      expect(result).toBe(Cons.nil);
    });
  });

  describe('gSavePng / gSaveJpeg', () => {
    it('downloads via a temporary <a> element when called with no arguments', () => {
      const { canvas, plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      // cspell:disable-next-line -- 'QUJD' is the Base64 encoding of 'ABC'.
      const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,QUJD');
      canvas.toDataURL = toDataURL;
      const anchor = document.createElement('a');
      const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
      const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
      try {
        const result = plugin.apply(InterpretedSymbol.of('gsave-png'), Cons.nil, makeContext());
        expect(result).toBe(InterpretedSymbol.of('t'));
        expect(toDataURL).toHaveBeenCalledWith('image/png');
        expect(anchor.download).toBe('canvas');
        expect(click).toHaveBeenCalledTimes(1);
      } finally {
        createElement.mockRestore();
      }
    });

    it('writes the encoded image to the given file path (Node.js overload)', () => {
      const { canvas, plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      // cspell:disable-next-line -- 'anBlZy1ieXRlcw==' is the Base64 encoding of 'jpeg-bytes'.
      const toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,anBlZy1ieXRlcw==');
      canvas.toDataURL = toDataURL;
      const directory = mkdtempSync(path.join(tmpdir(), 'graphics-plugin-'));
      const filePath = path.join(directory, 'canvas.jpeg');
      try {
        const result = plugin.apply(
          InterpretedSymbol.of('gsave-jpeg'),
          arguments_(filePath),
          makeContext(),
        );
        expect(result).toBe(InterpretedSymbol.of('t'));
        expect(toDataURL).toHaveBeenCalledWith('image/jpeg');
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- reads back the temp file this test created
        expect(readFileSync(filePath, 'utf8')).toBe('jpeg-bytes');
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });

    it('returns nil for a non-string argument', () => {
      const { plugin } = makePlugin();
      plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      const result = plugin.apply(InterpretedSymbol.of('gsave-png'), arguments_(1), makeContext());
      expect(result).toBe(Cons.nil);
    });

    it('returns nil when the canvas is not open', () => {
      const { plugin } = makePlugin();
      const result = plugin.apply(InterpretedSymbol.of('gsave-png'), Cons.nil, makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('checkSupport', () => {
    it('returns nil from any g* method when ctx is null', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);
      const plugin = new GraphicsPlugin(canvas);
      const result = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
      expect(result).toBe(Cons.nil);
    });
  });

  describe('Canvas API coverage additions (#31)', () => {
    it('gellipse converts angles from degrees and maps the ccw flag', () => {
      const { plugin, ctx } = openPlugin();
      expect(call(plugin, 'gellipse', 50, 60, 40, 20, 90, 0, 180, 1)).toBe(
        InterpretedSymbol.of('t'),
      );
      expect(ctx.ellipse).toHaveBeenCalledWith(50, 60, 40, 20, Math.PI / 2, 0, Math.PI, true);
    });

    it('ground-rect forwards x, y, w, h, r to ctx.roundRect', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'ground-rect', 10, 20, 100, 50, 8);
      expect(ctx.roundRect).toHaveBeenCalledWith(10, 20, 100, 50, 8);
    });

    it('gline-dash forwards segments to ctx.setLineDash', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gline-dash', 5, 3);
      expect(ctx.setLineDash).toHaveBeenCalledWith([5, 3]);
    });

    it('gline-dash with no arguments clears the dash pattern', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gline-dash');
      expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    });

    it('gline-dash-offset and gmiter-limit write their properties', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gline-dash-offset', 4);
      call(plugin, 'gmiter-limit', 3);
      expect(ctx.lineDashOffset).toBe(4);
      expect(ctx.miterLimit).toBe(3);
    });

    it('gclip forwards to ctx.clip', () => {
      const { plugin, ctx } = openPlugin();
      expect(call(plugin, 'gclip')).toBe(InterpretedSymbol.of('t'));
      expect(ctx.clip).toHaveBeenCalledTimes(1);
    });

    it('gis-point-in-path returns t when the context reports a hit', () => {
      const { plugin, ctx } = openPlugin();
      expect(call(plugin, 'gis-point-in-path', 5, 5)).toBe(InterpretedSymbol.of('t'));
      expect(ctx.isPointInPath).toHaveBeenCalledWith(5, 5);
    });

    it('gis-point-in-stroke returns nil when the context reports a miss', () => {
      const { plugin } = openPlugin();
      expect(call(plugin, 'gis-point-in-stroke', 5, 5)).toBe(Cons.nil);
    });

    it('gtransform / gset-transform / greset-transform forward matrices', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gtransform', 1, 0, 0, 1, 10, 20);
      call(plugin, 'gset-transform', 2, 0, 0, 2, 0, 0);
      call(plugin, 'greset-transform');
      expect(ctx.transform).toHaveBeenCalledWith(1, 0, 0, 1, 10, 20);
      expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
      expect(ctx.resetTransform).toHaveBeenCalledTimes(1);
    });

    it('gcomposite and gfilter write their properties', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gcomposite', 'multiply');
      call(plugin, 'gfilter', 'blur(2px)');
      expect(ctx.globalCompositeOperation).toBe('multiply');
      expect(ctx.filter).toBe('blur(2px)');
    });

    it('gimage-smoothing "off" disables smoothing', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gimage-smoothing', 'off');
      expect(ctx.imageSmoothingEnabled).toBe(false);
    });

    it('gimage-smoothing "high" enables smoothing and sets quality', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gimage-smoothing', 'high');
      expect(ctx.imageSmoothingEnabled).toBe(true);
      expect(ctx.imageSmoothingQuality).toBe('high');
    });

    it('gimage-smoothing rejects an unknown keyword', () => {
      const { plugin } = openPlugin();
      expect(call(plugin, 'gimage-smoothing', 'bogus')).toBe(Cons.nil);
    });

    it('gmeasure-text returns the measured width as a number', () => {
      const { plugin, ctx } = openPlugin();
      expect(call(plugin, 'gmeasure-text', 'hello')).toBe(42);
      expect(ctx.measureText).toHaveBeenCalledWith('hello');
    });

    it('text style setters write their properties', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gletter-spacing', '2px');
      call(plugin, 'gword-spacing', '4px');
      call(plugin, 'gfont-kerning', 'none');
      call(plugin, 'gfont-stretch', 'condensed');
      call(plugin, 'gfont-variant', 'small-caps');
      call(plugin, 'gtext-rendering', 'geometricPrecision');
      expect(ctx.letterSpacing).toBe('2px');
      expect(ctx.wordSpacing).toBe('4px');
      expect(ctx.fontKerning).toBe('none');
      expect(ctx.fontStretch).toBe('condensed');
      expect(ctx.fontVariantCaps).toBe('small-caps');
      expect(ctx.textRendering).toBe('geometricPrecision');
    });

    it('gclear-rect forwards to ctx.clearRect', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gclear-rect', 1, 2, 3, 4);
      expect(ctx.clearRect).toHaveBeenCalledWith(1, 2, 3, 4);
    });

    it('greset forwards to ctx.reset', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'greset');
      expect(ctx.reset).toHaveBeenCalledTimes(1);
    });

    it('gwidth and gheight return the canvas dimensions', () => {
      const { plugin } = openPlugin();
      expect(call(plugin, 'gwidth')).toBe(800);
      expect(call(plugin, 'gheight')).toBe(600);
    });

    it('gpixel returns an (r g b a) list', () => {
      const { plugin, ctx } = openPlugin();
      const result = call(plugin, 'gpixel', 3, 4);
      expect(ctx.getImageData).toHaveBeenCalledWith(3, 4, 1, 1);
      expect(Cons.toString(result as Cons)).toBe('(10 20 30 255)');
    });

    it('gset-pixel writes a 1x1 ImageData at the given position', () => {
      const { plugin, ctx } = openPlugin();
      expect(call(plugin, 'gset-pixel', 3, 4, 255, 0, 0, 255)).toBe(InterpretedSymbol.of('t'));
      expect(ctx.putImageData).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Uint8ClampedArray) as Uint8ClampedArray }),
        3,
        4,
      );
    });

    it('glinear-gradient adds all stops and sets both styles', () => {
      const { plugin, ctx } = openPlugin();
      const gradient = { addColorStop: vi.fn() };
      ctx.createLinearGradient.mockReturnValue(gradient);
      expect(call(plugin, 'glinear-gradient', 0, 0, 100, 0, 0, 'red', 1, 'blue')).toBe(
        InterpretedSymbol.of('t'),
      );
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 100, 0);
      expect(gradient.addColorStop.mock.calls).toEqual([
        [0, 'red'],
        [1, 'blue'],
      ]);
      expect(ctx.fillStyle).toBe(gradient);
      expect(ctx.strokeStyle).toBe(gradient);
    });

    it('glinear-gradient rejects an odd number of stop values', () => {
      const { plugin } = openPlugin();
      expect(call(plugin, 'glinear-gradient', 0, 0, 100, 0, 0, 'red', 1)).toBe(Cons.nil);
    });

    it('gradial-gradient forwards both circles', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gradial-gradient', 50, 50, 0, 50, 50, 40, 0, 'red', 1, 'blue');
      expect(ctx.createRadialGradient).toHaveBeenCalledWith(50, 50, 0, 50, 50, 40);
    });

    it('gconic-gradient converts the start angle from degrees', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gconic-gradient', 90, 50, 50, 0, 'red', 1, 'blue');
      expect(ctx.createConicGradient).toHaveBeenCalledWith(Math.PI / 2, 50, 50);
    });

    it('gfill-text accepts an optional maxWidth fourth argument', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gfill-text', 'hi', 5, 15, 100);
      expect(ctx.fillText).toHaveBeenCalledWith('hi', 5, 15, 100);
    });

    it('gstroke-text accepts an optional maxWidth fourth argument', () => {
      const { plugin, ctx } = openPlugin();
      call(plugin, 'gstroke-text', 'hi', 5, 15, 100);
      expect(ctx.strokeText).toHaveBeenCalledWith('hi', 5, 15, 100);
    });
  });

  describe('API design cleanups (#32)', () => {
    it('gtext-direction is the primary name and gtext-dire still works as an alias', () => {
      const { plugin, ctx } = openPlugin();
      expect(call(plugin, 'gtext-direction', 'rtl')).toBe(InterpretedSymbol.of('t'));
      expect(ctx.direction).toBe('rtl');
      expect(call(plugin, 'gtext-dire', 'ltr')).toBe(InterpretedSymbol.of('t'));
      expect(ctx.direction).toBe('ltr');
    });

    it('gtext-baseline is the primary name and gtext-line still works as an alias', () => {
      const { plugin, ctx } = openPlugin();
      expect(call(plugin, 'gtext-baseline', 'middle')).toBe(InterpretedSymbol.of('t'));
      expect(ctx.textBaseline).toBe('middle');
      expect(call(plugin, 'gtext-line', 'top')).toBe(InterpretedSymbol.of('t'));
      expect(ctx.textBaseline).toBe('top');
    });

    it('gpattern accepts a string repetition keyword', () => {
      const { plugin } = openPlugin();
      expect(call(plugin, 'gpattern', 'https://example.test/p.png', 'repeat-x')).toBe(
        InterpretedSymbol.of('t'),
      );
    });

    it('gpattern rejects the legacy numeric repetition flag', () => {
      const { plugin } = openPlugin();
      expect(call(plugin, 'gpattern', 'https://example.test/p.png', 1)).toBe(Cons.nil);
    });

    const invalidEnumCases: Array<{ name: string; args: LispValue[] }> = [
      { name: 'gline-cap', args: ['bogus'] },
      { name: 'gline-join', args: ['bogus'] },
      { name: 'gtext-align', args: ['bogus'] },
      { name: 'gtext-baseline', args: ['bogus'] },
      { name: 'gtext-direction', args: ['bogus'] },
      { name: 'gcomposite', args: ['bogus'] },
      { name: 'gfont-kerning', args: ['bogus'] },
      { name: 'gfont-stretch', args: ['bogus'] },
      { name: 'gfont-variant', args: ['bogus'] },
      { name: 'gtext-rendering', args: ['bogus'] },
      { name: 'gpattern', args: ['src', 'bogus'] },
    ];

    it.each(invalidEnumCases)('$name rejects a value outside the allowlist', ({ name, args }) => {
      const { plugin } = openPlugin();
      expect(call(plugin, name, ...args)).toBe(Cons.nil);
    });
  });

  describe('error paths', () => {
    describe('closed canvas', () => {
      const closedSymbols = GraphicsPlugin.functionNames().filter((name) => name !== 'gopen');

      it.each(closedSymbols)('%s returns nil when the canvas is closed', (name) => {
        const { plugin } = makePlugin();
        const result = plugin.apply(InterpretedSymbol.of(name), Cons.nil, makeContext());
        expect(result).toBe(Cons.nil);
      });
    });

    describe('type mismatch', () => {
      const typeMismatchCases: Array<{ name: string; args: LispValue[] }> = [
        { name: 'galpha', args: ['x'] },
        { name: 'garc', args: [1, 2, 3, 4, 5, 'x'] },
        { name: 'garc-to', args: [1, 2, 3, 4, 'x'] },
        { name: 'gbezcurve-to', args: [1, 2, 3, 4, 5, 'x'] },
        { name: 'gfill-rect', args: [1, 2, 3, 'x'] },
        { name: 'gfill-text', args: [42, 1, 2] },
        { name: 'gfill-tri', args: [1, 2, 3, 4, 5, 'x'] },
        { name: 'gimage', args: [42, 1, 2] },
        { name: 'gmove-to', args: [1, 'x'] },
        { name: 'gline-to', args: [1, 'x'] },
        { name: 'gline-cap', args: [1] },
        { name: 'gline-join', args: [1] },
        { name: 'gline-width', args: ['x'] },
        { name: 'gpattern', args: [1, 2] },
        { name: 'gquadcurve-to', args: [1, 2, 3, 'x'] },
        { name: 'gsave-jpeg', args: [1] },
        { name: 'gsave-png', args: [1] },
        { name: 'gscale', args: [1, 'x'] },
        { name: 'gshadow-blur', args: ['x'] },
        { name: 'gshadow-offsetx', args: ['x'] },
        { name: 'gshadow-offsety', args: ['x'] },
        { name: 'gsleep', args: ['x'] },
        { name: 'gstroke-rect', args: [1, 2, 3, 'x'] },
        { name: 'gstroke-text', args: [42, 1, 2] },
        { name: 'gstroke-tri', args: [1, 2, 3, 4, 5, 'x'] },
        { name: 'gtext-align', args: [1] },
        { name: 'gtext-dire', args: [1] },
        { name: 'gtext-font', args: [1] },
        { name: 'gtext-line', args: [1] },
        { name: 'gtranslate', args: [1, 'x'] },
        { name: 'grect', args: [1, 2, 3, 'x'] },
        { name: 'grotate', args: ['x'] },
        { name: 'gellipse', args: [1, 2, 3, 4, 5, 6, 7, 'x'] },
        { name: 'ground-rect', args: [1, 2, 3, 4, 'x'] },
        { name: 'gline-dash', args: ['x'] },
        { name: 'gline-dash-offset', args: ['x'] },
        { name: 'gmiter-limit', args: ['x'] },
        { name: 'gis-point-in-path', args: [1, 'x'] },
        { name: 'gis-point-in-stroke', args: [1, 'x'] },
        { name: 'gtransform', args: [1, 2, 3, 4, 5, 'x'] },
        { name: 'gset-transform', args: [1, 2, 3, 4, 5, 'x'] },
        { name: 'gcomposite', args: [1] },
        { name: 'gfilter', args: [1] },
        { name: 'gimage-smoothing', args: [1] },
        { name: 'gmeasure-text', args: [1] },
        { name: 'gletter-spacing', args: [1] },
        { name: 'gword-spacing', args: [1] },
        { name: 'gfont-kerning', args: [1] },
        { name: 'gfont-stretch', args: [1] },
        { name: 'gfont-variant', args: [1] },
        { name: 'gtext-rendering', args: [1] },
        { name: 'gclear-rect', args: [1, 2, 3, 'x'] },
        { name: 'gpixel', args: [1, 'x'] },
        { name: 'gset-pixel', args: [1, 2, 3, 4, 5, 'x'] },
        { name: 'glinear-gradient', args: ['x', 0, 100, 0, 0, 'red', 1, 'blue'] },
        { name: 'gradial-gradient', args: ['x', 0, 0, 0, 0, 40, 0, 'red', 1, 'blue'] },
        { name: 'gconic-gradient', args: ['x', 0, 0, 0, 'red', 1, 'blue'] },
        { name: 'gfill-text', args: ['a', 1, 2, 'x'] },
        { name: 'gstroke-text', args: ['a', 1, 2, 'x'] },
      ];

      it.each(typeMismatchCases)(
        '$name returns nil for a type-mismatched argument',
        ({ name, args }) => {
          const { plugin } = makePlugin();
          plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
          const result = plugin.apply(
            InterpretedSymbol.of(name),
            arguments_(...args),
            makeContext(),
          );
          expect(result).toBe(Cons.nil);
        },
      );
    });

    describe('wrong arity', () => {
      const arityCases: Array<{ name: string; args: LispValue[] }> = [
        { name: 'galpha', args: [0.5, 0.5] },
        { name: 'garc', args: [1, 2, 3, 4, 5] },
        { name: 'garc-to', args: [1, 2, 3, 4] },
        { name: 'gbezcurve-to', args: [1, 2, 3, 4, 5] },
        { name: 'gcolor', args: [] },
        { name: 'gfill-color', args: [] },
        { name: 'gfill-rect', args: [1, 2, 3] },
        { name: 'gfill-text', args: ['a', 1] },
        { name: 'gfill-tri', args: [1, 2, 3, 4, 5] },
        { name: 'gimage', args: ['src', 1] },
        { name: 'gmove-to', args: [1] },
        { name: 'gline-to', args: [1] },
        { name: 'gline-cap', args: ['butt', 'round'] },
        { name: 'gline-join', args: ['miter', 'bevel'] },
        { name: 'gline-width', args: [1, 2] },
        { name: 'gpattern', args: ['src'] },
        { name: 'gquadcurve-to', args: [1, 2, 3] },
        { name: 'gsave-jpeg', args: ['a', 'b'] },
        { name: 'gsave-png', args: ['a', 'b'] },
        { name: 'gscale', args: [1] },
        { name: 'gshadow-blur', args: [1, 2] },
        { name: 'gshadow-color', args: [] },
        { name: 'gshadow-offsetx', args: [1, 2] },
        { name: 'gshadow-offsety', args: [1, 2] },
        { name: 'gsleep', args: [] },
        { name: 'gstroke-color', args: [] },
        { name: 'gstroke-rect', args: [1, 2, 3] },
        { name: 'gstroke-text', args: ['a', 1] },
        { name: 'gstroke-tri', args: [1, 2, 3, 4, 5] },
        { name: 'gtext-align', args: ['left', 'right'] },
        { name: 'gtext-dire', args: ['ltr', 'rtl'] },
        { name: 'gtext-font', args: ['a', 'b'] },
        { name: 'gtext-line', args: ['top', 'middle'] },
        { name: 'gtranslate', args: [1] },
        { name: 'grect', args: [1, 2, 3] },
        { name: 'grotate', args: [1, 2] },
        { name: 'gellipse', args: [1, 2, 3, 4, 5, 6, 7] },
        { name: 'ground-rect', args: [1, 2, 3, 4] },
        { name: 'gline-dash-offset', args: [1, 2] },
        { name: 'gmiter-limit', args: [1, 2] },
        { name: 'gis-point-in-path', args: [1] },
        { name: 'gis-point-in-stroke', args: [1] },
        { name: 'gtransform', args: [1, 2, 3, 4, 5] },
        { name: 'gset-transform', args: [1, 2, 3, 4, 5] },
        { name: 'gcomposite', args: ['multiply', 'screen'] },
        { name: 'gfilter', args: [] },
        { name: 'gimage-smoothing', args: [] },
        { name: 'gmeasure-text', args: [] },
        { name: 'gletter-spacing', args: ['1px', '2px'] },
        { name: 'gclear-rect', args: [1, 2, 3] },
        { name: 'gpixel', args: [1] },
        { name: 'gset-pixel', args: [1, 2, 3, 4, 5] },
        { name: 'glinear-gradient', args: [0, 0, 100, 0] },
        { name: 'gradial-gradient', args: [0, 0, 0, 0, 0, 40] },
        { name: 'gconic-gradient', args: [0, 0, 0] },
      ];

      it.each(arityCases)('$name returns nil for a wrong argument count', ({ name, args }) => {
        const { plugin } = makePlugin();
        plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
        const result = plugin.apply(InterpretedSymbol.of(name), arguments_(...args), makeContext());
        expect(result).toBe(Cons.nil);
      });
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
        makeFakeContext() as unknown as CanvasRenderingContext2D,
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

describe('createGraphicsPlugin', () => {
  it('returns a GraphicsPlugin bound to the provided canvas', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(
      makeFakeContext() as unknown as CanvasRenderingContext2D,
    );
    const plugin = createGraphicsPlugin({ canvas });
    expect(plugin).toBeInstanceOf(GraphicsPlugin);
    expect(plugin.canvas).toBe(canvas);
  });

  it('produces a plugin that responds to gopen', () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(
      makeFakeContext() as unknown as CanvasRenderingContext2D,
    );
    const plugin = createGraphicsPlugin({ canvas });
    const result = plugin.apply(InterpretedSymbol.of('gopen'), Cons.nil, makeContext());
    expect(result).toBe(InterpretedSymbol.of('t'));
  });
});
