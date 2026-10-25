import type { PointerEvent } from "react";

/**
 * Aims a glass surface's light at the pointer. Attach to onPointerMove and onPointerDown.
 *
 * - `--mx` / `--my` on the surface (mouse only, not under reduced motion): the face sheen and the rim glint.
 * - `--px` / `--py` on the `.lg-control` under the pointer (any pointer, so a touch blooms from the
 *   finger): that control's rim and inner light.
 *
 * CSS variables only, no React state; every rect is read before anything is written.
 */
let reduceMotion: MediaQueryList | undefined;

export function aimGlassLight(e: PointerEvent<HTMLElement>) {
  const surface = e.currentTarget;
  const control = e.target instanceof Element ? e.target.closest<HTMLElement>(".lg-control") : null;
  // Looked up lazily (this module is also imported during SSR); `.matches` follows OS changes live.
  reduceMotion ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  // The surface sheen is switched off under reduced motion, so moving it would only repaint the card
  // (and re-run its lens) for nothing. The control's press light is kept.
  const s = e.pointerType === "mouse" && !reduceMotion.matches ? surface.getBoundingClientRect() : null;
  const c = control && surface.contains(control) ? control.getBoundingClientRect() : null;

  if (s) {
    surface.style.setProperty("--mx", `${(e.clientX - s.left).toFixed(1)}px`);
    surface.style.setProperty("--my", `${(e.clientY - s.top).toFixed(1)}px`);
  }
  if (control && c) {
    control.style.setProperty("--px", `${(e.clientX - c.left).toFixed(1)}px`);
    control.style.setProperty("--py", `${(e.clientY - c.top).toFixed(1)}px`);
  }
}
