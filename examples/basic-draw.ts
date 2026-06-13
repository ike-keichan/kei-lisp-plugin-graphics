/**
 * @file
 * Minimal browser usage of `kei-lisp-plugin-graphics`. Drop this into a
 * bundled web page that contains a `<canvas id="stage" width="400"
 * height="300"></canvas>` element to render the demo composition.
 *
 * Bundle with your tool of choice, e.g.:
 *   pnpm exec tsx --target es2022 examples/basic-draw.ts > demo.js
 * then load `demo.js` from an HTML page in a browser.
 *
 * This file is type-checked but not directly runnable under tsx because
 * it touches `document`, which is not available in a Node CLI.
 */
import { LispInterpreter } from 'kei-lisp';

import { createGraphicsPlugin } from '../src/index.js';

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
if (canvas === null) {
  throw new Error('No <canvas id="stage"> element found.');
}

const interpreter = new LispInterpreter();
interpreter.use(createGraphicsPlugin({ canvas }));

interpreter.evalString(`
  (gopen)

  ;; A filled rectangle with a black outline.
  (gfill-color "tomato")
  (gfill-rect 20 20 120 80)
  (gstroke-color "black")
  (gline-width 2)
  (gstroke-rect 20 20 120 80)

  ;; A blue circle next to it.
  (gfill-color 32 96 240)
  (gstart-path)
  (garc 220 60 40 0 360 1)
  (gfinish-path)
  (gfill)

  ;; Centered text.
  (gfill-color "black")
  (gtext-font "20px sans-serif")
  (gtext-align "center")
  (gfill-text "Hello, kei-lisp!" 200 180)
`);
