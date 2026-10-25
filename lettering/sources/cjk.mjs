/**
 * CJK stroke sources — real stroke-order data turned into monoline pen strokes.
 *
 *  - Han (Chinese): Make Me a Hanzi stroke medians, via hanzi-writer-data
 *    (Arphic Public License). Each character is a 1024 box, y up, with the
 *    Latin baseline at y = 0, so the box runs from y = -124 to y = 900.
 *    "medians" holds one coarse centre-line polyline per stroke, already in
 *    the standard stroke order.
 *  - Kana (Japanese): KanjiVG (CC BY-SA 3.0, © Ulrich Apel), one SVG per
 *    character in scripts/kanjivg/<5-hex codepoint>.svg. Each <path d> is one
 *    stroke's centre line in a 109 box, y down, in stroke order.
 *
 * Both are brush data. A monoline pen does not make the brush's entry
 * flourish (起筆) or the pressed-down finish (收筆), so those are trimmed, the
 * remaining centre line is smoothed, real turns (横折, hooks 钩) are kept as
 * sharp corners, and every smooth run is refitted with as few spline nodes as
 * the curve needs, placed on its extremes.
 *
 * Output is in lettering units (y up). The character box is `size` tall with
 * its bottom-left corner at (x, y).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { bezierPoint, splineNodes } from "../engine.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const angleOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const turnBetween = (a1, a2) => {
  let d = Math.abs(a1 - a2) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
};

/* ---------------------------------------------------------------- */
/* Raw data                                                          */
/* ---------------------------------------------------------------- */

/** Make Me a Hanzi medians for one character: [[x, y], ...] per stroke (1024 box, y up). */
export function hanziMedians(char) {
  let file;
  try {
    file = require.resolve(`hanzi-writer-data/${char}.json`);
  } catch {
    file = path.join(ROOT, "node_modules", "hanzi-writer-data", `${char}.json`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).medians;
}

/** KanjiVG stroke paths for one character, in stroke order (109 box, y down). */
export function kanjivgPaths(char) {
  const cp = char.codePointAt(0).toString(16).padStart(5, "0");
  const svg = fs.readFileSync(path.join(ROOT, "scripts", "kanjivg", `${cp}.svg`), "utf8");
  const found = [];
  const re = /<path\b[^>]*\bid="kvg:[0-9a-f]+-s(\d+)"[^>]*\bd="([^"]+)"/g;
  for (let m; (m = re.exec(svg)); ) found.push({ n: Number(m[1]), d: m[2] });
  // Some files put d before id.
  const re2 = /<path\b[^>]*\bd="([^"]+)"[^>]*\bid="kvg:[0-9a-f]+-s(\d+)"/g;
  for (let m; (m = re2.exec(svg)); ) if (!found.some((f) => f.n === Number(m[2]))) found.push({ n: Number(m[2]), d: m[1] });
  return found.sort((a, b) => a.n - b.n).map((f) => f.d);
}

/** Parses an SVG path (M/m L/l H/h V/v C/c S/s Q/q T/t, no arcs) into absolute cubic segments. */
export function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const segs = [];
  let i = 0;
  let cmd = "";
  let cur = [0, 0];
  let start = [0, 0];
  let lastCtrl = null; // reflected control for S/T
  let lastQ = null;
  const num = () => Number(tokens[i++]);
  const isNum = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);
  while (i < tokens.length) {
    if (!isNum()) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const off = (p) => (rel ? [cur[0] + p[0], cur[1] + p[1]] : p);
    switch (cmd.toUpperCase()) {
      case "M": {
        cur = off([num(), num()]);
        start = cur;
        cmd = rel ? "l" : "L";
        lastCtrl = lastQ = null;
        break;
      }
      case "L": {
        const p = off([num(), num()]);
        segs.push([cur, lerp(cur, p, 1 / 3), lerp(cur, p, 2 / 3), p]);
        cur = p;
        lastCtrl = lastQ = null;
        break;
      }
      case "H": {
        const x = num();
        const p = [rel ? cur[0] + x : x, cur[1]];
        segs.push([cur, lerp(cur, p, 1 / 3), lerp(cur, p, 2 / 3), p]);
        cur = p;
        lastCtrl = lastQ = null;
        break;
      }
      case "V": {
        const y = num();
        const p = [cur[0], rel ? cur[1] + y : y];
        segs.push([cur, lerp(cur, p, 1 / 3), lerp(cur, p, 2 / 3), p]);
        cur = p;
        lastCtrl = lastQ = null;
        break;
      }
      case "C": {
        const c1 = off([num(), num()]);
        const c2 = off([num(), num()]);
        const p = off([num(), num()]);
        segs.push([cur, c1, c2, p]);
        lastCtrl = c2;
        lastQ = null;
        cur = p;
        break;
      }
      case "S": {
        const c1 = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur;
        const c2 = off([num(), num()]);
        const p = off([num(), num()]);
        segs.push([cur, c1, c2, p]);
        lastCtrl = c2;
        lastQ = null;
        cur = p;
        break;
      }
      case "Q":
      case "T": {
        const q = cmd.toUpperCase() === "Q" ? off([num(), num()]) : lastQ ? [2 * cur[0] - lastQ[0], 2 * cur[1] - lastQ[1]] : cur;
        const p = off([num(), num()]);
        segs.push([cur, lerp(cur, q, 2 / 3), lerp(p, q, 2 / 3), p]);
        lastQ = q;
        lastCtrl = null;
        cur = p;
        break;
      }
      case "Z": {
        if (dist(cur, start) > 1e-6) segs.push([cur, lerp(cur, start, 1 / 3), lerp(cur, start, 2 / 3), start]);
        cur = start;
        break;
      }
      default:
        throw new Error(`Unsupported path command "${cmd}" in ${d}`);
    }
  }
  return segs;
}

