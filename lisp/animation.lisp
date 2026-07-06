;; @file animation.lisp
;; Frame-loop helper for kei-lisp-plugin-graphics.
;;
;; Usage:
;;   (load "node_modules/kei-lisp-plugin-graphics/lisp/animation.lisp")
;;   (ganimate 30 20 (lambda (frame) (gclear) (gfill-rect (* frame 4) 20 30 30)))
;;
;; Note: gsleep busy-waits between frames — it blocks the thread and burns
;; CPU, so keep FRAMES x DELAY small (see docs/graphics.md).

;; Calls DRAW with the frame index 0 .. FRAMES-1, sleeping DELAY
;; milliseconds after each frame.
(defun ganimate (frames delay draw)
  (do ((frame 0 (+ frame 1)))
      ((>= frame frames) t)
    (draw frame)
    (gsleep delay)))
