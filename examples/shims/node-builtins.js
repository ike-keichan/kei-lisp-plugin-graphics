/**
 * @file
 * Browser stand-ins for the Node builtins that kei-lisp imports at module
 * scope but only exercises on its Node-only paths (REPL input, VM sandboxing,
 * heap statistics). The drawing APIs used by this example never call them.
 */
export function createRequire() {
  return () => {
    throw new Error('require() is not available in the browser');
  };
}

export default {};
