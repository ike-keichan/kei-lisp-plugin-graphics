import { describe, expect, it, vi } from 'vitest';

import { LispInterpreter } from 'kei-lisp';

import { createGraphicsPlugin } from './index.js';

type FakeContext = {
  fillStyle: string;
  strokeStyle: string;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
};

/**
 * Builds a stub 2D context covering the members the bundled patterns touch.
 */
function makeFakeContext(): FakeContext {
  return {
    fillStyle: '',
    strokeStyle: '',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
  };
}

/**
 * Creates an interpreter with the graphics plugin on an opened fake canvas.
 * The bundled pattern files are loaded from the repository's lisp/ directory
 * (vitest runs with the repository root as the working directory).
 */
function makeInterpreter(): { interpreter: LispInterpreter; ctx: FakeContext } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const context = makeFakeContext();
  vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const interpreter = new LispInterpreter();
  interpreter.use(createGraphicsPlugin({ canvas }));
  interpreter.evalString('(gopen)');
  context.fillRect.mockClear();
  return { interpreter, ctx: context };
}

describe('bundled Lisp patterns (lisp/)', () => {
  describe('grid.lisp', () => {
    it('loads and returns t', () => {
      const { interpreter } = makeInterpreter();
      expect(String(interpreter.evalString('(load "lisp/grid.lisp")'))).toBe('t');
    });

    it('ggrid strokes vertical and horizontal lines every STEP pixels', () => {
      const { interpreter, ctx } = makeInterpreter();
      interpreter.evalString('(load "lisp/grid.lisp")');
      expect(String(interpreter.evalString('(ggrid 200)'))).toBe('t');
      // 800x600 canvas, step 200: verticals at x=200/400/600, horizontals at y=200/400.
      expect(ctx.moveTo.mock.calls).toEqual([
        [200, 0],
        [400, 0],
        [600, 0],
        [0, 200],
        [0, 400],
      ]);
      expect(ctx.lineTo.mock.calls).toEqual([
        [200, 600],
        [400, 600],
        [600, 600],
        [800, 200],
        [800, 400],
      ]);
      expect(ctx.stroke).toHaveBeenCalledTimes(5);
    });
  });

  describe('palette.lisp', () => {
    it('gpalette returns the 0-based palette entry and wraps around', () => {
      const { interpreter } = makeInterpreter();
      interpreter.evalString('(load "lisp/palette.lisp")');
      expect(interpreter.evalString('(gpalette 0)')).toBe('#4e79a7');
      expect(interpreter.evalString('(gpalette 7)')).toBe('#9c755f');
      expect(interpreter.evalString('(gpalette 8)')).toBe('#4e79a7');
    });

    it('gpalette-color sets fill and stroke color to the palette entry', () => {
      const { interpreter, ctx } = makeInterpreter();
      interpreter.evalString('(load "lisp/palette.lisp")');
      expect(String(interpreter.evalString('(gpalette-color 1)'))).toBe('t');
      expect(ctx.fillStyle).toBe('#f28e2b');
      expect(ctx.strokeStyle).toBe('#f28e2b');
    });
  });

  describe('animation.lisp', () => {
    it('ganimate calls the draw function once per frame with the frame index', () => {
      const { interpreter, ctx } = makeInterpreter();
      interpreter.evalString('(load "lisp/animation.lisp")');
      expect(
        String(interpreter.evalString('(ganimate 3 1 (lambda (frame) (gfill-rect frame 0 1 1)))')),
      ).toBe('t');
      expect(ctx.fillRect.mock.calls).toEqual([
        [0, 0, 1, 1],
        [1, 0, 1, 1],
        [2, 0, 1, 1],
      ]);
    });
  });
});
