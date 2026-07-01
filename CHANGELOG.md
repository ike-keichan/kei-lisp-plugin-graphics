# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-07-01

### Added

- `docs/api.md` — TypeScript / JavaScript API リファレンスを追加
- `docs/graphics.md` — 43 個の `g…` Lisp 関数のリファレンスを追加
- CI ワークフローに Node.js 26 のマトリクスを追加
- Dependabot の `groups` 設定を追加（npm dev/prod 分離・github-actions グループ化）

### Changed

- README に CI バッジと `## Features` セクションを追加、`## Documentation` を `## Reference` に統一
- CONTRIBUTING のブランチ戦略を kei-lisp に合わせて更新（release-line branch・永続保持）

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
