# Bundled Lisp Patterns

The npm package ships loadable Lisp pattern files under `lisp/`, so common
drawing helpers are available right after installation. They are written
against the `g…` functions this plugin registers and use kei-lisp v3's
`load` (kei-lisp #44):

```lisp
(load "node_modules/kei-lisp-plugin-graphics/lisp/grid.lisp")
(gopen)
(ggrid 40)
```

`load` reads the file from the filesystem, so this works on Node.js (paths
are resolved from the process working directory). In a browser host, fetch
the file's text yourself and evaluate it (e.g. with
`interpreter.evalString(source)`).

## `lisp/grid.lisp`

| Function | Arguments      | Description                                                                                                    |
| -------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `ggrid`  | `step: number` | Stroke vertical and horizontal grid lines every `step` pixels across the whole canvas, using the current style |

```lisp
(gstroke-color "#dddddd")
(gline-width 1)
(ggrid 40)
```

## `lisp/palette.lisp`

| Function         | Arguments    | Description                                                                                                        |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `gpalette`       | `n: integer` | Return the `n`-th palette color string (0-based, wraps around the 8 entries; a non-integer index signals an error) |
| `gpalette-color` | `n: integer` | Set both fill and stroke color to the `n`-th palette color                                                         |

The palette is an 8-color categorical palette (a Tableau 10 subset), bound
to `*gpalette*`:

```lisp
(gpalette 0)        ; => "#4e79a7"
(gpalette 8)        ; => "#4e79a7" (wraps)
(gpalette-color 2)  ; fill + stroke to "#e15759"
```

## `lisp/animation.lisp`

| Function   | Arguments                                      | Description                                                                    |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `ganimate` | `frames: integer, delay: number, draw: lambda` | Call `draw` with the frame index `0 … frames-1`, sleeping `delay` ms per frame |

```lisp
(ganimate 30 20
  (lambda (frame)
    (gclear)
    (gfill-rect (* frame 4) 20 30 30)))
```

Note: `gsleep` busy-waits between frames — it blocks the thread and burns
CPU (see [graphics](./graphics.md)), so keep `frames × delay` small.
