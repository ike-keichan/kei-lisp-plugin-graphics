import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

// kei-lisp imports node:module / node:vm / node:v8 at module scope (used only
// on its Node-only paths). Vite's default externalization stubs them with
// empty modules, which breaks the top-level `createRequire(...)` call — so
// point them at a tiny shim that provides just enough surface.
const shim = fileURLToPath(new URL('shims/node-builtins.js', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'node:module': shim,
      'node:vm': shim,
      'node:v8': shim,
    },
  },
});
