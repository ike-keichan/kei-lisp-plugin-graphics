import type { KeiLispPlugin } from 'kei-lisp';

import { GraphicsPlugin } from './GraphicsPlugin/index.js';

/**
 * Creates a Canvas2D drawing plugin bound to the given canvas. Register it on
 * a `LispInterpreter` via `interpreter.use(plugin)` to make the `g…` drawing
 * primitives callable from Lisp source.
 * @param options.canvas the canvas surface to draw to
 * @return a KeiLispPlugin that handles the `g…` symbols
 */
export function createGraphicsPlugin(options: {
  canvas: HTMLCanvasElement | OffscreenCanvas;
}): KeiLispPlugin {
  return new GraphicsPlugin(options.canvas);
}

export { GraphicsPlugin } from './GraphicsPlugin/index.js';
