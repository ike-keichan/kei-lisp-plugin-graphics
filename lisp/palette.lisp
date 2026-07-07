;; @file palette.lisp
;; Color-palette helpers for kei-lisp-plugin-graphics.
;;
;; Usage:
;;   (load "node_modules/kei-lisp-plugin-graphics/lisp/palette.lisp")
;;   (gpalette 0)         ; => "#4e79a7"
;;   (gpalette-color 3)   ; sets fill and stroke color to palette entry 3

;; An 8-color categorical palette (Tableau 10 subset). Any integer index is
;; valid: indexes wrap around the 8 entries.
(setq *gpalette*
      '("#4e79a7" "#f28e2b" "#e15759" "#76b7b2" "#59a14f" "#edc948" "#b07aa1" "#9c755f"))

;; Returns the N-th palette color string, 0-based, wrapping modulo the
;; palette size. kei-lisp's mod truncates toward zero, so negative indexes
;; need the double-mod to wrap; nth is 1-based, hence the + 1. A palette
;; slot is discrete, so a non-integer index has no meaning and signals an
;; error instead of silently missing (which would return nil, then paint
;; black through gpalette-color).
(defun gpalette (n)
  (unless (integerp n)
    (error "gpalette: index must be an integer"))
  (let ((size (length *gpalette*)))
    (nth (+ 1 (mod (+ (mod n size) size) size)) *gpalette*)))

;; Sets both fill and stroke color to the N-th palette color.
(defun gpalette-color (n)
  (gcolor (gpalette n)))
