# Graphics Reference

All `g…` Lisp functions exposed by `kei-lisp-plugin-graphics`. Each function
returns the symbol `t` on success — except the value-returning functions
(`gwidth`, `gheight`, `gmeasure-text`, `gpixel`, `gis-point-in-path`,
`gis-point-in-stroke`), which return their documented value.

Failures (wrong arity, type mismatch, canvas not open, canvas-level errors)
signal an **evaluation error** that Lisp callers can intercept with
`handler-case`; the clause variable is bound to the error message:

```lisp
(gopen)
(handler-case (gfill-rect 10)
  (eval-error (e) e))            ; => "Can not draw fill rectangle."
```

An unhandled error aborts evaluation and is reported at the interpreter
boundary (the REPL prints it; library callers catch it as a kei-lisp
`EvalError`). One deliberate exception: the color-taking functions
(`gcolor`, `gfill-color`, `gstroke-color`, `gshadow-color`, `gclear`)
parse their color best-effort. Given at least one argument, a malformed
color _shape_ (an unsupported component count, or non-numbers in an
RGB/RGBA tuple) prints a diagnostic and falls back to `"black"` instead
of signaling, and a color _string_ is passed to the canvas as-is (the
canvas silently ignores invalid strings and keeps the previous color).
Calling them with no arguments signals as usual — except `gclear`,
whose no-argument form paints the canvas white.

Numeric arguments accept any kei-lisp v3 number — integer, float, or exact
rational (e.g. the result of `(/ 5 2)`) — and are converted to floats before
they reach the Canvas API. Value-returning functions follow the v3 numeric
tower: `gwidth` / `gheight` / `gpixel` return exact integers
(`(integerp (gwidth))` → `t`), while `gmeasure-text` returns a float.

