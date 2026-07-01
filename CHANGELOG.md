# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `gsave` / `grestore` — Canvas の状態スタックを明示的に操作する Lisp 関数を追加

### Fixed

- `gshadow-blur` が `ctx.shadowBlur` ではなく存在しない `ctx.Blur` に書き込んでおり、
  シャドウブラーが効かなかったバグを修正（レガシー Graphist.js からの引き継ぎ）
- `gopen` が実際のキャンバスサイズと無関係な固定文字列
  `'canvas size, width : 600 height : 300'` を出力していたのを、
  `canvas.width` / `canvas.height` を用いた実サイズ表示に修正
- `gstroke-text` の失敗時メッセージが `'Can not draw fill text.'`（`gfill-text` からの
  コピペミス）だったのを `'Can not draw stroke text.'` に修正

### Changed

- ほぼ全ての描画メソッドが対応する `restore()` なしに呼んでいた `ctx.save()` を削除。
  呼び出しのたびに状態スタックが際限なく積み上がるリークを解消し、状態管理は新設の
  `gsave` / `grestore` に一本化

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
