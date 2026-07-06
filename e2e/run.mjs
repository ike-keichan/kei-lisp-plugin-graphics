/**
 * @file
 * Browser end-to-end test: builds the examples with Vite, serves the build,
 * renders it in real Chromium via Playwright, and asserts the pixels the
 * Lisp program painted. No golden images — the expected colors are asserted
 * directly, so the test is robust across platforms.
 *
 * Run with:
 *   pnpm build && pnpm exec playwright install chromium && pnpm e2e
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = fileURLToPath(new URL('../examples/', import.meta.url));
const outDirectory = 'dist-e2e';

await build({ root, logLevel: 'warn', build: { outDir: outDirectory, emptyOutDir: true } });
const server = await preview({ root, build: { outDir: outDirectory } });
const url = server.resolvedUrls?.local[0];
assert.ok(url, 'vite preview did not report a local URL');

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(String(error));
  });
  await page.goto(url, { waitUntil: 'networkidle' });

  const samples = await page.evaluate(() => {
    const canvas = document.querySelector('#stage');
    const context = canvas.getContext('2d');
    const px = (x, y) => [...context.getImageData(x, y, 1, 1).data];
    return {
      background: px(620, 20),
      filledRect: px(140, 100),
      circle: px(400, 100),
      rotatedRect: px(320, 300),
    };
  });

  assert.deepEqual(errors, [], 'the example page threw errors');
  assert.deepEqual(samples.background, [255, 255, 255, 255], 'background should be white');
  assert.deepEqual(samples.filledRect, [70, 130, 180, 255], 'rect should be steelblue');
  assert.deepEqual(samples.circle, [255, 160, 80, 255], 'circle should be rgb(255,160,80)');
  assert.deepEqual(samples.rotatedRect, [220, 20, 60, 255], 'rotated rect should be crimson');

  console.log('E2E OK:', JSON.stringify(samples));
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolve()));
  });
}
