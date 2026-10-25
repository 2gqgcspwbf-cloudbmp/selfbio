/**
 * Displacement maps for the polished glass bevel (used by GlassLens, Chromium only).
 *
 * R and G hold the x / y shift (128 = none) and B is the bevel mask (255 polished, 0 frosted).
 * Shifts always point inward along the edge normal, so the bevel never samples outside the
 * element (a backdrop filter can't see past its border box). The profile is (1 - t)², steepest
 * at the edge and flat where it meets the face: as long as `scale <= bezel` it squeezes the
 * backdrop into the rim without ever folding it over.
 *
 * A map comes in three slices (top cap, one middle row stretched to fit, bottom cap), so a
 * height change (presence rows springing in) only moves feImage attributes. Only a width
 * change re-encodes.
 */

export interface LensSlices {
  top: string;
  mid: string;
  bottom: string;
  /** Height of each cap, CSS px. */
  cap: number;
}

function geometry(width: number, height: number, radius: number, bezel: number) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, height);
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  // Rows further than this from the top or bottom edge are all identical.
  const reach = Math.ceil(Math.max(r, bezel)) + 2;
  // So a tall element is drawn as a short stand-in and its middle row is stretched.
  const hv = Math.max(2, Math.round(Math.min(h, reach * 4)));
  const cap = Math.min(reach, Math.floor(hv / 2));
  return { w, r, hv, cap };
}

/** Changes only when the slices would look different. */
export function lensKey(width: number, height: number, radius: number, bezel: number) {
  const g = geometry(width, height, radius, bezel);
  return `${g.w}:${g.hv}:${g.r}`;
}

export function buildLensSlices(width: number, height: number, radius: number, bezel: number): LensSlices {
  const { w, r, hv, cap } = geometry(width, height, radius, bezel);
  return {
    top: paint(w, hv, r, bezel, 0, cap),
    mid: paint(w, hv, r, bezel, Math.floor(hv / 2), 1),
    bottom: paint(w, hv, r, bezel, hv - cap, cap),
    cap,
  };
}

function paint(w: number, hv: number, r: number, bezel: number, y0: number, rows: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(w, rows);
  const px = img.data;
  const hw = w / 2;
  const hh = hv / 2;

  for (let j = 0; j < rows; j++) {
    const y = y0 + j + 0.5 - hh;
    const qy = Math.abs(y) - (hh - r);
    for (let i = 0; i < w; i++) {
      const x = i + 0.5 - hw;
      const qx = Math.abs(x) - (hw - r);
      // Distance in from the edge (d), and the edge's outward normal (nx, ny).
      let d: number;
      let nx = 0;
      let ny = 0;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy);
        d = r - l;
        nx = (Math.sign(x) * qx) / l;
        ny = (Math.sign(y) * qy) / l;
      } else if (qx > qy) {
        d = r - qx;
        nx = Math.sign(x);
      } else {
        d = r - qy;
        ny = Math.sign(y);
      }
      const t = Math.min(1, Math.max(0, d / bezel));
      const k = (1 - t) * (1 - t); // convex bevel: steepest at the edge, flat where it meets the face
      const s = Math.min(1, Math.max(0, (t - 0.35) / 0.65));
      const o = (j * w + i) * 4;
      px[o] = Math.round(127.5 * (1 - nx * k));
      px[o + 1] = Math.round(127.5 * (1 - ny * k));
      px[o + 2] = Math.round(255 * (1 - s * s * (3 - 2 * s))); // polished outer third, easing into frost
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
