/**
 * @file
 * Basic Canvas2D drawing from Lisp source: rectangles, a circle, a triangle,
 * text, and transforms, plus a `gsave-png` download button.
 *
 * Run with:
 *   pnpm build && pnpm exec vite examples
 * then open the printed URL (default http://localhost:5173) in a browser.
 */
import { LispInterpreter } from 'kei-lisp';

// Resolved via the package.json self-reference to the built bundle in dist/,
// exactly as it would be imported in your own project.
import { createGraphicsPlugin } from 'kei-lisp-plugin-graphics';

// kei-lisp and this plugin write diagnostics to process.stdout /
// process.stderr (a Node.js convention). Plain browsers have no `process`,
// so install a minimal console-backed shim before evaluating any Lisp.
type StreamShim = { write: (chunk: string) => boolean };
type ProcessShim = { stdout: StreamShim; stderr: StreamShim };
const consoleStream: StreamShim = {
  write: (chunk) => {
    console.log(chunk.replace(/\n$/, ''));
    return true;
  },
};
// eslint-disable-next-line unicorn/no-global-object-property-assignment -- the process shim must be global for kei-lisp to find it
(globalThis as { process?: ProcessShim }).process ??= {
  stdout: consoleStream,
  stderr: consoleStream,
};

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
const saveButton = document.querySelector<HTMLButtonElement>('#save');
if (canvas === null || saveButton === null) {
  throw new Error('index.html must provide #stage and #save elements');
}

const interpreter = new LispInterpreter();
interpreter.use(createGraphicsPlugin({ canvas }));

interpreter.evalString(`
  (gopen)

  ; Rectangles — fill and stroke styles are set independently.
  (gfill-color "steelblue")
  (gfill-rect 40 40 200 120)
  (gstroke-color "navy")
  (gline-width 4)
  (gline-join "round")
  (gstroke-rect 40 40 200 120)

  ; Circle — arc angles are in degrees.
  (gfill-color 255 160 80)
  (gstart-path)
  (garc 400 100 60 0 360 1)
  (gfill)
  (gstroke)

  ; Triangle.
  (gfill-color 120 200 120 0.8)
  (gfill-tri 520 40 620 160 480 160)

  ; Text.
  (gcolor "black")
  (gtext-font "28px sans-serif")
  (gtext-align "left")
  (gfill-text "Hello, kei-lisp!" 40 230)

  ; Transforms — wrap in gsave / grestore to keep them local.
  (gsave)
  (gtranslate 320 300)
  (grotate -10)
  (gfill-color "crimson")
  (gfill-rect -60 -20 120 40)
  (grestore)
`);

// gsave-png with no arguments triggers a browser download of the canvas.
saveButton.addEventListener('click', () => {
  interpreter.evalString('(gsave-png)');
});
