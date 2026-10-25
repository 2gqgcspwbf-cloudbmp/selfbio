/**
 * Lettering engine — turns hand-authored pen paths into SVG centre-line strokes.
 *
 * Authoring conventions (all languages):
 *  - Units: the script's main body height (Latin x-height) is 100. y points UP,
 *    baseline is y = 0. Ascenders reach ~250, descenders ~-150.
 *  - A stroke is a list of nodes the pen passes through, in writing order.
 *    [x, y]        smooth node — the curve flows through it
 *    [x, y, "c"]   corner — the pen turns sharply here (a retrace/cusp)
 *  - Curves are centripetal Catmull–Rom splines through the nodes (no cusps or
 *    self-loops that weren't drawn on purpose), emitted as cubic Béziers.
 */

const EPS = 1e-9;

/** @typedef {[number, number] | [number, number, "c"]} Node */

/* ---------------------------------------------------------------- */
/* Spline                                                            */
/* ---------------------------------------------------------------- */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);

/** Cubic Bézier control points for the centripetal Catmull–Rom segment p1→p2. */
function crSegment(p0, p1, p2, p3, alpha = 0.5) {
  const d1 = Math.max(EPS, Math.pow(len(sub(p1, p0)), alpha));
  const d2 = Math.max(EPS, Math.pow(len(sub(p2, p1)), alpha));
  const d3 = Math.max(EPS, Math.pow(len(sub(p3, p2)), alpha));
  const b1 = mul(
    add(add(mul(p2, d1 * d1), mul(p0, -d2 * d2)), mul(p1, 2 * d1 * d1 + 3 * d1 * d2 + d2 * d2)),
    1 / (3 * d1 * (d1 + d2)),
  );
  const b2 = mul(
    add(add(mul(p1, d3 * d3), mul(p3, -d2 * d2)), mul(p2, 2 * d3 * d3 + 3 * d3 * d2 + d2 * d2)),
    1 / (3 * d3 * (d3 + d2)),
  );
  return [p1, b1, b2, p2];
}

/** Splits at corner nodes and splines each smooth run. Returns cubic segments. */
export function splineNodes(nodes, { closed = false, alpha = 0.5 } = {}) {
  const pts = nodes.map((n) => [n[0], n[1]]);
  const corner = nodes.map((n) => n[2] === "c");
  if (pts.length === 1) return [[pts[0], pts[0], pts[0], [pts[0][0] + 0.01, pts[0][1]]]];
  if (pts.length === 2) {
    const [a, b] = pts;
    return [[a, add(a, mul(sub(b, a), 1 / 3)), add(a, mul(sub(b, a), 2 / 3)), b]];
  }

  if (closed) {
    const n = pts.length;
    const segs = [];
    for (let i = 0; i < n; i++)
      segs.push(crSegment(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n], alpha));
    return segs;
  }

  // Runs between corners (corners are shared end points).
  const runs = [];
  let start = 0;
  for (let i = 1; i < pts.length; i++) {
    if (corner[i] || i === pts.length - 1) {
      runs.push(pts.slice(start, i + 1));
      start = i;
    }
  }

  const segs = [];
  for (const run of runs) {
    if (run.length === 2) {
      const [a, b] = run;
      segs.push([a, add(a, mul(sub(b, a), 1 / 3)), add(a, mul(sub(b, a), 2 / 3)), b]);
      continue;
    }
    // Phantom end points continue the curve's own direction.
    const first = sub(mul(run[0], 2), run[1]);
    const last = sub(mul(run[run.length - 1], 2), run[run.length - 2]);
    const ext = [first, ...run, last];
    for (let i = 1; i < ext.length - 2; i++) segs.push(crSegment(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], alpha));
  }
  return segs;
}

/* ---------------------------------------------------------------- */
/* Geometry                                                          */
/* ---------------------------------------------------------------- */

export function bezierPoint([p0, p1, p2, p3], t) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

export function segmentsLength(segs, steps = 24) {
  let total = 0;
  for (const s of segs) {
    let prev = s[0];
    for (let i = 1; i <= steps; i++) {
      const p = bezierPoint(s, i / steps);
      total += len(sub(p, prev));
      prev = p;
    }
  }
  return total;
}

/** Applies f to every control point of every segment. */
export const mapSegments = (segs, f) => segs.map((s) => s.map(f));

const r2 = (v) => {
  const s = (Math.round(v * 100) / 100).toString();
  return s === "-0" ? "0" : s;
};

