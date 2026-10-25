/**
 * Hebrew — "שלום" (shalom) in modern Israeli cursive (כתב יד), written right to left.
 *
 * Letters are unjoined, as Israelis write them: one pen stroke per letter with a
 * lift between, laid out right to left (ש rightmost, ם leftmost) and written in
 * that order. Body height 100 (as Latin x-height), the ל ascender ~252,
 * baseline 0, y up, upright. Each letter is designed as Bézier/ellipse pieces,
 * lightly smoothed where pieces meet and resampled into evenly spaced nodes for
 * the engine's spline.
 */
import { translate } from "../engine.mjs";

/* ---------------------------------------------------------------- */
/* Path helpers (local to Hebrew)                                    */
/* ---------------------------------------------------------------- */

const r2 = (v) => Math.round(v * 100) / 100;
const rad = (d) => (d * Math.PI) / 180;

/** Dense points along a cubic Bézier. */
function B(p0, p1, p2, p3, n = 64) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = 1 - t;
    const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

/** Dense points along a (super)ellipse from a0 to a1 degrees (y up, 0 = right, 90 = top). */
function A(cx, cy, rx, ry, a0, a1, p = 2) {
  const out = [];
  const e = 2 / p;
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 2));
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n);
    const c = Math.cos(a);
    const s = Math.sin(a);
    out.push([cx + rx * Math.sign(c) * Math.abs(c) ** e, cy + ry * Math.sign(s) * Math.abs(s) ** e]);
  }
  return out;
}

/** Point and unit tangent of an ellipse at angle a (degrees), for a clockwise (cw) or counter-clockwise pen. */
function onEllipse(cx, cy, rx, ry, a, cw = true) {
  const p = [cx + rx * Math.cos(rad(a)), cy + ry * Math.sin(rad(a))];
  const v = cw ? [rx * Math.sin(rad(a)), -ry * Math.cos(rad(a))] : [-rx * Math.sin(rad(a)), ry * Math.cos(rad(a))];
  const l = Math.hypot(v[0], v[1]);
  return { p, t: [v[0] / l, v[1] / l] };
}

/** Points spaced evenly (by arc length) along a polyline, ends kept exactly. */
function resample(pts, spacing) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum.at(-1);
  const n = Math.max(2, Math.round(total / spacing));
  const out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const d = (total * k) / n;
    while (j < pts.length - 2 && cum[j + 1] < d) j++;
    const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t]);
  }
  return out;
}

/**
 * Gaussian smoothing along a path sampled at unit spacing; sigmaAt(i) gives the
 * kernel width (units) at point i. The kernel narrows toward the path ends
 * (symmetric window, no padding), so end points stay exact and terminals keep
 * the curvature they were drawn with instead of being flattened into stubs.
 */
function smooth(pts, sigmaAt) {
  const n = pts.length;
  return pts.map((p, i) => {
    const sigma = sigmaAt(i);
    const d = Math.min(i, n - 1 - i);
    const s = sigma * Math.min(1, d / (3 * sigma));
    const w = Math.min(d, Math.ceil(3 * s));
    if (w < 1 || s < 0.3) return p;
    let x = 0, y = 0, sum = 0;
    for (let k = -w; k <= w; k++) {
      const g = Math.exp(-(k * k) / (2 * s * s));
      x += pts[i + k][0] * g;
      y += pts[i + k][1] * g;
      sum += g;
    }
    return [x / sum, y / sum];
  });
}

/**
 * Places nodes along a unit-spaced path with a step that follows the local
 * radius of curvature (about 0.28 R, 3 to 10 units), and shortens it toward
 * both ends. Catmull–Rom curvature wobbles grow with step/radius, so tight
 * turns get dense nodes and long sweeps sparse ones; short end steps keep the
 * engine's straight end extrapolation invisible.
 */
