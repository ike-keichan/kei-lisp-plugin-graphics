/**
 * @file
 * Regenerates the README screenshot (docs/assets/basic-drawing.png) by
 * building the examples, rendering them in Chromium, and capturing the
 * canvas at 2x device scale.
 *
 * Run with:
 *   pnpm exec playwright install chromium && pnpm screenshot
 */
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = fileURLToPath(new URL('../examples/', import.meta.url));
const output = fileURLToPath(new URL('../docs/assets/basic-drawing.png', import.meta.url));
const outDirectory = 'dist-e2e';

await build({ root, logLevel: 'warn', build: { outDir: outDirectory, emptyOutDir: true } });
const server = await preview({ root, build: { outDir: outDirectory } });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('vite preview did not report a local URL');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#stage').screenshot({ path: output });
  console.log(`screenshot saved: ${output}`);
} finally {
  await browser.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((error) => (error ? reject(error) : resolve()));
  });
}
