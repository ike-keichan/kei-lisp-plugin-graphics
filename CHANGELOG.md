# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Bundled Lisp pattern files** under `lisp/`, loadable with kei-lisp v3's
  `load` (kei-lisp roadmap follow-up, #21): `grid.lisp` (`ggrid` strokes a
  grid across the canvas), `palette.lisp` (`gpalette` / `gpalette-color`,
  an 8-color categorical palette with wrap-around indexing), and
  `animation.lisp` (`ganimate` runs a frame loop over a draw lambda with
  `gsleep` between frames). Documented in `docs/patterns.md` and shipped in
  the npm package (`files` now includes `lisp/`). Requires the kei-lisp
  fixes for plugin dispatch inside user functions and multi-form lambda
  bodies (kei-lisp #63 / #64).

### Changed

- **BREAKING: requires kei-lisp >= 3.** The `kei-lisp` peer dependency was
  bumped from `^2.2.0` to `^3.0.0` to adopt the v3 numeric tower, whose
  integers (`bigint`) and exact rationals (`Rational`) flow into plugin
  arguments. All numeric arguments are now converted with `Numeric.toFloat`
  before reaching the Canvas 2D API, so integer, float, and rational values
  (e.g. `(gfill-rect (/ 5 2) 10 50 30)`) all draw correctly.
- **`gwidth` / `gheight` / `gpixel` return exact integers.** Their
  integer-valued results are now kei-lisp v3 integers (`bigint`), so
  `(integerp (gwidth))` → `t` and `(/ (gwidth) 2)` stays exact.
  `gmeasure-text` still returns a float.

## [3.0.1] - 2026-07-05

### Changed

- Aligned the CONTRIBUTING branch strategy with kei-lisp itself: routine
  patch releases now go through `feature/*` PRs to `main`, and `hotfix/*`
  is reserved for emergency fixes. The diagram, branch tables,
  responsibility table, and PR template wording were updated to match (#39)
- Rewrote the CHANGELOG in English to match kei-lisp's convention

### Fixed

- Corrected the README demo wording: the Pages example page only renders a
  fixed sample program, so it is no longer described as something to "try";
  readers who want to write Lisp interactively are pointed to kei-lisp-web
- Split the Deploy Pages workflow into build / deploy jobs so a transient
  Pages failure can be recovered with "Re-run failed jobs" (the single-job
  layout re-uploaded the artifact on rerun and always failed on a name
  conflict)

## [3.0.0] - 2026-07-04

### Added

- Expanded Canvas 2D API coverage with 30 new `g…` functions
  (45 → 75 functions, #31)
  - Gradients: `glinear-gradient` / `gradial-gradient` / `gconic-gradient`
  - Shapes / paths: `gellipse` / `ground-rect` / `gclip` /
    `gis-point-in-path` / `gis-point-in-stroke`
  - Lines: `gline-dash` / `gline-dash-offset` / `gmiter-limit`
  - Transforms: `gtransform` / `gset-transform` / `greset-transform`
  - Compositing / quality: `gcomposite` / `gfilter` / `gimage-smoothing`
  - Text: `gmeasure-text` / `gletter-spacing` / `gword-spacing` /
    `gfont-kerning` / `gfont-stretch` / `gfont-variant` / `gtext-rendering`
  - Pixels and misc: `gpixel` / `gset-pixel` / `gclear-rect` / `greset` /
    `gwidth` / `gheight`
- `gfill-text` / `gstroke-text` accept an optional fourth `maxWidth`
  argument (#31)
- Documented the return-value convention for the value-returning functions
  (`gwidth` / `gheight` / `gmeasure-text` / `gpixel` / `gis-point-in-path` /
  `gis-point-in-stroke`) (#31)
- Added `gtext-baseline` / `gtext-direction` as the primary names (#32)
- Added `GraphicsPlugin.functionNames()` — a static method returning the
  list of registered Lisp function names (#32)
- `docs/non-goals.md` — documented what the project deliberately does not
  do (plugin-layer performance work, bulk ImageData transfer, DOM-coupled
  canvas APIs, async drawing semantics, mutation testing, multi-language
  docs, production support) and why (#37)
- Added a README screenshot of the example canvas (regenerated with
  `pnpm screenshot`) and an environment support matrix
  (browser / OffscreenCanvas / Node.js) (#36)
- Added a workflow that deploys the examples and TypeDoc to GitHub Pages,
  linked from the README (#36)
- Added usage examples (gradients, transforms, value-returning functions,
  saving) to docs/graphics.md (#36)
- Raised CI and repository operations to OSS standards (#35)
  - Added a CodeQL (code scanning) workflow
  - Added an actionlint job that lints the workflows themselves
  - Added unused-code / unused-dependency detection with knip
    (`check:knip`)
  - Run TypeDoc with `--treatWarningsAsErrors` in CI
  - Generate GitHub Release notes from the matching CHANGELOG section
    (the auto-generated PR list is appended)
  - Added compare links to the CHANGELOG
  - Added an `.editorconfig`
  - Enabled secret scanning / push protection in the repository settings
- Filled the remaining coverage gaps (every exception path and all save
  paths) and enforced coverage thresholds
  (statements 94 / branches 90 / functions 100 / lines 98) (#34)
- Added machine verification of the dual ESM / CJS packaging with publint
  and @arethetypeswrong/cli via `pnpm check` (`check:package`) (#34)
- Added a real-Chromium E2E (`pnpm e2e`): builds and serves the examples
  with Vite and asserts the pixels the Lisp program painted, with a
  dedicated CI job (#34)
- Added a Node.js integration test using @napi-rs/canvas that verifies
  `(gsave-png path)` PNG output, `gpixel` / `gset-pixel` round-trips, and
  `gmeasure-text` against a real canvas implementation (skipped where the
  module is unavailable) (#34)
- Fixed the examples not working in a plain browser by adding Vite shims
  for the node:module / node:vm / node:v8 imports that kei-lisp pulls in
  at module scope (#34)

### Deprecated

- `gtext-line` / `gtext-dire` — now deprecated aliases of `gtext-baseline`
  / `gtext-direction` (they keep working; removal is planned for a future
  major release, #32)

### Changed

- **Breaking:** `gpattern`'s second argument changed from a numeric flag to
  the same strings as the Canvas API (`"repeat"` / `"repeat-x"` /
  `"repeat-y"` / `"no-repeat"`). The documentation already described it as
  a string; the implementation now follows (#32)
- **Breaking (TypeScript API):** the dispatch table is now private — the
  public static `buildInFunctions` (a typo'd, mutable Map) and `setup` /
  `selectProcedure` / `buildInFunction` were removed and folded into
  `apply`. Use the new `functionNames()` when a list is needed (#32)
- Every enum-string setter (`gline-cap` / `gline-join` / `gtext-align` /
  `gtext-baseline` / `gtext-direction` / `gcomposite` / `gfont-*` /
  `gtext-rendering` / `gpattern`'s repetition) now validates its argument
  against the Canvas API's allowed values; invalid values return `nil`
  with a diagnostic listing the expected values (#32)
- Removed the meaningless `extends Object` from `GraphicsPlugin` (#32)

### Fixed

- `gpattern`: fixed a legacy bug where a null `createPattern()` result was
  cast away; a diagnostic is printed instead (#33)
- `#print` no longer throws in a plain browser without `process.stderr`;
  it falls back to `console.error`, so the plugin works without a host
  shim (#33)
- `gimage` / `gpattern` now cache loaded images per plugin instance:
  repeat draws of the same `src` run synchronously and keep the drawing
  order, and a load failure prints a diagnostic (#33)
- `gclear` accepts an optional color (no arguments still paints white) and
  restores the previous `fillStyle` instead of resetting it to black (#33)
- Documented that `gsleep` busy-waits and blocks the thread (#33)

## [2.0.0] - 2026-07-04

### Added

- DX and community-health files (#20)
  - `SECURITY.md` — a vulnerability reporting policy using GitHub's
    private vulnerability reporting as the contact channel
  - `CODE_OF_CONDUCT.md` — a code of conduct based on Contributor
    Covenant v2.1
  - `.github/ISSUE_TEMPLATE/` — issue forms for bug reports, feature
    requests, and questions, plus `config.yml` (blank issues disabled,
    security reports routed to private reporting)
  - `examples/` — a basic browser drawing sample run with Vite
    (rectangles, circle, triangle, text, transforms, `gsave-png`
    download), included in the `tsconfig.json` / ESLint / cspell /
    Prettier check targets like kei-lisp
- Added a README notice that this is a toy / hobby project and production
  use is not recommended
- Stated in README / CONTRIBUTING that issue reports are welcome but
  external pull requests are generally not accepted, as this is a
  personal project
- Introduced test coverage measurement with `@vitest/coverage-v8` (#19)
  - Added a `pnpm test:coverage` script and coverage settings in
    `vitest.config.js`
  - The CI tests job now runs with coverage (`pnpm test:coverage`)
- Added error-path tests (#19): every `g…` function is verified to return
  `nil` when the canvas is closed, when an argument has the wrong type,
  and when the argument count is wrong
- Added a smoke test that `require()`s the CJS build (`dist/index.cjs`)
  (#19)

### Changed

- **Breaking:** `gline-cap` / `gline-join` now take the same strings as
  the Canvas API (`"butt"` / `"round"` / `"square"`,
  `"miter"` / `"round"` / `"bevel"`) instead of numeric flags
  (0 / positive / negative) (#18)
- **Breaking:** `gtext-dire` now takes the same strings as
  `ctx.direction` (`"ltr"` / `"rtl"` / `"inherit"`) instead of a numeric
  flag (#18)
- `gsave-jpeg` / `gsave-png` gained a Node.js overload taking
  `path: string`. The no-argument form still triggers a browser download
  (`toDataURL` + `<a download>`), and environments without a DOM or
  `toDataURL` (Node.js / `OffscreenCanvas`) now get an explicit
  diagnostic instead of an exception (#18)

### Security

- Refreshed the transitive `vite` dependency (via vitest) to 8.0.16 or
  later, resolving the two vulnerabilities reported by Dependabot
  (`server.fs.deny` bypass / NTLMv2 hash disclosure via launch-editor;
  both Windows-only and dev-time-only)

## [1.1.0] - 2026-07-02

### Added

- `gsave` / `grestore` — Lisp functions for explicitly managing the
  canvas state stack

### Changed

- Removed the `ctx.save()` calls that almost every drawing method made
  without a matching `restore()`, fixing the unbounded state-stack growth;
  state management is unified under the new `gsave` / `grestore`

### Fixed

- `gshadow-blur` wrote to the nonexistent `ctx.Blur` instead of
  `ctx.shadowBlur`, so shadow blur never took effect (inherited from the
  legacy Graphist.js)
- `gopen` printed the fixed string
  `'canvas size, width : 600 height : 300'` regardless of the actual
  canvas size; it now reports `canvas.width` / `canvas.height`
- `gstroke-text`'s failure message was `'Can not draw fill text.'`
  (copy-pasted from `gfill-text`); corrected to
  `'Can not draw stroke text.'`
- Corrected errors and missing entries in the `docs/graphics.md`
  function reference
  - Documented `garc`'s previously missing sixth argument
    (counter-clockwise flag) and that angles are in degrees
  - Documented `gimage`'s 5-argument form (drawing size `w` × `h`)
  - Fixed `gtext-line`'s description (it sets `ctx.textBaseline` from a
    string; it was wrongly described as "line height / `number`")
  - Fixed the `gsave-jpeg` / `gsave-png` signatures (no `path` argument;
    browser-only download behavior)
  - Fixed `grotate`'s angle unit (the implementation uses degrees but the
    doc said "radians")
- Removed leftover kei-lisp internal types (`Table` / `StreamManager` /
  `Loop`) from `typedoc.json`'s `intentionallyNotExported`
- Updated the base-branch description in
  `.github/PULL_REQUEST_TEMPLATE.md` to match `CONTRIBUTING.md`
  (`feature/*` targets `vX.Y`; `hotfix/*` patches target `main`)
- Fixed JSDoc `@param` inconsistencies in `GraphicsPlugin` so `pnpm doc`
  runs with zero warnings
  - Renamed the `@param`s of `apply` / `selectProcedure` /
    `buildInFunction` to the actual argument names
    (`args` → `arguments_`, `_ctx` → `_context`)
  - Removed the stray `@param arguments_` from the argument-less
    `gsave` / `grestore`
- Removed references to the nonexistent `examples/` directory from the
  configs (`tsconfig.json` `include`,
  `configs/eslint/const/index.mjs` `FILES.SRC`)
- Replaced the ignore settings for `out/`, which no tool writes to, with
  the actual output directory `docs/typedoc/`
  (`eslint.config.mjs` `ignores`, `cspell.json` `ignorePaths`)

## [1.0.1] - 2026-07-01

### Added

- `docs/api.md` — TypeScript / JavaScript API reference
- `docs/graphics.md` — reference for the 43 `g…` Lisp functions
- Added Node.js 26 to the CI workflow matrix
- Added Dependabot `groups` settings (npm dev/prod separation,
  github-actions grouping)

### Changed

- Added a CI badge and a `## Features` section to the README, and renamed
  `## Documentation` to `## Reference`
- Updated the CONTRIBUTING branch strategy to match kei-lisp
  (release-line branches, kept permanently)

## [1.0.0] - 2026-06-28

### Added

- `createGraphicsPlugin({ canvas })` factory and the `GraphicsPlugin`
  class ported from the legacy `Graphist.js`. Registers 43 `g…`
  Canvas2D drawing primitives callable from Lisp via the kei-lisp v2.2
  plugin contract (`name` / `has` / `apply`).
- Full TypeScript source with strict type checking — `any` and `!`
  assertions removed from production code.

### Fixed

- `gSaveJpeg`, `gSavePng`, and `gSleep` now emit
  `'The canvas is closed and cannot be executed.'` when called while the
  canvas is not open. The JavaScript source emitted the wrong message
  (`'The canvas has already been opened.'`) due to a copy-paste from
  `gOpen`'s double-open guard.

[unreleased]: https://github.com/ike-keichan/kei-lisp-plugin-graphics/compare/v3.0.1...HEAD
[3.0.1]: https://github.com/ike-keichan/kei-lisp-plugin-graphics/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/ike-keichan/kei-lisp-plugin-graphics/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/ike-keichan/kei-lisp-plugin-graphics/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/ike-keichan/kei-lisp-plugin-graphics/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/ike-keichan/kei-lisp-plugin-graphics/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ike-keichan/kei-lisp-plugin-graphics/releases/tag/v1.0.0