function adaptiveNodes(fine, { k = 0.28, min = 3, max = 10 } = {}) {
  const n = fine.length;
  const radius = fine.map((_, i) => {
    const a = fine[Math.max(0, i - 3)], b = fine[i], c = fine[Math.min(n - 1, i + 3)];
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const abc = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]) * Math.hypot(c[0] - a[0], c[1] - a[1]);
    return Math.abs(cross) < 1e-9 ? Infinity : abc / (2 * Math.abs(cross));
  });
  const step = (s) => {
    const i = Math.round(s);
    let r = Infinity;
    for (let j = Math.max(0, i - 6); j <= Math.min(n - 1, i + 6); j++) r = Math.min(r, radius[j]);
    const d = Math.min(s, n - 1 - s);
    return Math.max(min * 0.7, Math.min(Math.max(min, Math.min(max, k * r)), 2 + 0.6 * d));
  };
  const at = (s) => {
    const i = Math.min(n - 2, Math.floor(s));
    const t = s - i;
    return [fine[i][0] + (fine[i + 1][0] - fine[i][0]) * t, fine[i][1] + (fine[i + 1][1] - fine[i][1]) * t];
  };
  const L = n - 1;
  const pos = [0];
  while (pos.at(-1) < L) pos.push(pos.at(-1) + step(pos.at(-1)));
  // Land the last node exactly on the end: drop the overshoot or stretch to it.
  if (pos.length > 2 && pos.at(-1) - L > (pos.at(-1) - pos.at(-2)) / 2) pos.pop();
  const scale = L / pos.at(-1);
  return pos.map((s) => at(s * scale));
}

/**
 * Joins dense pieces into one pen path, evens out curvature changes where the
 * pieces meet, and returns nodes along it for the engine's spline, spaced so
 * the spline reproduces the designed curve without wobbles. joins[k] widens
 * the smoothing around the join after piece k, so a straight run eases into a
 * curve (or one curve into its reverse) instead of switching abruptly.
 */
function pen({ sigma = 3, joins = {} }, ...pieces) {
  const pts = [];
  const joinAt = [];
  for (const [k, piece] of pieces.entries()) {
    for (const p of piece) {
      const last = pts.at(-1);
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-6) pts.push(p);
    }
    joinAt[k] = pts.length - 1;
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const even = resample(pts, 1);
  const unit = (even.length - 1) / cum.at(-1);
  const wide = Object.entries(joins).map(([k, s]) => ({ at: cum[joinAt[k]] * unit, s }));
  const sigmaAt = (i) => wide.reduce((acc, { at, s }) => acc + (s - sigma) * Math.exp(-(((i - at) / (2.5 * s)) ** 2)), sigma);
  const fine = smooth(even, sigmaAt);
  return adaptiveNodes(fine).map(([x, y]) => [r2(x), r2(y)]);
}

const PEN = { sigma: 3 };

/* ---------------------------------------------------------------- */
/* Letters (local coordinates, baseline 0, y up, body height 100)    */
/* ---------------------------------------------------------------- */

// ש — the school-model shin: a U whose left side ends in a small eye (like a
// Latin "e" set into a "u"), with a tall right arm. Written from the top of the
// right arm: down, clockwise round the bottom, up the left side, over the eye
// and back down-left into the stem, finishing inside the letter.
const EYE = { cx: 25, cy: 81, rx: 16.5, ry: 19 };
const SHIN = pen(
  PEN,
  B([77, 100], [78.5, 44], [71, 0], [43, 0]),
  B([43, 0], [17, 0], [8.5, 30], [8.5, EYE.cy]),
  A(EYE.cx, EYE.cy, EYE.rx, EYE.ry, 180, -95),
  B([EYE.cx - 1.4, EYE.cy - EYE.ry], [19, 61.5], [14.5, 59.5], [9.5, 57]),
);

