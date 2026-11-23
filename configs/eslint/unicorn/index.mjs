import pluginUnicorn from 'eslint-plugin-unicorn';
import { RULE_LEVEL } from '../const/index.mjs';

const { ERROR, OFF } = RULE_LEVEL;

/**
 * ESLint config for eslint-plugin-unicorn.
 *
 * Several recommended rules are disabled to align with the existing codebase and the Lisp domain.
 */
export const unicornConfigs = [
  pluginUnicorn.configs.recommended,
  {
    rules: {
      // 既存コードベースに合わせて無効化
      'unicorn/prevent-abbreviations': OFF,
      'unicorn/filename-case': OFF,
      // Lisp 実装のため null を多用するため無効化
      'unicorn/no-null': OFF,
      // 正規表現の最適化を強制
      'unicorn/better-regex': ERROR,
      // NOTE: Parser.concat()を誤検知するため無効化
      // Array.concat() / Array.from() のスプレッド構文への統一を強制
      'unicorn/prefer-spread': OFF,
      // NOTE: Parserの状態遷移表構築と相性が悪いため無効化
      // new Map()/Set() 等の直後のミューテーションを禁止
      'unicorn/no-immediate-mutation': OFF,
      // NOTE: コードベース全体でクラス形式に統一しているため無効化
      // staticメソッドのみのクラスを禁止
      'unicorn/no-static-only-class': OFF,
      // NOTE: Lisp の linked list 走査で `let aCons = this; while (...) { aCons = aCons.cdr }` パターンが必然的に発生するため無効化
      // this のエイリアス代入を禁止
      'unicorn/no-this-assignment': OFF,
      // NOTE: JSDoc / TSDoc は行頭に `*` を付ける標準の書き方で統一しているため無効化 (v80 で追加)
      // ドキュメントコメントの行頭の `*` を取り除かせる
      'unicorn/no-asterisk-prefix-in-documentation-comments': OFF,
      // NOTE: `vi.spyOn()` の戻り値 (`spy`) を真偽値と誤検知するため無効化 (v80 で追加)
      // 真偽値の変数名に `is` / `has` などの接頭辞を強制
      'unicorn/consistent-boolean-name': OFF,
      // NOTE: `/** ... */` の1行の JSDoc を書けなくなるため無効化 (v80 で追加)
      // 1行のブロックコメントを複数行の形に強制
      'unicorn/single-line-block-comment-style': OFF,
      // NOTE: 早期 return のガード節 (`if (...) return null;`) まで三項演算子にまとめさせ、読みにくくなるため1行で書ける場合に限定
      // if 文を三項演算子に置き換えさせる
      'unicorn/prefer-ternary': [ERROR, 'only-single-line'],
    },
  },
];