/* ---------------------------------------------------------------- */
/* Polyline tools                                                    */
/* ---------------------------------------------------------------- */

const polyLength = (pts) => pts.reduce((a, p, i) => (i ? a + dist(pts[i - 1], p) : 0), 0);

/** Evenly resamples a polyline at roughly `step` spacing (keeps both ends). */
function resample(pts, step) {
  const L = polyLength(pts);
  const n = Math.max(2, Math.round(L / step) + 1);
  const out = [pts[0]];
  let seg = 1;
  let acc = 0;
  for (let k = 1; k < n - 1; k++) {
    const target = (L * k) / (n - 1);
    while (seg < pts.length - 1 && acc + dist(pts[seg - 1], pts[seg]) < target) {
      acc += dist(pts[seg - 1], pts[seg]);
      seg++;
    }
    const l = dist(pts[seg - 1], pts[seg]) || 1;
    out.push(lerp(pts[seg - 1], pts[seg], (target - acc) / l));
  }
  out.push(pts.at(-1));
  return out;
}

/**
 * Gaussian smoothing along the curve (σ in units of length), ends pinned.
 * Near the ends the kernel is mirrored through the end point, so a straight
 * run stays straight and the end tangent is kept.
 */
function smooth(pts, sigma, step) {
  if (sigma <= 0 || pts.length < 3) return pts;
  const r = Math.max(1, Math.round((sigma * 2.5) / step));
  const w = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-0.5 * ((k * step) / sigma) ** 2));
  const n = pts.length;
  // Point reflection through an end keeps that end fixed under the kernel.
  const at = (j) => {
    if (j < 0) return [2 * pts[0][0] - pts[-j][0], 2 * pts[0][1] - pts[-j][1]];
    if (j >= n) return [2 * pts[n - 1][0] - pts[2 * (n - 1) - j][0], 2 * pts[n - 1][1] - pts[2 * (n - 1) - j][1]];
    return pts[j];
  };
  return pts.map((p, i) => {
    if (i === 0 || i === n - 1) return p;
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (let k = -r; k <= r; k++) {
      const j = i + k;
      if (j < -(n - 1) || j > 2 * (n - 1)) continue;
      const q = at(Math.max(-(n - 1), Math.min(2 * (n - 1), j)));
      sx += q[0] * w[k + r];
      sy += q[1] * w[k + r];
      sw += w[k + r];
    }
    return [sx / sw, sy / sw];
  });
}

/** Dense samples of the engine's own spline through `nodes`. */
function splineSamples(nodes, per = 12) {
  const out = [];
  for (const seg of splineNodes(nodes)) for (let i = out.length ? 1 : 0; i <= per; i++) out.push(bezierPoint(seg, i / per));
  return out;
}

/** Symmetric max distance between two dense polylines. */
function deviation(a, b) {
  const one = (p, q) => {
    let worst = 0;
    let worstIdx = 0;
    for (let i = 0; i < p.length; i++) {
      let best = Infinity;
      for (const s of q) best = Math.min(best, (p[i][0] - s[0]) ** 2 + (p[i][1] - s[1]) ** 2);
      if (best > worst) {
        worst = best;
        worstIdx = i;
      }
    }
    return [Math.sqrt(worst), worstIdx];
  };
  const [d1, i1] = one(a, b);
  const [d2] = one(b, a);
  return { d: Math.max(d1, d2), at: i1 };
}

/**
 * Chooses spline nodes for one smooth run (dense, evenly spaced samples):
 * the two ends, then — one at a time — the sample the engine's spline misses
 * by most, until it stays within `tol` of the run. Nodes stay `minGap` apart.
 */
