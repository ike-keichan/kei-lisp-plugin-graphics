# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-02

### Added

- `gsave` / `grestore` — Canvas の状態スタックを明示的に操作する Lisp 関数を追加

### Changed

- ほぼ全ての描画メソッドが対応する `restore()` なしに呼んでいた `ctx.save()` を削除。
  呼び出しのたびに状態スタックが際限なく積み上がるリークを解消し、状態管理は新設の
  `gsave` / `grestore` に一本化

### Fixed

- `gshadow-blur` が `ctx.shadowBlur` ではなく存在しない `ctx.Blur` に書き込んでおり、
  シャドウブラーが効かなかったバグを修正（レガシー Graphist.js からの引き継ぎ）
- `gopen` が実際のキャンバスサイズと無関係な固定文字列
  `'canvas size, width : 600 height : 300'` を出力していたのを、
  `canvas.width` / `canvas.height` を用いた実サイズ表示に修正
- `gstroke-text` の失敗時メッセージが `'Can not draw fill text.'`（`gfill-text` からの
  コピペミス）だったのを `'Can not draw stroke text.'` に修正
- `docs/graphics.md` の関数リファレンスの誤り・未記載項目を修正
  - `garc` に未記載だった第 6 引数（反時計回りフラグ）を追記し、角度が度数指定である旨を明記
  - `gimage` の 5 引数形式（描画サイズ指定 `w` × `h`）を追記
  - `gtext-line` の説明を修正（`ctx.textBaseline` を文字列で設定する。誤って「line height / `number`」と記載していた）
  - `gsave-jpeg` / `gsave-png` の引数仕様を修正（`path` は取らず、ブラウザ専用のダウンロード動作である旨を明記）
  - `grotate` の角度単位を修正（実装は度数指定だが「radians」と記載していた）
- `typedoc.json` の `intentionallyNotExported` から、このパッケージに存在しない
  kei-lisp 内部型（`Table` / `StreamManager` / `Loop`）のコピー残りを削除
- `.github/PULL_REQUEST_TEMPLATE.md` のベースブランチ説明を `CONTRIBUTING.md` に合わせて更新
  （`feature/*` は `vX.Y`、`hotfix/*` は `main` を対象とする旨に修正）
- `GraphicsPlugin` の JSDoc `@param` の不整合を修正し、`pnpm doc` を警告ゼロに
  - `apply` / `selectProcedure` / `buildInFunction` の `@param` 名を実引数名へ
    （`args` → `arguments_`、`_ctx` → `_context`）
  - 引数を取らない `gsave` / `grestore` に付いていた不要な `@param arguments_` を削除
- 設定ファイルに残っていた、このパッケージに存在しない `examples/` への参照を削除
  （`tsconfig.json` の `include`、`configs/eslint/const/index.mjs` の `FILES.SRC`）
- どのツールも出力しない `out/` を無視する設定を、実際の生成物ディレクトリ
  `docs/typedoc/` に修正（`eslint.config.mjs` の `ignores`、`cspell.json` の `ignorePaths`）

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
