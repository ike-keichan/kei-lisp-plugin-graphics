import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { Cons, InterpretedSymbol, LispInterpreter } from 'kei-lisp';

import { createGraphicsPlugin } from './index.js';

// Integration test against a real Canvas 2D implementation (@napi-rs/canvas,
// a prebuilt native module). Skipped when the module cannot be loaded on the
// current platform so the suite stays green on unsupported targets.
let createCanvas: ((width: number, height: number) => unknown) | undefined;
try {
  ({ createCanvas } = await import('@napi-rs/canvas'));
} catch {
  createCanvas = undefined;
}

/**
 * Builds a Lisp interpreter wired to a real @napi-rs/canvas canvas.
 */
function makeRealInterpreter(width: number, height: number): LispInterpreter {
  if (createCanvas === undefined) throw new Error('unreachable: guarded by skipIf');
  const canvas = createCanvas(width, height) as HTMLCanvasElement;
  const interpreter = new LispInterpreter();
  interpreter.use(createGraphicsPlugin({ canvas }));
  return interpreter;
}

describe.skipIf(createCanvas === undefined)('integration with @napi-rs/canvas', () => {
  it('writes a real PNG file via (gsave-png path)', () => {
    const interpreter = makeRealInterpreter(100, 80);
    const directory = mkdtempSync(path.join(tmpdir(), 'graphics-node-canvas-'));
    const filePath = path.join(directory, 'out.png');
    try {
      interpreter.evalString('(gopen) (gfill-color "steelblue") (gfill-rect 10 10 50 40)');
      const result = interpreter.evalString(`(gsave-png "${filePath}")`);
      expect(result).toBe(InterpretedSymbol.of('t'));
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- reads back the temp file this test created
      const bytes = readFileSync(filePath);
      const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(bytes.subarray(0, 8).equals(pngMagic)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('really draws: gpixel reads back what gfill-rect painted', () => {
    const interpreter = makeRealInterpreter(20, 20);
    interpreter.evalString('(gopen) (gfill-color 255 0 0) (gfill-rect 0 0 20 20)');
    const pixel = interpreter.evalString('(gpixel 10 10)');
    expect(Cons.toString(pixel as Cons)).toBe('(255 0 0 255)');
  });

  it('round-trips a single pixel via gset-pixel / gpixel', () => {
    const interpreter = makeRealInterpreter(10, 10);
    interpreter.evalString('(gopen) (gset-pixel 3 4 12 34 56 255)');
    const pixel = interpreter.evalString('(gpixel 3 4)');
    expect(Cons.toString(pixel as Cons)).toBe('(12 34 56 255)');
  });

  it('gmeasure-text returns a positive width from a real context', () => {
    const interpreter = makeRealInterpreter(100, 30);
    interpreter.evalString('(gopen) (gtext-font "16px sans-serif")');
    const width = interpreter.evalString('(gmeasure-text "hello")');
    expect(typeof width).toBe('number');
    expect(width as number).toBeGreaterThan(0);
  });
});