function fitRun(run, { tol = 1.2, minGap = 14 } = {}) {
  const n = run.length;
  if (n <= 2) return [0, n - 1];
  const spacing = polyLength(run) / (n - 1);
  const keep = new Set([0, n - 1]);
  const far = (i) => [...keep].every((k) => Math.abs(k - i) * spacing >= minGap);
  // Greedy: add the sample the current spline misses by most. On a smooth run
  // that is where the curve bends furthest from its chord — its extreme.
  for (let guard = 0; guard < 40; guard++) {
    const idx = [...keep].sort((a, b) => a - b);
    const { d, at } = deviation(run, splineSamples(idx.map((i) => run[i])));
    if (d <= tol || keep.has(at)) break;
    if (!far(at)) {
      // Too close to an existing node: nudge to the furthest admissible sample.
      let best = -1;
      let bestD = 0;
      for (let i = 1; i < n - 1; i++) {
        if (keep.has(i) || !far(i)) continue;
        const dd = Math.abs(i - at);
        if (best < 0 || dd < bestD) {
          best = i;
          bestD = dd;
        }
      }
      if (best < 0) break;
      keep.add(best);
      continue;
    }
    keep.add(at);
  }
  return [...keep].sort((a, b) => a - b);
}

/**
 * Turns a centre line into engine nodes.
 * @param {[number, number][]} pts     polyline in output units
 * @param {number[]} cornerIdx         indices in pts where the pen turns sharply
 * @param {{ step?: number, sigma?: number, tol?: number, spline?: boolean }} opts
 */
export function centreLineToNodes(pts, cornerIdx = [], { step = 2, sigma = 0, tol = 1.2, spline = false } = {}) {
  const cuts = [0, ...[...new Set(cornerIdx)].filter((i) => i > 0 && i < pts.length - 1).sort((a, b) => a - b), pts.length - 1];
  const nodes = [];
  for (let r = 0; r < cuts.length - 1; r++) {
    const part = pts.slice(cuts[r], cuts[r + 1] + 1);
    // Sparse point lists (medians) are first threaded with a smooth spline.
    let run = resample(spline && part.length > 2 ? splineSamples(part, 16) : part, step);
    run = smooth(run, sigma, step);
    const idx = fitRun(run, { tol });
    const runNodes = idx.map((i) => [Math.round(run[i][0] * 10) / 10, Math.round(run[i][1] * 10) / 10]);
    if (r > 0) runNodes.shift();
    if (r > 0) nodes[nodes.length - 1] = [...nodes.at(-1).slice(0, 2), "c"];
    nodes.push(...runNodes);
  }
  return nodes;
}

/* ---------------------------------------------------------------- */
/* Han — Make Me a Hanzi                                             */
/* ---------------------------------------------------------------- */

/**
 * One Chinese character as pen strokes.
 *
 * `edits[i]` (0-based stroke index) curates stroke i of the medians:
 *   head:    number of leading median points that are the brush's entry
 *            flourish; they are replaced by one start point at `start`
 *            (default: their centroid).
 *   tail:    number of trailing points that are the brush's pressed finish,
 *            replaced by `end` (default: the last kept point).
 *   start / end: explicit [x, y] (1024 box) for the new first / last point.
 *   corners: indices (into the edited median list) where the pen turns sharply.
 *   points:  a replacement point list (1024 box) when the median needs redrawing.
 *   sigma:   smoothing (output units); default 5 — enough to iron out the coarse
 *            median polyline into a pen line without losing its character.
 */
export function hanzi(char, { x = 0, y = 0, size = 230, edits = {}, sigma = 5, tol = 2 } = {}) {
  const k = size / 1024;
  const map = ([px, py]) => [x + px * k, y + (py + 124) * k];
  return hanziMedians(char).map((median, i) => {
    const e = edits[i] ?? {};
    let pts = e.points ? e.points.map((p) => [...p]) : median.map((p) => [...p]);
    if (!e.points) {
      if (e.head) {
        const head = pts.slice(0, e.head);
        const c = e.start ?? head.reduce((a, p) => [a[0] + p[0] / head.length, a[1] + p[1] / head.length], [0, 0]);
        pts = [c, ...pts.slice(e.head)];
      } else if (e.start) pts[0] = e.start;
      if (e.tail) {
        pts = pts.slice(0, pts.length - e.tail);
        if (e.end) pts.push(e.end);
      } else if (e.end) pts[pts.length - 1] = e.end;
    }
    const mapped = pts.map(map);
    return { nodes: centreLineToNodes(mapped, e.corners ?? [], { sigma: e.sigma ?? sigma, tol, spline: true }) };
  });
}

