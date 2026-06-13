import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.js' },
  format: ['cjs', 'esm'],
  platform: 'neutral',
  target: 'es2022',
  clean: true,
  sourcemap: true,
  // dts is off while the source is plain JavaScript — tsdown's emitter
  // cannot synthesize accurate `.d.ts` files from JSDoc alone.
  dts: false,
  fixedExtension: false,
});