// ל — δ-like: a soft open arch at the top of the ascender (the pen starts on its
// right, rises over it and turns down), a long neck that leans into the bowl,
// and the bowl drawn clockwise, its tail curling back up toward the neck.
const BOWL = { cx: 46, cy: 41, rx: 32, ry: 41, entry: 28, exit: 116 };
const ARCH = { cx: 40, cy: 239, rx: 13.5, ry: 13, end: 190 };
const LAMED = (() => {
  const top = onEllipse(ARCH.cx, ARCH.cy, ARCH.rx, ARCH.ry, ARCH.end, false);
  const j = onEllipse(BOWL.cx, BOWL.cy, BOWL.rx, BOWL.ry, BOWL.entry, true);
  return pen(
    { ...PEN, joins: { 1: 10 } },
    A(ARCH.cx, ARCH.cy, ARCH.rx, ARCH.ry, 25, ARCH.end),
    B(top.p, [top.p[0] + top.t[0] * 60, top.p[1] + top.t[1] * 60], [j.p[0] - j.t[0] * 65, j.p[1] - j.t[1] * 65], j.p),
    A(BOWL.cx, BOWL.cy, BOWL.rx, BOWL.ry, BOWL.entry, BOWL.exit - 360),
  );
})();

// ו — a single upright downstroke, the full body height.
const VAV = [
  [8, 98],
  [7.7, 50],
  [7.2, 2],
];

// ם — a rounded, slightly squared box, started at its pointed top-left corner
// and drawn clockwise: along the top, down the right side, back along the
// bottom and up the left side, which closes the corner and runs a few units
// past it. That small ear above the corner is the native cue of ם (the round
// ס has no corner).
const MEM = { cx: 42, cy: 50, rx: 36, ry: 50, p: 2.25 };
const CORNER = [4.4, 94.5];
const FINAL_MEM = pen(
  PEN,
  B(CORNER, [16, 98], [27, 100], [MEM.cx, 100]),
  A(MEM.cx, MEM.cy, MEM.rx, MEM.ry, 90, -180, MEM.p),
  B([MEM.cx - MEM.rx, MEM.cy], [MEM.cx - MEM.rx, 70], [CORNER[0] + 0.9, 85], [CORNER[0], CORNER[1] + 0.5]),
  B([CORNER[0], CORNER[1] + 0.5], [CORNER[0] - 0.4, CORNER[1] + 4.5], [CORNER[0] - 1.3, CORNER[1] + 8], [CORNER[0] - 3, CORNER[1] + 11.5]),
);

/* ---------------------------------------------------------------- */
/* Layout: right to left, with even optical gaps (centre-line units) */
/* ---------------------------------------------------------------- */

const xs = (nodes) => [Math.min(...nodes.map((n) => n[0])), Math.max(...nodes.map((n) => n[0]))];

/** Places letters right to left; gaps[i] is the centre-line gap after letter i. */
function layoutRtl(letters, gaps) {
  const placed = [];
  let right = 0;
  letters.forEach((nodes, i) => {
    const [x0, x1] = xs(nodes);
    const dx = right - x1;
    placed.push(translate(nodes, dx));
    right = x0 + dx - (gaps[i] ?? 0);
  });
  // Shift so the leftmost letter starts near x = 0.
  const minX = Math.min(...placed.map((n) => xs(n)[0]));
  return placed.map((n) => translate(n, -minX).map(([x, y]) => [r2(x), r2(y)]));
}

// ש | ל: two rounds facing each other; ל | ו: round against straight; ו | ם.
const [shin, lamed, vav, mem] = layoutRtl([SHIN, LAMED, VAV, FINAL_MEM], [38, 37, 35]);

export default {
  id: "he",
  text: "שלום",
  language: "Hebrew",
  lang: "he",
  dir: "rtl",
  script: "Hebrew",
  slantDeg: 0,
  strokeWidth: 11,
  strokes: [{ nodes: shin }, { nodes: lamed }, { nodes: vav }, { nodes: mem }],
};