/* ---------------------------------------------------------------- */
/* Kana — KanjiVG                                                    */
/* ---------------------------------------------------------------- */

/**
 * One kana (or kanji) from KanjiVG as pen strokes. The cubic paths are smooth
 * already; turns between segments sharper than `cornerDeg` become corners.
 *
 * `edits[i]` (0-based stroke index), all coordinates in the 109 box (y down):
 *   dropFirst: drop the first cubic segment — the brush's entry dip.
 *   keep:      keep only the first n cubic segments (after dropFirst) and
 *   then:      continue the stroke through these points instead, e.g. to turn
 *              a brush's curled hane into a crisp pen flick;
 *   corners:   indices into `then` where the pen turns sharply ("c" nodes).
 *   points:    replace the whole stroke with these points (+ corners).
 *   trimStart / trimEnd: length cut from either end.
 */
export function kanjivg(char, { x = 0, y = 0, size = 230, edits = {}, cornerDeg = 38, tol = 1.8 } = {}) {
  const k = size / 109;
  const map = ([px, py]) => [x + px * k, y + (109 - py) * k];
  return kanjivgPaths(char).map((d, i) => {
    const e = edits[i] ?? {};
    let segs = parsePath(d);
    if (e.dropFirst) segs = segs.slice(1);
    if (e.keep !== undefined) segs = segs.slice(0, e.keep);
    const pts = [];
    const corners = [];
    if (!e.points) {
      segs.forEach((seg, si) => {
        const steps = 24;
        for (let s = si ? 1 : 0; s <= steps; s++) pts.push(bezierPoint(seg, s / steps));
        if (si < segs.length - 1) {
          const tin = tangentAtEnd(seg);
          const tout = tangentAtStart(segs[si + 1]);
          if (tin !== null && tout !== null && turnBetween(tin, tout) > (cornerDeg * Math.PI) / 180) corners.push(pts.length - 1);
        }
      });
    }
    const extra = e.points ?? e.then ?? [];
    extra.forEach((p, j) => {
      if (pts.length && j === 0 && dist(pts.at(-1), p) < 0.05) {
        if ((e.corners ?? []).includes(0)) corners.push(pts.length - 1);
        return;
      }
      pts.push(p);
      if ((e.corners ?? []).includes(j)) corners.push(pts.length - 1);
    });
    let mapped = pts.map(map);
    let cornerIdx = corners;
    if (e.trimStart || e.trimEnd) {
      const r = trim(mapped, cornerIdx, (e.trimStart ?? 0) * k, (e.trimEnd ?? 0) * k);
      mapped = r.pts;
      cornerIdx = r.corners;
    }
    return { nodes: centreLineToNodes(mapped, cornerIdx, { sigma: e.sigma ?? 0, tol, spline: true }) };
  });
}

function tangentAtStart([p0, c1, c2, p3]) {
  for (const q of [c1, c2, p3]) if (dist(p0, q) > 1e-6) return angleOf(p0, q);
  return null;
}
function tangentAtEnd([p0, c1, c2, p3]) {
  for (const q of [c2, c1, p0]) if (dist(q, p3) > 1e-6) return angleOf(q, p3);
  return null;
}

/** Cuts `a` units of length off the start and `b` off the end of a polyline, keeping corner indices valid. */
function trim(pts, corners, a, b) {
  const L = polyLength(pts);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const lo = a;
  const hi = L - b;
  const out = [];
  const map = new Map();
  for (let i = 0; i < pts.length; i++) {
    if (cum[i] < lo && i + 1 < pts.length && cum[i + 1] > lo) {
      out.push(lerp(pts[i], pts[i + 1], (lo - cum[i]) / (cum[i + 1] - cum[i])));
      continue;
    }
    if (cum[i] >= lo && cum[i] <= hi) {
      map.set(i, out.length);
      out.push(pts[i]);
    }
    if (cum[i] <= hi && i + 1 < pts.length && cum[i + 1] > hi) out.push(lerp(pts[i], pts[i + 1], (hi - cum[i]) / (cum[i + 1] - cum[i])));
  }
  return { pts: out, corners: corners.filter((c) => map.has(c)).map((c) => map.get(c)) };
}

/* ---------------------------------------------------------------- */
/* Layout                                                            */
/* ---------------------------------------------------------------- */

/** Horizontal ink extent of a set of strokes. */
export function inkBounds(strokes) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of strokes)
    for (const p of splineSamples(s.nodes, 8)) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
  return { minX, maxX, minY, maxY };
}

/** Shifts strokes by dx, dy. */
export const shift = (strokes, dx, dy = 0) =>
  strokes.map((s) => ({ ...s, nodes: s.nodes.map(([px, py, f]) => (f ? [px + dx, py + dy, f] : [px + dx, py + dy])) }));
