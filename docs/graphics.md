# Graphics Reference

All `g…` Lisp functions exposed by `kei-lisp-plugin-graphics`. Each function
returns the symbol `t` on success and `nil` on failure (wrong arity, type
mismatch, or canvas not open).

## Lifecycle

| Function | Arguments    | Description                                                |
| -------- | ------------ | ---------------------------------------------------------- |
| `gopen`  | —            | Open the canvas (acquire 2D context, set `isOpen` to true) |
| `gclose` | —            | Close the canvas                                           |
| `gclear` | —            | Clear the entire canvas                                    |
| `gsleep` | `ms: number` | Pause execution for `ms` milliseconds                      |

## Path

| Function        | Arguments                                                                      | Description                                                         |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `gstart-path`   | —                                                                              | Begin a new path (`beginPath`)                                      |
| `gfinish-path`  | —                                                                              | Close the current path (`closePath`)                                |
| `gmove-to`      | `x: number, y: number`                                                         | Move the pen to (`x`, `y`)                                          |
| `gline-to`      | `x: number, y: number`                                                         | Draw a line from the current point to (`x`, `y`)                    |
| `gquadcurve-to` | `cpx: number, cpy: number, x: number, y: number`                               | Quadratic Bézier curve                                              |
| `gbezcurve-to`  | `cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number` | Cubic Bézier curve                                                  |
| `garc`          | `x: number, y: number, r: number, start: number, end: number, ccw: number`     | Arc; `start` / `end` in degrees, `ccw >= 0` draws counter-clockwise |
| `garc-to`       | `x1: number, y1: number, x2: number, y2: number, r: number`                    | Arc with two tangent points                                         |
| `grect`         | `x: number, y: number, w: number, h: number`                                   | Rectangle path                                                      |

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

| Function        | Arguments                          | Description                                       |
| --------------- | ---------------------------------- | ------------------------------------------------- |
| `gcolor`        | `color: string`                    | Set both fill and stroke color                    |
| `gfill-color`   | `color: string`                    | Set fill color (`fillStyle`)                      |
| `gstroke-color` | `color: string`                    | Set stroke color (`strokeStyle`)                  |
| `gline-width`   | `width: number`                    | Set line width                                    |
| `gline-cap`     | `cap: string`                      | Set line cap (`"butt"` / `"round"` / `"square"`)  |
| `gline-join`    | `join: string`                     | Set line join (`"miter"` / `"round"` / `"bevel"`) |
| `galpha`        | `alpha: number`                    | Set global alpha (0.0–1.0)                        |
| `gpattern`      | `image: image, repetition: string` | Set fill style to a canvas pattern                |

## Shadow

| Function          | Arguments       | Description            |
| ----------------- | --------------- | ---------------------- |
| `gshadow-color`   | `color: string` | Set shadow color       |
| `gshadow-blur`    | `blur: number`  | Set shadow blur radius |
| `gshadow-offsetx` | `x: number`     | Set shadow X offset    |
| `gshadow-offsety` | `y: number`     | Set shadow Y offset    |

## Text

| Function      | Arguments           | Description                                                                  |
| ------------- | ------------------- | ---------------------------------------------------------------------------- |
| `gtext-font`  | `font: string`      | Set the font string (e.g. `"16px sans-serif"`)                               |
| `gtext-align` | `align: string`     | Set text alignment (`"left"` / `"center"` / `"right"` / ...)                 |
| `gtext-line`  | `baseline: string`  | Set text baseline (`"top"` / `"middle"` / `"alphabetic"` / `"bottom"` / ...) |
| `gtext-dire`  | `direction: string` | Set text direction (`"ltr"` / `"rtl"` / `"inherit"`)                         |

## Transform

| Function     | Arguments              | Description                     |
| ------------ | ---------------------- | ------------------------------- |
| `gtranslate` | `x: number, y: number` | Translate the coordinate system |
| `gscale`     | `x: number, y: number` | Scale the coordinate system     |
| `grotate`    | `angle: number`        | Rotate by `angle` degrees       |

## State

| Function   | Arguments | Description                                                      |
| ---------- | --------- | ---------------------------------------------------------------- |
| `gsave`    | —         | Push the current drawing state onto the state stack (`save`)     |
| `grestore` | —         | Pop the last saved drawing state off the state stack (`restore`) |

## Image / Export

| Function     | Arguments                                                 | Description                                                                                                                            |
| ------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `gimage`     | `src: string, x: number, y: number`                       | Draw an image loaded from `src` at (`x`, `y`) at its natural size                                                                      |
| `gimage`     | `src: string, x: number, y: number, w: number, h: number` | Draw an image loaded from `src` at (`x`, `y`) scaled to `w` × `h`                                                                      |
| `gsave-png`  | —                                                         | Trigger a browser download of the canvas as PNG (browser only; uses `toDataURL` + `<a download>`, not available on `OffscreenCanvas`)  |
| `gsave-jpeg` | —                                                         | Trigger a browser download of the canvas as JPEG (browser only; uses `toDataURL` + `<a download>`, not available on `OffscreenCanvas`) |
