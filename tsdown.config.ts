import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.js' },
  format: ['cjs', 'esm'],
  platform: 'neutral',
  target: 'es2022',
  clean: true,
  sourcemap: true,
  // Type declarations are emitted in the TypeScript-migration phase. The
  // current source is plain JavaScript and tsdown's dts emitter cannot
  // synthesize accurate `.d.ts` files from JSDoc alone.
  dts: false,
  fixedExtension: false,
});
