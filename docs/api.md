# API Reference

TypeScript / JavaScript API for `kei-lisp-plugin-graphics`. For the Lisp
function reference, see [`graphics.md`](./graphics.md).

## Exports

```ts
import { createGraphicsPlugin, GraphicsPlugin } from 'kei-lisp-plugin-graphics';
```

The `kei-lisp` types referenced below come from the kei-lisp package
itself; install both as peer dependencies:

```ts
import type { KeiLispPlugin, PluginContext } from 'kei-lisp';
```

## `createGraphicsPlugin(options)`

Factory that returns a fresh plugin bound to the given canvas. Most users
should reach for this rather than instantiating `GraphicsPlugin` directly.

```ts
function createGraphicsPlugin(options: {
  canvas: HTMLCanvasElement | OffscreenCanvas;
}): KeiLispPlugin;
```

### Parameters

| Name             | Type                                     | Description                                                               |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| `options.canvas` | `HTMLCanvasElement` \| `OffscreenCanvas` | The surface to draw to. A 2D context is obtained eagerly at construction. |

### Returns

A `KeiLispPlugin` ready to register on a `LispInterpreter`:

```ts
import { LispInterpreter } from 'kei-lisp';
import { createGraphicsPlugin } from 'kei-lisp-plugin-graphics';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const interpreter = new LispInterpreter();
interpreter.use(createGraphicsPlugin({ canvas }));
```

### Throws

- `EvalError` — if `canvas.getContext('2d')` returns `null`.

## `GraphicsPlugin`

The plugin class implementing `KeiLispPlugin`. Exposed for advanced uses
(custom subclassing, direct construction, testing).

### `new GraphicsPlugin(canvas)`

```ts
constructor(canvas: HTMLCanvasElement | OffscreenCanvas);
```

Same behavior as `createGraphicsPlugin({ canvas })`.

### `plugin.name`

Read-only string `"graphics"`. Used by kei-lisp for plugin diagnostics.

### `plugin.canvas`

The bound canvas. Mutating this field after construction is not
supported — create a new plugin instance for a different canvas.

### `plugin.ctx`

The 2D rendering context. Type:
`CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D`.

### `plugin.isOpen`

`true` after a successful `gopen` call, `false` after `gclose` (and
before the first `gopen`).

### `plugin.has(symbol)`

```ts
has(symbol: InterpretedSymbol): boolean;
```

Returns true if the plugin handles the given Lisp symbol (i.e., it is
one of the 43 `g…` functions). Called by the interpreter as part of
plugin-chain dispatch.

### `plugin.apply(symbol, args, ctx)`

```ts
apply(symbol: InterpretedSymbol, args: Cons, ctx: PluginContext): LispValue;
```

Dispatches the given symbol to the matching `g…` method. Arguments are
already evaluated by the interpreter before being passed here.

Throws `EvalError` when:

- the symbol is not registered (caller mistake — `has(symbol)` returned `false`),
- arity / type validation inside the method fails,
- the canvas is not open (`gopen` has not been called).

## `KeiLispPlugin` contract

The plugin satisfies the `KeiLispPlugin` interface defined by kei-lisp:

```ts
interface KeiLispPlugin {
  readonly name: string;
  has(symbol: InterpretedSymbol): boolean;
  apply(symbol: InterpretedSymbol, args: Cons, ctx: PluginContext): LispValue;
}
```

See [kei-lisp's plugin guide](https://github.com/ike-keichan/kei-lisp/blob/main/docs/plugins.md)
for the full dispatch protocol and `PluginContext` shape.

## Browser-only handlers

Three handlers require a browser DOM:

- `gimage` and `gpattern` use `new Image()` and async `load` listeners.
- `gsave-png` / `gsave-jpeg` create a transient `<a download>` element.

Calling them in a Node.js or `OffscreenCanvas`-only worker context will
throw `EvalError` (or `ReferenceError` for `Image`). All other handlers
work against any `CanvasRenderingContext2D`-compatible context.
