# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- DX・コミュニティ整備（#20）
  - `SECURITY.md` — GitHub の private vulnerability reporting を窓口とする
    脆弱性報告ポリシーを追加
  - `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 ベースの行動規範を追加
  - `.github/ISSUE_TEMPLATE/` — バグ報告・機能要望・質問の issue form と
    `config.yml`（blank issue 無効化・セキュリティ報告への誘導）を追加
  - `examples/` — ブラウザ（Vite）で動かす基本描画サンプル
    （矩形・円・三角形・テキスト・変形・`gsave-png` ダウンロード）を追加。
    kei-lisp と同様に `tsconfig.json` / ESLint / cspell / Prettier の
    チェック対象に含めた
- README に、本プロジェクトがおもちゃ（hobby）プロジェクトであり
  プロダクション用途は非推奨である旨の注意書きを追加
- README / CONTRIBUTING に、個人プロジェクトのため issue での報告は歓迎するが
  外部からの pull request は原則受け付けない旨を明記

- `@vitest/coverage-v8` によるテストカバレッジ計測を導入（#19）
  - `pnpm test:coverage` スクリプトと `vitest.config.js` の coverage 設定を追加
  - CI の tests ジョブをカバレッジ計測付き（`pnpm test:coverage`）に変更
- エラーパスのテストを追加（#19）。全 `g…` 関数について、canvas がクローズ状態のとき・
  引数の型が不一致のとき・引数の個数が不一致のときに `nil` を返すことを検証
- CJS ビルド（`dist/index.cjs`）を `require()` で読み込めることを確認する
  スモークテストを追加（#19）

### Changed

- **Breaking:** `gline-cap` / `gline-join` が数値フラグ（0 / 正 / 負）ではなく
  Canvas API と同じ文字列（`"butt"` / `"round"` / `"square"`、
  `"miter"` / `"round"` / `"bevel"`）を受け取るように変更（#18）
- **Breaking:** `gtext-dire` が数値フラグではなく `ctx.direction` と同じ文字列
  （`"ltr"` / `"rtl"` / `"inherit"`）を受け取るように変更（#18）
- `gsave-jpeg` / `gsave-png` に Node.js 向けのオーバーロード `path: string` を追加。
  引数なしは従来どおりブラウザダウンロード（`toDataURL` + `<a download>`）で、
  DOM や `toDataURL` が無い環境（Node.js / `OffscreenCanvas`）で引数なしで呼ぶと
  例外に頼らず明示的なエラーメッセージを出力するように変更（#18）

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
