# Graphics Reference

All 43 Lisp functions registered by `createGraphicsPlugin`. Each one is
called as `(name args…)` from Lisp source and returns the symbol `t` on
success. Argument-validation errors raise `EvalError`. Functions that
draw require the canvas to be open (`gopen` called, `gclose` not yet
called); attempting to draw while closed raises `EvalError` with the
message `The canvas is closed and cannot be executed.`.

Color arguments accept three forms, applied uniformly across `gcolor`,
`gfill-color`, `gstroke-color`, and `gshadow-color`:

| Form          | Example           | Becomes                   |
| ------------- | ----------------- | ------------------------- |
| 1 string      | `"red"`, `"#fff"` | used verbatim             |
| 3 numbers     | `(255 64 0)`      | `"rgb(255, 64, 0)"`       |
| 4 numbers     | `(255 64 0 0.5)`  | `"rgba(255, 64, 0, 0.5)"` |
| anything else | `(1 2)`           | falls back to `"black"`   |

## Lifecycle

| Function      | Arity    | Description                                                                           |
| ------------- | -------- | ------------------------------------------------------------------------------------- |
| `(gopen)`     | 0        | Marks the canvas open, paints it white, emits a debug line to the interpreter stream. |
| `(gclose)`    | 0        | Marks the canvas closed and clears it.                                                |
| `(gclear)`    | 0        | Repaints the canvas white (legacy clear semantics).                                   |
| `(gsleep ms)` | 1 number | Busy-loops for the given duration in milliseconds. Synchronous.                       |

## Path

| Function                                 | Arity     | Notes                                             |
| ---------------------------------------- | --------- | ------------------------------------------------- |
| `(gstart-path)`                          | 0         | `ctx.beginPath()`                                 |
| `(gfinish-path)`                         | 0         | `ctx.closePath()`                                 |
| `(gmove-to x y)`                         | 2 numbers |                                                   |
| `(gline-to x y)`                         | 2 numbers |                                                   |
| `(gquadcurve-to cpx cpy x y)`            | 4 numbers | quadratic Bezier                                  |
| `(gbezcurve-to cp1x cp1y cp2x cp2y x y)` | 6 numbers | cubic Bezier                                      |
| `(garc x y r startDeg endDeg ccw)`       | 6 numbers | Angles in degrees. `ccw` ≥ 0 → counter-clockwise. |
| `(garc-to x1 y1 x2 y2 r)`                | 5 numbers |                                                   |
| `(grect x y w h)`                        | 4 numbers | rectangle subpath                                 |

## Fill / Stroke

| Function                          | Arity         | Notes                    |
| --------------------------------- | ------------- | ------------------------ |
| `(gfill)`                         | 0             | fills the current path   |
| `(gstroke)`                       | 0             | strokes the current path |
| `(gfill-rect x y w h)`            | 4 numbers     |                          |
| `(gstroke-rect x y w h)`          | 4 numbers     |                          |
| `(gfill-text text x y)`           | 1 str + 2 num |                          |
| `(gstroke-text text x y)`         | 1 str + 2 num |                          |
| `(gfill-tri x1 y1 x2 y2 x3 y3)`   | 6 numbers     |                          |
| `(gstroke-tri x1 y1 x2 y2 x3 y3)` | 6 numbers     |                          |

## Style

| Function              | Arity         | Notes                                                                                                                |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `(galpha a)`          | 1 number      | Clamped to `[0, 1]`.                                                                                                 |
| `(gcolor …)`          | color spec    | Sets both fillStyle and strokeStyle.                                                                                 |
| `(gfill-color …)`     | color spec    |                                                                                                                      |
| `(gstroke-color …)`   | color spec    |                                                                                                                      |
| `(gline-width w)`     | 1 number      | Values ≤ 0 are coerced to 1.                                                                                         |
| `(gline-cap flag)`    | 1 number      | 0 → `butt`, positive → `round`, negative → `square`.                                                                 |
| `(gline-join flag)`   | 1 number      | 0 → `miter`, positive → `round`, negative → `bevel`.                                                                 |
| `(gpattern src flag)` | 1 str + 1 num | Async image load; 0 → `repeat`, positive → `repeat-x`, negative → `repeat-y`. Returns immediately. **Browser only.** |

## Shadow

| Function               | Arity      | Notes                                                                                                                                      |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `(gshadow-blur px)`    | 1 number   | **Known issue**: writes `ctx.Blur` instead of `ctx.shadowBlur` (preserved verbatim from legacy Graphist; to be fixed in a future release). |
| `(gshadow-color …)`    | color spec |                                                                                                                                            |
| `(gshadow-offsetx px)` | 1 number   |                                                                                                                                            |
| `(gshadow-offsety px)` | 1 number   |                                                                                                                                            |

## Text

| Function                | Arity    | Notes                                                                                 |
| ----------------------- | -------- | ------------------------------------------------------------------------------------- |
| `(gtext-font font)`     | 1 string | CSS font shorthand, e.g. `"16px sans-serif"`.                                         |
| `(gtext-align align)`   | 1 string | One of `"start"`, `"end"`, `"left"`, `"right"`, `"center"`.                           |
| `(gtext-line baseline)` | 1 string | One of `"top"`, `"hanging"`, `"middle"`, `"alphabetic"`, `"ideographic"`, `"bottom"`. |
| `(gtext-dire flag)`     | 1 number | 0 → `inherit`, positive → `rtl`, negative → `ltr`.                                    |

## Transform

| Function             | Arity     | Notes                                     |
| -------------------- | --------- | ----------------------------------------- |
| `(gtranslate dx dy)` | 2 numbers |                                           |
| `(gscale sx sy)`     | 2 numbers |                                           |
| `(grotate deg)`      | 1 number  | Degrees, converted to radians internally. |

## Image / Save

| Function               | Arity         | Notes                                                                |
| ---------------------- | ------------- | -------------------------------------------------------------------- |
| `(gimage src x y)`     | 1 str + 2 num | Async image load → `drawImage(image, x, y)`. **Browser only.**       |
| `(gimage src x y w h)` | 1 str + 4 num | Async image load → `drawImage(image, x, y, w, h)`. **Browser only.** |
| `(gsave-png)`          | 0             | Triggers a PNG download via `<a download>`. **Browser only.**        |
| `(gsave-jpeg)`         | 0             | Triggers a JPEG download via `<a download>`. **Browser only.**       |
