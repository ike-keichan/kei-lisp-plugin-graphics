/* eslint-disable unicorn/prefer-add-event-listener,
                  unicorn/prefer-math-min-max,
                  sonarjs/no-nested-conditional,
                  sonarjs/no-duplicate-string */

// These lint rules are disabled file-wide so the ported handlers can preserve
// the legacy Graphist patterns (Image#onload, clamp ternaries, mode-flag
// ternaries, repeated diagnostic strings) without per-line escape hatches.

import { Cons, InterpretedSymbol } from 'kei-lisp';

/**
 * @class
 * @classdesc Canvas2D drawing plugin for the kei-lisp interpreter. Implements
 *            the `KeiLispPlugin` contract (`name` / `has` / `apply`) and
 *            exposes 43 `g…` Lisp functions that proxy to a 2D rendering
 *            context.
 * @author Keisuke Ikeda
 * @this {GraphicsPlugin}
 */
export class GraphicsPlugin extends Object {
  /**
   * Dispatch map from a Lisp function name (InterpretedSymbol) to the name of
   * the GraphicsPlugin method that implements it.
   */
  static buildInFunctions = GraphicsPlugin.setup();

  /**
   * Plugin identifier, used for diagnostics.
   */
  name = 'graphics';

  /**
   * Constructor.
   * @constructor
   * @param {HTMLCanvasElement | OffscreenCanvas} canvas - the canvas to draw to
   */
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isOpen = false;
  }

  /**
   * Returns true if this plugin handles the given symbol.
   * @param {InterpretedSymbol} aSymbol - the call symbol
   * @return {boolean} true if `apply` should be called
   */
  has(aSymbol) {
    return GraphicsPlugin.buildInFunctions.has(aSymbol);
  }

  /**
   * Dispatches the given symbol to the matching `g…` method.
   * @param {InterpretedSymbol} aSymbol - the call symbol
   * @param {Cons} args - the evaluated argument list
   * @return {*} the method's result, or `Cons.nil` if dispatch fails
   */
  apply(aSymbol, args) {
    return this.selectProcedure(aSymbol, args);
  }

  /**
   * Resolves the procedure name and invokes the matching method.
   * @param {InterpretedSymbol} procedure - the Lisp symbol
   * @param {Cons} args - the evaluated argument list
   * @return {*} the method's result, or `Cons.nil` if not registered
   */
  selectProcedure(procedure, args) {
    if (GraphicsPlugin.buildInFunctions.has(procedure)) {
      return this.buildInFunction(procedure, args);
    }
    this._print('I could find no procedure description for ' + String(procedure));
    return Cons.nil;
  }

  /**
   * Looks up and invokes the JS method that implements the given Lisp symbol.
   * Throws `TypeError` when the dispatch table points to a method that does
   * not exist on the instance — this matches the legacy behavior, where the
   * Ramda `R.invoker(1, methodName)(args, this)` call would surface the same
   * error by attempting to call `undefined`.
   * @param {InterpretedSymbol} procedure - the Lisp symbol
   * @param {Cons} args - the evaluated argument list
   * @return {*} the method's result
   */
  buildInFunction(procedure, args) {
    const methodName = GraphicsPlugin.buildInFunctions.get(procedure);
    const method = this[methodName];
    if (typeof method !== 'function') {
      throw new TypeError(
        `${this.constructor.name} does not have a method named "${String(methodName)}"`,
      );
    }
    return method.call(this, args);
  }

  /**
   * Checks whether the canvas exposes a usable 2D context.
   * @return {boolean} whether the context is available
   */
  checkSupport() {
    if (this.ctx === null) {
      this._print('Unable to initialize canvas. The browser or machine may not support it.');
      return false;
    }
    return true;
  }

  /**
   * Writes a diagnostic line directly to `process.stderr`, matching the
   * convention used by kei-lisp itself (`Applier.format` writes to
   * `process.stdout`). In a Node runtime this hits the real stderr; in a
   * browser kei-lisp host (e.g. kei-lisp-web) the host typically swaps
   * `process.stderr.write` for a sink that routes to the REPL output panel,
   * so the same call reaches the user via the host's normal output channel.
   * @param {string} line - the line to write
   * @return {void}
   */
  _print(line) {
    process.stderr.write(line + '\n');
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gAlpha(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isNumber(args.car)) {
          const aNumber = args.car <= 0 ? 0 : args.car >= 1 ? 1 : args.car;
          this.ctx.globalAlpha = aNumber;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set alpha.');
        return Cons.nil;
      } catch {
        this._print('Can not set alpha.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gArc(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 6 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.cdr.car)
        ) {
          const aFlag = args.cdr.cdr.cdr.cdr.cdr.car >= 0;
          this.ctx.arc(
            args.car,
            args.cdr.car,
            args.cdr.cdr.car,
            (Math.PI / 180) * args.cdr.cdr.cdr.car,
            (Math.PI / 180) * args.cdr.cdr.cdr.cdr.car,
            aFlag,
          );
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw arc.');
        return Cons.nil;
      } catch {
        this._print('Can not draw arc.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gArcTo(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 5 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.car)
        ) {
          this.ctx.arcTo(
            args.car,
            args.cdr.car,
            args.cdr.cdr.car,
            args.cdr.cdr.cdr.car,
            args.cdr.cdr.cdr.cdr.car,
          );
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw arc to.');
        return Cons.nil;
      } catch {
        this._print('Can not draw arc to.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gBezCurveTo(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 6 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.cdr.car)
        ) {
          this.ctx.bezierCurveTo(
            args.car,
            args.cdr.car,
            args.cdr.cdr.car,
            args.cdr.cdr.cdr.car,
            args.cdr.cdr.cdr.cdr.car,
            args.cdr.cdr.cdr.cdr.cdr.car,
          );
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw bezier curve.');
        return Cons.nil;
      } catch {
        this._print('Can not draw bezier curve.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gClear() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.ctx.save();
        return InterpretedSymbol.of('t');
      } catch {
        this._print('Can not clear.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gClose() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isOpen = false;
        return InterpretedSymbol.of('t');
      } catch {
        this._print('Can not close.');
        return Cons.nil;
      }
    }
    this._print('The canvas has already been closed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gColor(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() >= 1) {
          const aColor = this.selectColor(args);
          this.ctx.fillStyle = aColor;
          this.ctx.strokeStyle = aColor;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set color.');
        return Cons.nil;
      } catch {
        this._print('Can not set color.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gFill() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        this.ctx.fill();
        this.ctx.save();
        return InterpretedSymbol.of('t');
      } catch {
        this._print('Can not fill.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gFillColor(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() >= 1) {
          const aColor = this.selectColor(args);
          this.ctx.fillStyle = aColor;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set fill color.');
        return Cons.nil;
      } catch {
        this._print('Can not set fill color.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gFillRect(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 4 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car)
        ) {
          this.ctx.fillRect(args.car, args.cdr.car, args.cdr.cdr.car, args.cdr.cdr.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw fill rectangle.');
        return Cons.nil;
      } catch {
        this._print('Can not draw fill rectangle.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gFillText(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 3 &&
          Cons.isString(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car)
        ) {
          this.ctx.fillText(args.car, args.cdr.car, args.cdr.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw fill text.');
        return Cons.nil;
      } catch {
        this._print('Can not draw fill text.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gFillTri(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 6 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.cdr.car)
        ) {
          this.ctx.beginPath();
          this.ctx.moveTo(args.car, args.cdr.car);
          this.ctx.lineTo(args.cdr.cdr.car, args.cdr.cdr.cdr.car);
          this.ctx.lineTo(args.cdr.cdr.cdr.cdr.car, args.cdr.cdr.cdr.cdr.cdr.car);
          this.ctx.fill();
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw fill triangle.');
        return Cons.nil;
      } catch {
        this._print('Can not draw fill triangle.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gFinishPath() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        this.ctx.closePath();
        this.ctx.save();
        return InterpretedSymbol.of('t');
      } catch {
        this._print('Can not finish path.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gImage(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 3 &&
          Cons.isString(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car)
        ) {
          const anImage = new Image();
          anImage.src = args.car;
          anImage.onload = () => {
            this.ctx.fillStyle = this.ctx.drawImage(anImage, args.cdr.car, args.cdr.cdr.car);
          };
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        if (
          args.length() === 5 &&
          Cons.isString(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.car)
        ) {
          const anImage = new Image();
          anImage.src = args.car;
          anImage.onload = () => {
            this.ctx.fillStyle = this.ctx.drawImage(
              anImage,
              args.cdr.car,
              args.cdr.cdr.car,
              args.cdr.cdr.cdr.car,
              args.cdr.cdr.cdr.cdr.car,
            );
          };
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw Image.');
        return Cons.nil;
      } catch {
        this._print('Can not draw Image.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gLineTo(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 2 && Cons.isNumber(args.car) && Cons.isNumber(args.cdr.car)) {
          this.ctx.lineTo(args.car, args.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw line to');
        return Cons.nil;
      } catch {
        this._print('Can not draw line to');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gLineCap(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isNumber(args.car)) {
          const aString = args.car === 0 ? 'butt' : args.car > 0 ? 'round' : 'square';
          this.ctx.lineCap = aString;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set line cap.');
        return Cons.nil;
      } catch {
        this._print('Can not set line cap.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gLineJoin(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isNumber(args.car)) {
          const aString = args.car === 0 ? 'miter' : args.car > 0 ? 'round' : 'bevel';
          this.ctx.lineJoin = aString;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set line join.');
        return Cons.nil;
      } catch {
        this._print('Can not set line join.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gLineWidth(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isNumber(args.car)) {
          const aNumber = args.car <= 0 ? 1 : args.car;
          this.ctx.lineWidth = aNumber;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set line width.');
        return Cons.nil;
      } catch {
        this._print('Can not set line width.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gMoveTo(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 2 && Cons.isNumber(args.car) && Cons.isNumber(args.cdr.car)) {
          this.ctx.moveTo(args.car, args.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not move');
        return Cons.nil;
      } catch {
        this._print('Can not move');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gOpen() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === false) {
      try {
        this.isOpen = true;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#000000';
        this.ctx.save();
        this._print('canvas size, width : 600 height : 300');
        return InterpretedSymbol.of('t');
      } catch {
        this._print('Can not open.');
        return Cons.nil;
      }
    }
    this._print('The canvas has already been opened.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gPattern(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 2 && Cons.isString(args.car) && Cons.isNumber(args.cdr.car)) {
          const aString =
            args.cdr.car === 0 ? 'repeat' : args.cdr.car > 0 ? 'repeat-x' : 'repeat-y';
          const anImage = new Image();
          anImage.src = args.car;
          anImage.onload = () => {
            this.ctx.fillStyle = this.ctx.createPattern(anImage, aString);
          };
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set pattern.');
        return Cons.nil;
      } catch {
        this._print('Can not set pattern.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gQuadCurveTo(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 4 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car)
        ) {
          this.ctx.quadraticCurveTo(args.car, args.cdr.car, args.cdr.cdr.car, args.cdr.cdr.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw quadratic curve.');
        return Cons.nil;
      } catch {
        this._print('Can not draw quadratic curve.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gSaveJpeg() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        const anImage = new Image();
        anImage.crossOrigin = 'Anonymous';
        anImage.src = this.canvas.toDataURL('image/jpeg');
        const link = document.createElement('a');
        link.href = anImage.src;
        link.download = 'canvas';
        document.body.append(link);
        link.click();
        link.remove();
        return InterpretedSymbol.of('t');
      } catch {
        this._print(
          "Can not save jpeg.  If you are using an image in the canvas, you can't save jpeg.",
        );
        return Cons.nil;
      }
    }
    this._print('The canvas has already been opened.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gSavePng() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        const anImage = new Image();
        anImage.crossOrigin = 'Anonymous';
        anImage.src = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = anImage.src;
        link.download = 'canvas';
        document.body.append(link);
        link.click();
        link.remove();
        return InterpretedSymbol.of('t');
      } catch {
        this._print(
          "Can not save png. If you are using an image in the canvas, you can't save png.",
        );
        return Cons.nil;
      }
    }
    this._print('The canvas has already been opened.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gScale(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 2 && Cons.isNumber(args.car) && Cons.isNumber(args.cdr.car)) {
          this.ctx.scale(args.car, args.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not scale.');
        return Cons.nil;
      } catch {
        this._print('Can not scale.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gShadowBlur(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      if (args.length() === 1 && Cons.isNumber(args.car)) {
        // Legacy: writes to ctx.Blur (typo) rather than ctx.shadowBlur.
        // Preserved verbatim from the original Graphist.js.
        this.ctx.Blur = args.car;
        this.ctx.save();
        return InterpretedSymbol.of('t');
      }
      this._print('Can not set shadow blur.');
      return Cons.nil;
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gShadowColor(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1) {
          const aColor = this.selectColor(args);
          this.ctx.shadowColor = aColor;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set shadow color.');
        return Cons.nil;
      } catch {
        this._print('Can not set shadow color.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gShadowOffsetX(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      if (args.length() === 1 && Cons.isNumber(args.car)) {
        this.ctx.shadowOffsetX = args.car;
        this.ctx.save();
        return InterpretedSymbol.of('t');
      }
      this._print('Can not set shadow offsetX.');
      return Cons.nil;
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gShadowOffsetY(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      if (args.length() === 1 && Cons.isNumber(args.car)) {
        this.ctx.shadowOffsetY = args.car;
        this.ctx.save();
        return InterpretedSymbol.of('t');
      }
      this._print('Can not set shadow offsetY.');
      return Cons.nil;
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gSleep(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      const sleep = (ms) => {
        const time = Date.now() + ms;
        while (Date.now() < time) {
          // busy wait
        }
      };
      if (args.length() === 1 && Cons.isNumber(args.car)) {
        sleep(args.car);
        return InterpretedSymbol.of('t');
      }
      this._print('Can not sleep');
      return Cons.nil;
    }
    this._print('The canvas has already been opened.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gStartPath() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        this.ctx.beginPath();
        this.ctx.save();
        return InterpretedSymbol.of('t');
      } catch {
        this._print('Can not start path.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @return {*}
   */
  gStroke() {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        this.ctx.stroke();
        this.ctx.save();
        return InterpretedSymbol.of('t');
      } catch {
        this._print('Can not stroke.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gStrokeColor(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() >= 1) {
          const aColor = this.selectColor(args);
          this.ctx.strokeStyle = aColor;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set stroke color');
        return Cons.nil;
      } catch {
        this._print('Can not set stroke color');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gStrokeRect(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 4 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car)
        ) {
          this.ctx.strokeRect(args.car, args.cdr.car, args.cdr.cdr.car, args.cdr.cdr.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw stroke rectangle.');
        return Cons.nil;
      } catch {
        this._print('Can not draw stroke rectangle.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gStrokeText(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 3 &&
          Cons.isString(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car)
        ) {
          this.ctx.strokeText(args.car, args.cdr.car, args.cdr.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw fill text.');
        return Cons.nil;
      } catch {
        this._print('Can not draw fill text.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gStrokeTri(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 6 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.cdr.cdr.car)
        ) {
          this.ctx.beginPath();
          this.ctx.moveTo(args.car, args.cdr.car);
          this.ctx.lineTo(args.cdr.cdr.car, args.cdr.cdr.cdr.car);
          this.ctx.lineTo(args.cdr.cdr.cdr.cdr.car, args.cdr.cdr.cdr.cdr.cdr.car);
          this.ctx.closePath();
          this.ctx.stroke();
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw stroke triangle.');
        return Cons.nil;
      } catch {
        this._print('Can not draw stroke triangle.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gTextAlign(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isString(args.car)) {
          this.ctx.textAlign = args.car;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set text align.');
        return Cons.nil;
      } catch {
        this._print('Can not set text align.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gTextBaseline(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isString(args.car)) {
          this.ctx.textBaseline = args.car;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set text baseline.');
        return Cons.nil;
      } catch {
        this._print('Can not set text baseline.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gTextDirection(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isNumber(args.car)) {
          const aString = args.car === 0 ? 'inherit' : args.car > 0 ? 'rtl' : 'ltr';
          this.ctx.direction = aString;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set text direction.');
        return Cons.nil;
      } catch {
        this._print('Can not set text direction.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gTextFont(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isString(args.car)) {
          this.ctx.font = args.car;
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not set text font.');
        return Cons.nil;
      } catch {
        this._print('Can not set text font.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gTranslate(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 2 && Cons.isNumber(args.car) && Cons.isNumber(args.cdr.car)) {
          this.ctx.translate(args.car, args.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not translate.');
        return Cons.nil;
      } catch {
        this._print('Can not translate.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gRect(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (
          args.length() === 4 &&
          Cons.isNumber(args.car) &&
          Cons.isNumber(args.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.car) &&
          Cons.isNumber(args.cdr.cdr.cdr.car)
        ) {
          this.ctx.rect(args.car, args.cdr.car, args.cdr.cdr.car, args.cdr.cdr.cdr.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not draw rectangle.');
        return Cons.nil;
      } catch {
        this._print('Can not draw rectangle.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * @param {Cons} args
   * @return {*}
   */
  gRotate(args) {
    if (!this.checkSupport()) {
      return Cons.nil;
    }
    if (this.isOpen === true) {
      try {
        if (args.length() === 1 && Cons.isNumber(args.car)) {
          this.ctx.rotate((Math.PI / 180) * args.car);
          this.ctx.save();
          return InterpretedSymbol.of('t');
        }
        this._print('Can not rotate.');
        return Cons.nil;
      } catch {
        this._print('Can not rotate.');
        return Cons.nil;
      }
    }
    this._print('The canvas is closed and cannot be executed.');
    return Cons.nil;
  }

  /**
   * Parses a color spec from the head of the argument Cons. Accepts
   * (1 string), (3 numbers — rgb), or (4 numbers — rgba); falls back to
   * `'black'` on anything else (legacy behavior).
   * @param {Cons} args
   * @return {string} CSS color
   */
  selectColor(args) {
    let aColor = 'black';
    if (args.length() === 1 && Cons.isString(args.car)) {
      aColor = args.car;
    } else if (
      args.length() === 3 &&
      Cons.isNumber(args.car) &&
      Cons.isNumber(args.cdr.car) &&
      Cons.isNumber(args.cdr.cdr.car)
    ) {
      aColor = 'rgb(' + args.car + ', ' + args.cdr.car + ', ' + args.cdr.cdr.car + ')';
    } else if (
      args.length() === 4 &&
      Cons.isNumber(args.car) &&
      Cons.isNumber(args.cdr.car) &&
      Cons.isNumber(args.cdr.cdr.car) &&
      Cons.isNumber(args.cdr.cdr.cdr.car)
    ) {
      aColor =
        'rgba(' +
        args.car +
        ', ' +
        args.cdr.car +
        ', ' +
        args.cdr.cdr.car +
        ', ' +
        args.cdr.cdr.cdr.car +
        ')';
    } else {
      this._print('Can not set color. set color "black".');
    }
    return aColor;
  }

  /**
   * Builds the dispatch table.
   * @return {Map<InterpretedSymbol, string>} the dispatch table
   */
  static setup() {
    const aTable = new Map();
    aTable.set(InterpretedSymbol.of('galpha'), 'gAlpha');
    aTable.set(InterpretedSymbol.of('garc'), 'gArc');
    aTable.set(InterpretedSymbol.of('garc-to'), 'gArcTo');
    aTable.set(InterpretedSymbol.of('gbezcurve-to'), 'gBezCurveTo');
    aTable.set(InterpretedSymbol.of('gclear'), 'gClear');
    aTable.set(InterpretedSymbol.of('gclose'), 'gClose');
    aTable.set(InterpretedSymbol.of('gcolor'), 'gColor');
    aTable.set(InterpretedSymbol.of('gfill'), 'gFill');
    aTable.set(InterpretedSymbol.of('gfill-color'), 'gFillColor');
    aTable.set(InterpretedSymbol.of('gfill-rect'), 'gFillRect');
    aTable.set(InterpretedSymbol.of('gfill-text'), 'gFillText');
    aTable.set(InterpretedSymbol.of('gfill-tri'), 'gFillTri');
    aTable.set(InterpretedSymbol.of('gfinish-path'), 'gFinishPath');
    aTable.set(InterpretedSymbol.of('gimage'), 'gImage');
    aTable.set(InterpretedSymbol.of('gmove-to'), 'gMoveTo');
    aTable.set(InterpretedSymbol.of('gline-to'), 'gLineTo');
    aTable.set(InterpretedSymbol.of('gline-cap'), 'gLineCap');
    aTable.set(InterpretedSymbol.of('gline-join'), 'gLineJoin');
    aTable.set(InterpretedSymbol.of('gline-width'), 'gLineWidth');
    aTable.set(InterpretedSymbol.of('gopen'), 'gOpen');
    aTable.set(InterpretedSymbol.of('gpattern'), 'gPattern');
    aTable.set(InterpretedSymbol.of('gquadcurve-to'), 'gQuadCurveTo');
    aTable.set(InterpretedSymbol.of('gsave-jpeg'), 'gSaveJpeg');
    aTable.set(InterpretedSymbol.of('gsave-png'), 'gSavePng');
    aTable.set(InterpretedSymbol.of('gscale'), 'gScale');
    aTable.set(InterpretedSymbol.of('gshadow-blur'), 'gShadowBlur');
    aTable.set(InterpretedSymbol.of('gshadow-color'), 'gShadowColor');
    aTable.set(InterpretedSymbol.of('gshadow-offsetx'), 'gShadowOffsetX');
    aTable.set(InterpretedSymbol.of('gshadow-offsety'), 'gShadowOffsetY');
    aTable.set(InterpretedSymbol.of('gsleep'), 'gSleep');
    aTable.set(InterpretedSymbol.of('gstart-path'), 'gStartPath');
    aTable.set(InterpretedSymbol.of('gstroke'), 'gStroke');
    aTable.set(InterpretedSymbol.of('gstroke-color'), 'gStrokeColor');
    aTable.set(InterpretedSymbol.of('gstroke-rect'), 'gStrokeRect');
    aTable.set(InterpretedSymbol.of('gstroke-text'), 'gStrokeText');
    aTable.set(InterpretedSymbol.of('gstroke-tri'), 'gStrokeTri');
    aTable.set(InterpretedSymbol.of('gtext-align'), 'gTextAlign');
    aTable.set(InterpretedSymbol.of('gtext-dire'), 'gTextDirection');
    aTable.set(InterpretedSymbol.of('gtext-font'), 'gTextFont');
    aTable.set(InterpretedSymbol.of('gtext-line'), 'gTextBaseline');
    aTable.set(InterpretedSymbol.of('gtranslate'), 'gTranslate');
    aTable.set(InterpretedSymbol.of('grect'), 'gRect');
    aTable.set(InterpretedSymbol.of('grotate'), 'gRotate');
    return aTable;
  }
}