Enum-string setters (`gline-cap`, `gline-join`, `gtext-align`,
`gtext-baseline`, `gtext-direction`, `gcomposite`, `gfont-kerning`,
`gfont-stretch`, `gfont-variant`, `gtext-rendering`, `gimage-smoothing`, and
`gpattern`'s repetition) validate their argument against the Canvas API's
allowed values and signal an error listing the expected values for anything
else.

Diagnostics from asynchronous work — image loading (`gimage` /
`gpattern`) and `OffscreenCanvas` file writes, which fail after the call has
already returned — plus the best-effort color fallback above and `gopen`'s
informational size line go to `process.stderr` (kei-lisp convention);
browser hosts typically redirect this to their output panel.

## Lifecycle

| Function  | Arguments    | Description                                                                                                        |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `gopen`   | —            | Open the canvas (validate the 2D context, paint it white, set `isOpen` to true)                                    |
| `gclose`  | —            | Close the canvas (clears it to transparent)                                                                        |
| `gclear`  | — or `color` | Paint the entire canvas white, or with the given color (string / RGB / RGBA); the current `fillStyle` is preserved |
| `greset`  | —            | Reset the context to its default state (`ctx.reset`)                                                               |
| `gwidth`  | —            | Return the canvas width in pixels (integer)                                                                        |
| `gheight` | —            | Return the canvas height in pixels (integer)                                                                       |
| `gsleep`  | `ms: number` | Pause execution for `ms` milliseconds (busy-wait: blocks the thread and burns CPU — avoid long sleeps)             |

## Path

| Function              | Arguments                                                                                                 | Description                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `gstart-path`         | —                                                                                                         | Begin a new path (`beginPath`)                                      |
| `gfinish-path`        | —                                                                                                         | Close the current path (`closePath`)                                |
| `gmove-to`            | `x: number, y: number`                                                                                    | Move the pen to (`x`, `y`)                                          |
| `gline-to`            | `x: number, y: number`                                                                                    | Draw a line from the current point to (`x`, `y`)                    |
| `gquadcurve-to`       | `cpx: number, cpy: number, x: number, y: number`                                                          | Quadratic Bézier curve                                              |
| `gbezcurve-to`        | `cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number`                            | Cubic Bézier curve                                                  |
| `garc`                | `x: number, y: number, r: number, start: number, end: number, ccw: number`                                | Arc; `start` / `end` in degrees, `ccw >= 0` draws counter-clockwise |
| `garc-to`             | `x1: number, y1: number, x2: number, y2: number, r: number`                                               | Arc with two tangent points                                         |
| `grect`               | `x: number, y: number, w: number, h: number`                                                              | Rectangle path                                                      |
| `ground-rect`         | `x: number, y: number, w: number, h: number, r: number`                                                   | Rounded-rectangle path (`roundRect`)                                |
| `gellipse`            | `x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number, ccw: number` | Ellipse path; angles in degrees, `ccw >= 0` draws counter-clockwise |
| `gclip`               | —                                                                                                         | Clip subsequent drawing to the current path (`clip`)                |
| `gis-point-in-path`   | `x: number, y: number`                                                                                    | Return `t` when the point is inside the current path                |
| `gis-point-in-stroke` | `x: number, y: number`                                                                                    | Return `t` when the point is on the current path's stroke           |

## Fill / Stroke

| Function       | Arguments                                                                | Description               |
| -------------- | ------------------------------------------------------------------------ | ------------------------- |
| `gfill`        | —                                                                        | Fill the current path     |
| `gstroke`      | —                                                                        | Stroke the current path   |
| `gfill-rect`   | `x: number, y: number, w: number, h: number`                             | Fill a rectangle          |
| `gstroke-rect` | `x: number, y: number, w: number, h: number`                             | Stroke a rectangle        |
| `gfill-tri`    | `x1: number, y1: number, x2: number, y2: number, x3: number, y3: number` | Fill a triangle           |
| `gstroke-tri`  | `x1: number, y1: number, x2: number, y2: number, x3: number, y3: number` | Stroke a triangle         |
| `gfill-text`   | `text: string, x: number, y: number`                                     | Fill text at (`x`, `y`)   |
| `gstroke-text` | `text: string, x: number, y: number`                                     | Stroke text at (`x`, `y`) |

## Style

| Function            | Arguments                                                      | Description                                                                                   |
| ------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `gcolor`            | `color: string` or `r, g, b[, a]: number`                      | Set both fill and stroke color (string / RGB / RGBA)                                          |
| `gfill-color`       | `color: string` or `r, g, b[, a]: number`                      | Set fill color (`fillStyle`)                                                                  |
| `gstroke-color`     | `color: string` or `r, g, b[, a]: number`                      | Set stroke color (`strokeStyle`)                                                              |
| `gline-width`       | `width: number`                                                | Set line width                                                                                |
| `gline-cap`         | `cap: string`                                                  | Set line cap (`"butt"` / `"round"` / `"square"`)                                              |
| `gline-join`        | `join: string`                                                 | Set line join (`"miter"` / `"round"` / `"bevel"`)                                             |
| `galpha`            | `alpha: number`                                                | Set global alpha (0.0–1.0)                                                                    |
| `gpattern`          | `src: string, repetition: string`                              | Set fill style to an image pattern (`"repeat"` / `"repeat-x"` / `"repeat-y"` / `"no-repeat"`) |
| `gline-dash`        | `seg1: number, seg2: number, ...`                              | Set the line dash pattern (`setLineDash`); no arguments clears it                             |
| `gline-dash-offset` | `offset: number`                                               | Set the dash offset (`lineDashOffset`)                                                        |
| `gmiter-limit`      | `limit: number`                                                | Set the miter limit (`miterLimit`)                                                            |
| `gcomposite`        | `op: string`                                                   | Set the compositing operation (`globalCompositeOperation`, e.g. `"multiply"`)                 |
| `gfilter`           | `filter: string`                                               | Set the CSS filter (`ctx.filter`, e.g. `"blur(2px)"`)                                         |
| `gimage-smoothing`  | `quality: string`                                              | `"off"` disables smoothing; `"low"` / `"medium"` / `"high"` enable it at that quality         |
| `glinear-gradient`  | `x0, y0, x1, y1, offset1: number, color1: string, ...`         | Set fill and stroke style to a linear gradient (≥ 1 offset/color pair)                        |
| `gradial-gradient`  | `x0, y0, r0, x1, y1, r1, offset1: number, color1: string, ...` | Set fill and stroke style to a radial gradient                                                |
| `gconic-gradient`   | `angle: number, x, y, offset1: number, color1: string, ...`    | Set fill and stroke style to a conic gradient; `angle` in degrees                             |

## Shadow

| Function          | Arguments                                 | Description                            |
| ----------------- | ----------------------------------------- | -------------------------------------- |
| `gshadow-color`   | `color: string` or `r, g, b[, a]: number` | Set shadow color (string / RGB / RGBA) |
| `gshadow-blur`    | `blur: number`                            | Set shadow blur radius                 |
| `gshadow-offsetx` | `x: number`                               | Set shadow X offset                    |
| `gshadow-offsety` | `y: number`                               | Set shadow Y offset                    |

## Text

| Function          | Arguments           | Description                                                                                            |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| `gtext-font`      | `font: string`      | Set the font string (e.g. `"16px sans-serif"`)                                                         |
| `gtext-align`     | `align: string`     | Set text alignment (`"left"` / `"center"` / `"right"` / ...)                                           |
| `gtext-baseline`  | `baseline: string`  | Set text baseline (`"top"` / `"hanging"` / `"middle"` / `"alphabetic"` / `"ideographic"` / `"bottom"`) |
| `gtext-direction` | `direction: string` | Set text direction (`"ltr"` / `"rtl"` / `"inherit"`)                                                   |
| `gmeasure-text`   | `text: string`      | Return the width of `text` in pixels (number)                                                          |
| `gletter-spacing` | `spacing: string`   | Set letter spacing (e.g. `"2px"`)                                                                      |
| `gword-spacing`   | `spacing: string`   | Set word spacing (e.g. `"4px"`)                                                                        |
| `gfont-kerning`   | `kerning: string`   | Set font kerning (`"auto"` / `"normal"` / `"none"`)                                                    |
| `gfont-stretch`   | `stretch: string`   | Set font stretch (`"condensed"` / `"normal"` / `"expanded"` / ...)                                     |
| `gfont-variant`   | `variant: string`   | Set font variant caps (`"normal"` / `"small-caps"` / ...)                                              |
| `gtext-rendering` | `mode: string`      | Set text rendering (`"auto"` / `"optimizeSpeed"` / `"optimizeLegibility"` / `"geometricPrecision"`)    |

`gfill-text` and `gstroke-text` also accept an optional fourth argument
`maxWidth: number` that scales the text to fit within that width.

## Transform

| Function           | Arguments                  | Description                                     |
| ------------------ | -------------------------- | ----------------------------------------------- |
| `gtranslate`       | `x: number, y: number`     | Translate the coordinate system                 |
| `gscale`           | `x: number, y: number`     | Scale the coordinate system                     |
| `grotate`          | `angle: number`            | Rotate by `angle` degrees                       |
| `gtransform`       | `a, b, c, d, e, f: number` | Multiply the current matrix (`transform`)       |
| `gset-transform`   | `a, b, c, d, e, f: number` | Replace the current matrix (`setTransform`)     |
| `greset-transform` | —                          | Reset the matrix to identity (`resetTransform`) |

## State

| Function   | Arguments | Description                                                      |
| ---------- | --------- | ---------------------------------------------------------------- |
| `gsave`    | —         | Push the current drawing state onto the state stack (`save`)     |
| `grestore` | —         | Pop the last saved drawing state off the state stack (`restore`) |

## Image / Export

| Function      | Arguments                                                 | Description                                                                                                                  |
| ------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `gimage`      | `src: string, x: number, y: number`                       | Draw an image loaded from `src` at (`x`, `y`) at its natural size                                                            |
| `gimage`      | `src: string, x: number, y: number, w: number, h: number` | Draw an image loaded from `src` at (`x`, `y`) scaled to `w` × `h`                                                            |
| `gsave-png`   | —                                                         | Trigger a browser download of the canvas as PNG (needs a DOM and an `HTMLCanvasElement`; uses `toDataURL` + `<a download>`)  |
| `gsave-png`   | `path: string`                                            | Write the canvas as a PNG file to `path` (Node.js only)                                                                      |
| `gsave-jpeg`  | —                                                         | Trigger a browser download of the canvas as JPEG (needs a DOM and an `HTMLCanvasElement`; uses `toDataURL` + `<a download>`) |
| `gsave-jpeg`  | `path: string`                                            | Write the canvas as a JPEG file to `path` (Node.js only)                                                                     |
| `gclear-rect` | `x: number, y: number, w: number, h: number`              | Erase a rectangle to transparent black (`clearRect`)                                                                         |
| `gpixel`      | `x: number, y: number`                                    | Return the pixel at (`x`, `y`) as an `(r g b a)` list                                                                        |
| `gset-pixel`  | `x: number, y: number, r, g, b, a: number`                | Write a single pixel (0–255 per channel)                                                                                     |

`gimage` and `gpattern` load their image asynchronously on first use and cache
it per plugin instance: the first draw for a given `src` happens when the image
finishes loading (later drawing calls may paint over or under it), while
subsequent draws of the same `src` run synchronously in drawing order.

## Examples

Fill styles — gradients apply to both fill and stroke, like `gcolor`:

```lisp
(gopen)
(glinear-gradient 0 0 200 0    0 "tomato"  1 "gold")
(gfill-rect 20 20 180 90)
(gradial-gradient 320 65 5   320 65 60   0 "white"  1 "steelblue")
(gstart-path) (garc 320 65 45 0 360 1) (gfill)
```

Arcs and transforms — angles are always in degrees:

```lisp
(gsave)
(gtranslate 200 150)
(grotate 30)
(gstroke-rect -40 -25 80 50)
(grestore)                       ; the rotation stays local to gsave/grestore
(gstart-path) (garc 200 150 70 0 270 1) (gstroke)
```

Reading values back — these functions return a value instead of `t`:

```lisp
(gwidth)                         ; => 640
(gmeasure-text "Hello")          ; => 21.6 (a float; the exact value depends on the font)
(gpixel 10 10)                   ; => (255 255 255 255)
(gis-point-in-path 200 150)      ; => t or nil
```

Saving — the no-argument form downloads in a browser; pass a path on Node.js:

```lisp
(gsave-png)                      ; browser: downloads "canvas.png"
(gsave-png "out/canvas.png")     ; Node.js: writes the file synchronously
```
