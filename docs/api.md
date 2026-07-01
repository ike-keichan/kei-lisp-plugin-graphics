# API Reference

TypeScript / JavaScript API for embedding kei-lisp-plugin-graphics.

For the Lisp-side drawing functions, see [graphics](./graphics.md).

## Exports

```ts
import { createGraphicsPlugin, GraphicsPlugin } from 'kei-lisp-plugin-graphics';
```

## `createGraphicsPlugin`

Factory function. Creates a `GraphicsPlugin` bound to the given canvas and
returns it ready to register with `LispInterpreter.use()`.

```ts
import { LispInterpreter } from 'kei-lisp';
import { createGraphicsPlugin } from 'kei-lisp-plugin-graphics';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const interpreter = new LispInterpreter();
interpreter.use(createGraphicsPlugin({ canvas }));
```

### Signature

```ts
function createGraphicsPlugin(options: {
  canvas: HTMLCanvasElement | OffscreenCanvas;
}): GraphicsPlugin;
```

### Parameters

| Parameter        | Type                                   | Description           |
| ---------------- | -------------------------------------- | --------------------- |
| `options.canvas` | `HTMLCanvasElement \| OffscreenCanvas` | The canvas to draw to |

### Returns

A `GraphicsPlugin` instance that implements the
[`KeiLispPlugin`](https://github.com/ike-keichan/kei-lisp/blob/main/docs/plugins.md)
interface.

## `GraphicsPlugin`

The plugin class. Implements `KeiLispPlugin` (`name` / `has` / `apply`) and
exposes 43 `g…` drawing primitives to the Lisp evaluator.

You can instantiate it directly if you need to inspect the instance:

```ts
import { GraphicsPlugin } from 'kei-lisp-plugin-graphics';

const plugin = new GraphicsPlugin(canvas);
console.log(plugin.name); // "graphics"
```

See [graphics](./graphics.md) for the full list of Lisp-callable functions.
