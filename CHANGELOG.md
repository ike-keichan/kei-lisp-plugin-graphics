# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `createGraphicsPlugin({ canvas })` factory and the `GraphicsPlugin`
  class (JavaScript implementation) ported from the legacy
  `Graphist.js`. Registers 43 `g…` Canvas2D drawing primitives
  callable from Lisp via the kei-lisp v2.2 plugin contract.

### Notes

- This release is the first of three planned migration steps:
  1. **Port the legacy JavaScript** as-is to the new plugin contract
     (this entry).
  2. Migrate the source to TypeScript with `.d.ts` output restored.
  3. Fix the legacy quirks preserved verbatim through step 1 (the
     `gshadow-blur` typo, every-call `ctx.save()`, copy-pasted error
     messages, white-`fillRect` clear, etc.).
- Type declarations (`dist/index.d.ts`) are intentionally not emitted
  in step 1 — they come back with the TypeScript migration.