export function segmentsToPath(segs) {
  if (!segs.length) return "";
  let d = `M${r2(segs[0][0][0])} ${r2(segs[0][0][1])}`;
  for (const [, c1, c2, p] of segs) d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p[0])} ${r2(p[1])}`;
  return d;
}

/* ---------------------------------------------------------------- */
/* Strokes and transforms                                            */
/* ---------------------------------------------------------------- */

/**
 * A stroke in authoring space.
 * @typedef {{ nodes: Node[], closed?: boolean, pause?: number, speed?: number, kind?: "dot" }} Stroke
 */

export const translate = (nodes, dx, dy = 0) => nodes.map(([x, y, f]) => (f ? [x + dx, y + dy, f] : [x + dx, y + dy]));
export const scaleNodes = (nodes, sx, sy = sx) => nodes.map(([x, y, f]) => (f ? [x * sx, y * sy, f] : [x * sx, y * sy]));

/** Italic slant: shear x by y·tan(deg). */
export const slant = (deg) => {
  const k = Math.tan((deg * Math.PI) / 180);
  return ([x, y]) => [x + y * k, y];
};

/** A short pen-dot (i/j tittle, Arabic nuqta) that still draws as a stroke. */
export function dot(x, y, size = 6, angle = -35) {
  const a = (angle * Math.PI) / 180;
  const dx = (Math.cos(a) * size) / 2;
  const dy = (Math.sin(a) * size) / 2;
  return { nodes: [[x - dx, y - dy], [x + dx, y + dy]], kind: "dot" };
}

/* ---------------------------------------------------------------- */
/* Connected cursive                                                 */
/* ---------------------------------------------------------------- */

/**
 * Glyph for a joined script.
 * @typedef {{
 *   w: number,              // advance
 *   body: Node[],           // continuous pen path, entry → exit, x from 0
 *   marks?: Stroke[],       // dots/accents/crossbars, drawn after the word
 *   lift?: boolean,         // pen lifts before this glyph (no joining stroke into it)
 * }} Glyph
 */

/**
 * Joins glyphs into continuous strokes, the way the word would be written:
 * one unbroken line where letters connect, with marks added afterwards.
 */
export function cursive(text, glyphs, { lead = [], tail = [], tracking = 0 } = {}) {
  const strokes = [];
  const marks = [];
  let current = [...lead];
  let x = 0;
  for (const ch of text) {
    const g = glyphs[ch];
    if (!g) throw new Error(`No glyph for "${ch}"`);
    if (g.lift && current.length) {
      strokes.push({ nodes: current });
      current = [];
    }
    const body = translate(g.body, x);
    // Drop a duplicate join node.
    if (current.length && Math.hypot(current.at(-1)[0] - body[0][0], current.at(-1)[1] - body[0][1]) < 0.5) body.shift();
    current.push(...body);
    for (const m of g.marks ?? []) marks.push({ ...m, nodes: translate(m.nodes, x) });
    x += g.w + tracking;
  }
  current.push(...translate(tail, x));
  if (current.length) strokes.push({ nodes: current });
  return [...strokes, ...marks];
}

/* ---------------------------------------------------------------- */
/* Compile                                                           */
/* ---------------------------------------------------------------- */

/**
 * Compiles authored strokes into SVG paths (y flipped to screen space).
 * @param {Stroke[]} strokes
 * @param {{ slantDeg?: number, strokeWidth?: number, transform?: (p:[number,number])=>[number,number] }} opts
 */
export function compile(strokes, { slantDeg = 0, strokeWidth = 11, transform, debug = false } = {}) {
  const sl = slant(slantDeg);
  const toScreen = (p) => {
    let q = sl(p);
    if (transform) q = transform(q);
    return [q[0], -q[1]];
  };

  const out = strokes.map((s) => {
    const segs = mapSegments(splineNodes(s.nodes, { closed: s.closed }), toScreen);
    return { segs, pause: s.pause, speed: s.speed, kind: s.kind, nodes: debug ? s.nodes.map((n) => [...toScreen(n), n[2] === "c"]) : undefined };
  });

  // Bounds from sampled curves.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { segs } of out)
    for (const seg of segs)
      for (let i = 0; i <= 16; i++) {
        const [x, y] = bezierPoint(seg, i / 16);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
  const pad = strokeWidth;
  const viewBox = [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2].map((v) => Math.round(v * 10) / 10);

  return {
    viewBox,
    strokeWidth,
    ...(debug ? { debugNodes: out.map((o) => o.nodes) } : {}),
    strokes: out.map(({ segs, pause, speed, kind }) => ({
      d: segmentsToPath(segs),
      length: Math.round(segmentsLength(segs) * 10) / 10,
      ...(pause !== undefined ? { pause } : {}),
      ...(speed !== undefined ? { speed } : {}),
      ...(kind ? { kind } : {}),
    })),
  };
}
