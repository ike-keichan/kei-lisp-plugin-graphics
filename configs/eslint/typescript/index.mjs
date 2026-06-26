import tseslint from 'typescript-eslint';
import { FILES, RULE_LEVEL } from '../const/index.mjs';

const { SRC, TEST } = FILES;
const { ERROR, WARN, OFF } = RULE_LEVEL;

/**
 * ESLint config for typescript-eslint.
 */
export const typescriptConfigs = [
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: SRC.concat(TEST),
  })),
  {
    files: SRC.concat(TEST),
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // any の使用を禁止
      '@typescript-eslint/no-explicit-any': ERROR,
      // null 非許容アサーション（!）の使用を禁止
      '@typescript-eslint/no-non-null-assertion': ERROR,
      // デフォルトの toString のみを持つ値の文字列化を禁止
      '@typescript-eslint/no-base-to-string': ERROR,
      // 同型への不要な型変換 (Number(num), String(str) 等) を禁止
      '@typescript-eslint/no-unnecessary-type-conversion': ERROR,
      // メソッドの戻り値型に `this` 型の使用を強制
      '@typescript-eslint/prefer-return-this-type': ERROR,
      // NOTE: コードベース全体でクラス形式に統一しているため無効化
      // インスタンスを持たないクラスを禁止
      '@typescript-eslint/no-extraneous-class': OFF,
      // NOTE: Lisp の linked list 走査で `let aCons = this; while (...) { aCons = aCons.cdr }` パターンが必然的に発生するため無効化
      // this のエイリアスを禁止
      '@typescript-eslint/no-this-alias': OFF,
      // NOTE: テンプレートリテラル内での number の使用を許可（rgb/rgba カラー文字列の組み立て等）
      '@typescript-eslint/restrict-template-expressions': [ERROR, { allowNumber: true }],
      // NOTE: eslint-plugin-unused-imports の no-unused-vars（_プレフィックスで抑制可能）に委譲するため無効化
      // strictTypeChecked がこのルールを有効化するため、unusedImportsConfigs の OFF 設定が上書きされないよう再度 OFF にする
      '@typescript-eslint/no-unused-vars': OFF,
    },
  },
  {
    // テストコードではモック等で any を使いやすくするため警告に緩和
    files: TEST,
    rules: {
      '@typescript-eslint/no-explicit-any': WARN,
    },
  },
];
