# Non-goals

Things this project has deliberately decided **not** to do, and why. The
point of writing them down is to avoid re-litigating the same questions and
to make it easy to answer external requests with a link.

Decisions here are not eternal — if the context changes (new runtime
capabilities, a real user need), open an issue referencing this document.

## Performance optimization of the plugin layer

The hot path of every `g…` call is the Canvas 2D operation itself; the
plugin's dispatch and argument parsing are negligible in comparison.
Refactoring for speed (method-reference dispatch tables, argument-parsing
micro-optimizations) is not pursued. Readability wins.

## Bulk pixel-transfer API (`ImageData`)

Exposing `getImageData` / `putImageData` wholesale to Lisp would require
representing large pixel arrays as Lisp lists, which is impractical at any
useful canvas size. `gpixel` / `gset-pixel` cover single-pixel access;
anything bigger should be done on the TypeScript side.

## DOM-coupled Canvas APIs

`drawFocusIfNeeded` and `scrollPathIntoView` depend on DOM elements and
focus/scroll state that make no sense from a Lisp drawing program. They are
intentionally not exposed.

## Asynchronous drawing semantics

kei-lisp evaluates synchronously, so `gsleep` busy-waits and `gimage` /
`gpattern` draw when their image finishes loading (mitigated by the
per-instance image cache). A promise-based or scheduler-based drawing model
would require changes in kei-lisp itself and is out of scope here.

## Mutation testing / bundle-size tracking

The suite already enforces coverage thresholds, real-browser E2E pixel
assertions, and packaging checks (publint / arethetypeswrong). For a
dependency-free ~40 kB library, mutation testing and size budgets cost more
to maintain than they would catch.

## Multi-language documentation

Documentation is English-only. Maintaining a Japanese mirror would double
the documentation surface of a single-maintainer hobby project and drift out
of date.

## Production support

As stated in the [README](../README.md), this is a toy / hobby project.
There is no support commitment, no LTS, and no compatibility guarantee
beyond what SemVer communicates.
