# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `createGraphicsPlugin({ canvas })` factory and the `GraphicsPlugin`
  class implementing kei-lisp's `KeiLispPlugin`. Registers 43 `g…`
  Canvas2D drawing primitives (lifecycle, path, fill/stroke, style,
  shadow, text, transform, image, save) callable from Lisp source.
  Accepts both `HTMLCanvasElement` and `OffscreenCanvas`.
- `docs/api.md` and `docs/graphics.md` documenting the TypeScript API
  and every `g…` Lisp function.
- `examples/basic-draw.ts` showing browser-side usage.

### Notes

- A few legacy quirks from the original `Graphist.js` are preserved
  verbatim (e.g. `gshadow-blur` writes `ctx.Blur` instead of
  `ctx.shadowBlur` and so has no rendering effect, every drawing call
  ends with a redundant `ctx.save()`). These will be addressed in a
  follow-up release.
