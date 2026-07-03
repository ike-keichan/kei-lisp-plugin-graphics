# kei-lisp-plugin-graphics

[![CI](https://github.com/ike-keichan/kei-lisp-plugin-graphics/actions/workflows/ci.yml/badge.svg)](https://github.com/ike-keichan/kei-lisp-plugin-graphics/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/kei-lisp-plugin-graphics.svg)](https://www.npmjs.com/package/kei-lisp-plugin-graphics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)

A Canvas2D drawing plugin for the [kei-lisp](https://github.com/ike-keichan/kei-lisp)
interpreter. Register it on a `LispInterpreter` and call drawing primitives
(`gopen`, `gline-to`, `gfill-rect`, ...) directly from Lisp source.

> [!WARNING]
> This is a **toy / hobby project** built for learning and experimentation.
> **Use in production (or any other serious product) is not recommended.**
> APIs may change without notice, and maintenance and support are provided
> on a best-effort basis only.
>
> It is also a **personal project**: issue reports (bugs, questions, ideas)
> are welcome, but external pull requests are generally **not accepted** —
> see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Features

- 75 Canvas2D drawing primitives (`g…` symbols) callable directly from Lisp source
- Works with `HTMLCanvasElement` and `OffscreenCanvas`
- ESM and CommonJS dual output with TypeScript types
- Zero runtime dependencies

## Installation

```sh
pnpm add kei-lisp-plugin-graphics kei-lisp
# or: npm install kei-lisp-plugin-graphics kei-lisp
```

`kei-lisp` is a **peer dependency**; install both into your project. Requires
**Node.js >= 24** for the build toolchain (the plugin itself targets any
environment that exposes a `CanvasRenderingContext2D`).

## Quick start

```ts
import { LispInterpreter } from 'kei-lisp';
import { createGraphicsPlugin } from 'kei-lisp-plugin-graphics';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;

const interpreter = new LispInterpreter();
interpreter.use(createGraphicsPlugin({ canvas }));

interpreter.evalString(`
  (gopen)
  (gfill-color "tomato")
  (gfill-rect 10 10 120 80)
  (gstroke-color "black")
  (gline-width 2)
  (gstroke-rect 10 10 120 80)
  (gclose)
`);
```

`HTMLCanvasElement` and `OffscreenCanvas` are both accepted.

## API

```ts
import type { KeiLispPlugin } from 'kei-lisp';

export function createGraphicsPlugin(options: {
  canvas: HTMLCanvasElement | OffscreenCanvas;
}): KeiLispPlugin;
```

The returned plugin implements the [`KeiLispPlugin`](https://github.com/ike-keichan/kei-lisp/blob/main/docs/plugins.md)
interface and registers a fixed set of `g…` symbols that proxy to the
canvas's 2D rendering context.

## Provided Lisp functions

| Category       | Symbols                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle      | `gopen`, `gclose`, `gclear`, `greset`, `gwidth`, `gheight`, `gsleep`                                                                                                                                                                                                |
| Path           | `gstart-path`, `gfinish-path`, `gmove-to`, `gline-to`, `gquadcurve-to`, `gbezcurve-to`, `garc`, `garc-to`, `grect`, `ground-rect`, `gellipse`, `gclip`, `gis-point-in-path`, `gis-point-in-stroke`                                                                  |
| Fill / stroke  | `gfill`, `gstroke`, `gfill-rect`, `gstroke-rect`, `gfill-tri`, `gstroke-tri`, `gfill-text`, `gstroke-text`                                                                                                                                                          |
| Style          | `gcolor`, `gfill-color`, `gstroke-color`, `gline-width`, `gline-cap`, `gline-join`, `gline-dash`, `gline-dash-offset`, `gmiter-limit`, `galpha`, `gpattern`, `gcomposite`, `gfilter`, `gimage-smoothing`, `glinear-gradient`, `gradial-gradient`, `gconic-gradient` |
| Shadow         | `gshadow-color`, `gshadow-blur`, `gshadow-offsetx`, `gshadow-offsety`                                                                                                                                                                                               |
| Text           | `gtext-font`, `gtext-align`, `gtext-line`, `gtext-dire`, `gmeasure-text`, `gletter-spacing`, `gword-spacing`, `gfont-kerning`, `gfont-stretch`, `gfont-variant`, `gtext-rendering`                                                                                  |
| Transform      | `gtranslate`, `gscale`, `grotate`, `gtransform`, `gset-transform`, `greset-transform`                                                                                                                                                                               |
| State          | `gsave`, `grestore`                                                                                                                                                                                                                                                 |
| Image / export | `gimage`, `gsave-png`, `gsave-jpeg`, `gclear-rect`, `gpixel`, `gset-pixel`                                                                                                                                                                                          |

Each function returns `t` on success. See [`docs/graphics.md`](./docs/graphics.md)
for argument signatures and side effects.

## Reference

- [API Reference](./docs/api.md) — TypeScript / JavaScript API
- [Graphics Reference](./docs/graphics.md) — every `g…` Lisp function
- [kei-lisp Plugin Guide](https://github.com/ike-keichan/kei-lisp/blob/main/docs/plugins.md) — how plugins integrate with the interpreter

## Development

```sh
git clone https://github.com/ike-keichan/kei-lisp-plugin-graphics.git
cd kei-lisp-plugin-graphics
pnpm install
```

Requires [pnpm](https://pnpm.io/) and Node.js 24+
(see [`.node-version`](./.node-version) for the exact version).

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm build`      | Build for distribution (CJS + ESM + types) |
| `pnpm test`       | Run tests                                  |
| `pnpm test:watch` | Run tests in watch mode                    |
| `pnpm check`      | Run all checks (format, lint, spell, ...)  |
| `pnpm fix`        | Auto-fix format and lint issues            |

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the branch policy and PR flow.

## License

[MIT](./LICENSE)
