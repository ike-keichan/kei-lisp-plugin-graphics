import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['cjs', 'esm'],
  platform: 'node',
  target: 'node24',
  clean: true,
  sourcemap: true,
  shims: true,
  dts: true,
  fixedExtension: false,
});
