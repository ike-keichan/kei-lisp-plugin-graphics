import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['cjs', 'esm'],
  platform: 'neutral',
  target: 'es2022',
  clean: true,
  sourcemap: true,
  dts: true,
  fixedExtension: false,
});
