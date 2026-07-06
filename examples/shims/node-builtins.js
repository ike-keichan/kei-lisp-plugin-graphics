/**
 * @file
 * Browser stand-ins for the Node builtins that kei-lisp imports at module
 * scope but only exercises on its Node-only paths (REPL input, VM sandboxing,
 * heap statistics). The drawing APIs used by this example never call them.
 */
function unavailableRequire() {
  throw new Error('require() is not available in the browser');
}

export function createRequire() {
  return unavailableRequire;
}

export function readFileSync() {
  throw new Error(
    '(load ...) reads from the filesystem and is not available in the browser; fetch the file and evaluate its text instead',
  );
}

export default {};
