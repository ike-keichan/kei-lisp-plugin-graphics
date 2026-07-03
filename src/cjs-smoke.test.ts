import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

// Guards the dual output declared in package.json `exports`: a build-config
// change that silently breaks the CJS bundle should fail here. The bundle is
// present because the `prepare` script builds `dist/` on install.
const require_ = createRequire(import.meta.url);

describe('CJS build (dist/index.cjs)', () => {
  it('can be loaded with require() and exposes the public API', () => {
    const cjsModule = require_('../dist/index.cjs') as typeof import('./index.js');
    expect(typeof cjsModule.createGraphicsPlugin).toBe('function');
    expect(typeof cjsModule.GraphicsPlugin).toBe('function');
  });

  it('creates a working plugin from the CJS entry point', () => {
    const cjsModule = require_('../dist/index.cjs') as typeof import('./index.js');
    const canvas = document.createElement('canvas');
    const plugin = cjsModule.createGraphicsPlugin({ canvas });
    expect(plugin).toBeInstanceOf(cjsModule.GraphicsPlugin);
    expect(plugin.name).toBe('graphics');
    expect(plugin.canvas).toBe(canvas);
  });
});
