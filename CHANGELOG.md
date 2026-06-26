# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `createGraphicsPlugin({ canvas })` factory and the `GraphicsPlugin`
  class ported from the legacy `Graphist.js`. Registers 43 `g…`
  Canvas2D drawing primitives callable from Lisp via the kei-lisp v2.2
  plugin contract (`name` / `has` / `apply`).
