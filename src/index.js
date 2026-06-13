import { GraphicsPlugin } from './GraphicsPlugin/index.js';

/**
 * Creates a Canvas2D drawing plugin bound to the given canvas. Register it on
 * a `LispInterpreter` via `interpreter.use(plugin)` to make the `g…` drawing
 * primitives callable from Lisp source.
 * @param {{ canvas: HTMLCanvasElement | OffscreenCanvas }} options - the canvas to draw to
 * @return {GraphicsPlugin} a KeiLispPlugin that handles the `g…` symbols
 */
export function createGraphicsPlugin(options) {
  return new GraphicsPlugin(options.canvas);
}

export { GraphicsPlugin } from './GraphicsPlugin/index.js';
