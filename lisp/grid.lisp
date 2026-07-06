;; @file grid.lisp
;; Grid-drawing pattern for kei-lisp-plugin-graphics.
;;
;; Usage:
;;   (load "node_modules/kei-lisp-plugin-graphics/lisp/grid.lisp")
;;   (ggrid 40)

;; Draws vertical and horizontal grid lines every STEP pixels across the
;; whole canvas, using the current stroke color and line width.
(defun ggrid (step)
  (do ((x step (+ x step)))
      ((>= x (gwidth)) t)
    (gstart-path)
    (gmove-to x 0)
    (gline-to x (gheight))
    (gstroke))
  (do ((y step (+ y step)))
      ((>= y (gheight)) t)
    (gstart-path)
    (gmove-to 0 y)
    (gline-to (gwidth) y)
    (gstroke))
  t)
