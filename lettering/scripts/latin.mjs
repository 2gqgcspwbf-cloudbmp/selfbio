/**
 * Bespoke monoline Latin script — lowercase, joined, after Apple's "hello".
 *
 * Upright design space (the engine applies the slant): x-height 100,
 * ascender loops ~250, descender loop ~-135, baseline 0, y up.
 * Nodes sit on curve extremes (top, bottom, leftmost, rightmost) as in type design.
 *
 * Every glyph owns the joining stroke that leads INTO it, so a join is shaped
 * by the letter it arrives at. Each glyph is drawn in a frame whose origin is
 * the point where the previous letter's exit leaves:
 *   "x"   low join   — origin at the bottom of the previous letter's foot,
 *                      where the stroke runs level along the baseline
 *   "x^"  high join  — after o/b: origin at the end of their small top loop's
 *                      exit, running level at the x-height; before an ascender
 *                      the o/b is drawn as "o»"/"b»", stopping where the exit
 *                      crosses the bowl, and the ascender sweeps on from there
 *   "x~"  after j    — origin where j's descender loop has crossed the stem
 *   "x0"  first letter of the word
 * and a glyph's advance is the origin of the next frame. "x$" is the last
 * letter of a word, with its finishing stroke.
 *
 * Joins turn one way only between letters (no S-bends), loops cross their
 * stem at a clear angle, and every retrace (a stroke going back over itself)
 * uses mirrored node lists, so the Catmull-Rom spline lays it exactly on top
 * of the first pass and it renders as a single line.
 * Bowls (o, a, c) are written counter-clockwise from the top right, as taught.
 */
import { cursive, dot } from "../engine.mjs";

const q = (v) => Math.round(v * 100) / 100;
const pt = (x, y) => [q(x), q(y)];
const cn = (x, y) => [q(x), q(y), "c"];
const corner = ([x, y]) => [x, y, "c"];
/** 2a - b: the node that makes a retrace through `a` leave exactly along the first pass. */
const mirror = (a, b) => pt(2 * a[0] - b[0], 2 * a[1] - b[1]);

/* ---------------------------------------------------------------- */
/* Shared strokes                                                    */
/* ---------------------------------------------------------------- */

/**
 * Down-stroke at x into the bottom of the foot (x + 11, 0): the next frame's
 * origin. The stem stays straight (on the slant) almost to the baseline and
 * turns tightly, so a leg never reads as bent back.
 */
const foot = (x) => [pt(x, 20), pt(x + 2.6, 5.5), pt(x + 11, 0)];
const FOOT = 11;

/** First node of every low join: the stroke starts to rise off the baseline. */
const RISE = pt(13, 4.7);

/** Finishing stroke for a word that ends on a foot. */
const LOW_TAIL = [pt(13, 4.7), pt(26, 15), pt(36, 26)];

/**
 * Ascender loop (h, l, b) above its crossing, for a stem at x = S:
 * up the right side, round the top, straight down the stem.
 */
const loopUpper = (S) => [
  pt(S + 32, 154),
  pt(S + 37.5, 184),
  pt(S + 38.5, 214),
  pt(S + 33, 239),
  pt(S + 20, 251),
  pt(S + 7, 247),
  pt(S + 1.5, 229),
  pt(S, 196),
  pt(S, 140),
];

/** Stem position of an ascender for each kind of entry. */
const ASC_S = { "": 65, "0": 56, "^": 36 };

/** The stroke that rises into the loop, crossing the stem at a clear angle. */
const ascenderEntry = {
  // low join: off the baseline, crossing the stem at y ≈ 84
  "": [RISE, pt(30, 30), pt(50, 60), pt(77, 104), pt(88, 128), ...loopUpper(65)],
  // start of a word: a straight lead-in from the baseline
  0: [pt(7, 4), pt(23, 29), pt(41, 59), pt(68, 104), pt(79, 128), ...loopUpper(56)],
  // after o/b: the exit sweeps on out of their small loop (frame origin at its
  // crossing, heading ~40°) and through the stem at y ≈ 122, still turning the same way
  "^": [pt(13, 99.5), pt(27, 112), pt(41, 127), pt(53, 146), pt(63, 170), pt(71, 192), ...loopUpper(36).slice(2)],
};

/**
 * Arch of h/n/m from the foot of a stem at sx to a leg at sx + span:
 * retraces up the stem, springs off it, and comes down as a straight leg.
 */
const archUp = (sx, span) => {
  const k = span / 76;
  return [
    // exactly up the stem (collinear nodes), then branching out of it at a
    // definite angle, so the arch never runs alongside the stem as a second line
    pt(sx, 20),
    cn(sx, 36),
    pt(sx + 14, 58),
    pt(sx + 28 * k, 78.5),
    pt(sx + 43 * k, 96.5),
    pt(sx + 58 * k, 102.5),
    pt(sx + 70 * k, 96),
    pt(sx + span - 0.9, 81),
    pt(sx + span, 66),
    pt(sx + span, 48),
  ];
};
/** An arch whose leg returns to the baseline to start another arch (m). */
const arch = (sx, span) => [...archUp(sx, span), pt(sx + span, 30), cn(sx + span, 0)];
/** The last arch: its leg swings into the foot. */
const lastArch = (sx, span) => [...archUp(sx, span), ...foot(sx + span)];

/* ---------------------------------------------------------------- */
/* Bowls                                                             */
/* ---------------------------------------------------------------- */

/*
 * Bowls sit on an ellipse (centre cx, 52; radii rx x 52) and are written
 * counter-clockwise from the start point P at the top right.
 *
 * A low join meets the bowl at D on its lower left, then climbs back up the
 * left side and over the top to P, and the bowl retraces that climb on its way
 * round. The climb is the descent's node list reversed, and the node after D
 * on the way down is E = 2D - A (A is the node after D on the climb), which is
 * the climb's own phantom start, so every Catmull-Rom segment of the retrace
 * has the same four neighbours as the first pass: the two coincide exactly and
 * the join reads as one line forking off the bowl at a clear angle.
 * A high join runs level into the top and retraces from T2 the same way.
 */
const ellipse = (cx, rx) => (t) => {
  const r = (t * Math.PI) / 180;
  return pt(cx + rx * Math.cos(r), 52 + 52 * Math.sin(r));
};

/** The descent from P round the left side and the bottom; `top` = [P, T1, T2] (P omitted). */
function bowlDescent(e, top, bottomRight) {
  const A = e(195);
  const D = e(200);
  const left = [e(104), e(120), e(138), e(157), e(176), A];
  return {
    D,
    climb: [corner(D), ...[...left].reverse(), ...[...top.slice(1)].reverse(), corner(top[0])],
    descent: [...top.slice(1), ...left, D, mirror(D, A), e(222), e(245), ...bottomRight],
  };
}

/** Low join from the frame origin to D on a bowl. */
const bowlJoin = (D) => [RISE, pt(D[0] - 13, D[1] - 16)];

/* o ---------------------------------------------------------------- */

const O_RX = 36;
/**
 * The small loop at the top of o and b (as in Apple's "hello"): from the top it
 * curls down inside the bowl and leaves through the right shoulder, crossing it
 * at (cx + 27, 88.5). It then either levels out at the x-height (exit "") or,
 * before an ascender (exit "»"), stops at the crossing so the ascender's own
 * upstroke carries the same curve on up into its loop.
 */
const topLoop = (cx, exit) => [
  pt(cx - 4.5, 99),
  pt(cx - 7, 90.5),
  pt(cx - 3, 82),
  pt(cx + 6, 78),
  pt(cx + 17, 80.5),
  pt(cx + 27, 88.5),
  ...(exit === "»" ? [] : [pt(cx + 38, 96.5), pt(cx + 50, 100.6)]),
];
const topLoopW = (cx, exit) => cx + (exit === "»" ? 27 : 50);

/**
 * o: round, closed at the top over its own start, then the small top loop.
 */
function oGlyph(entry, cx, exit = "") {
  const e = ellipse(cx, O_RX);
  const P = e(64);
  const T1 = e(72);
  const T2 = e(86);
  // the node before P on the closing pass stays on the ellipse: the pass then
  // runs over the start within a fraction of a unit, with no bump at the shoulder
  const R1 = e(56);
  const b = bowlDescent(e, [P, T1, T2], [e(270), e(296), e(320), e(342), e(4), e(22), e(39)]);
  // closing pass: up the right side, over the start, then the loop
  const close = [R1, P, T1, T2, ...topLoop(cx, exit)];
  let start;
  if (entry === "0") start = [corner(P)];
  else if (entry === "^") start = [pt(12, 102.5), pt(cx - 22, 103.6), pt(cx - 11, 104.1), ...b.climb.slice(-3)];
  else start = [...bowlJoin(b.D), ...b.climb];
  return { w: topLoopW(cx, exit), body: [...start, ...b.descent, ...close] };
}
/** o leaves level at the x-height; at the end of a word the line runs on. */
const O_TAIL = [pt(12, 101.5), pt(26, 102)];

/* a ---------------------------------------------------------------- */

const A_RX = 34;
const A_STEM = 30; // stem x relative to the bowl centre
/** a: bowl from the top of the stem, round, back up into the stem, down to the foot. */
function aGlyph(entry, cx, marks) {
  const e = ellipse(cx, A_RX);
  const xs = cx + A_STEM;
  const P = pt(xs, 102);
  const T1 = pt(cx + 15, 104.4);
  const T2 = e(92);
  const stem = [pt(xs, 80), pt(xs, 55), pt(xs, 32)];
  const b = bowlDescent(e, [P, T1, T2], [e(270), pt(cx + 16, 3.2), pt(cx + 25.5, 14), ...[...stem].reverse(), corner(P)]);
  let start;
  if (entry === "0") start = [corner(P)];
  else if (entry === "^") start = [pt(12, 102.5), pt(cx - 22, 103.4), pt(cx - 11, 104), ...b.climb.slice(-3)];
  else start = [...bowlJoin(b.D), ...b.climb];
  const body = [...start, ...b.descent, ...stem.slice(1), ...foot(xs).slice(1)];
  return { w: xs + FOOT, body, ...(marks ? { marks } : {}) };
}

/* c ---------------------------------------------------------------- */

/** c: a small curl under the top right, then the bowl; leaves from its bottom. */
function cGlyph(cx) {
  const e = ellipse(cx, 34);
  return {
    w: cx + 2,
    body: [pt(cx + 19, 84), pt(cx + 26, 91), pt(cx + 23, 100), pt(cx + 12, 104), e(96), e(116), e(138), e(160), e(180), e(200), e(222), e(245), pt(cx + 2, 0)],
  };
}

/* ---------------------------------------------------------------- */
/* Pointed tops: i, j, u, r                                          */
/* ---------------------------------------------------------------- */

/** Low join up to a pointed top at (x, top). */
const spike = (x, top = 102) => [RISE, pt(x - 34, 30), pt(x - 17, 64), cn(x, top)];

/** Round tittle on the slanted axis of the stem. */
const tittle = (x) => dot(x, 150, 2, 90);

/** Acute accent, drawn after the word from the top down to the left. */
const acute = (cx) => ({ nodes: [pt(cx - 2.5, 141), pt(cx - 5.5, 134), pt(cx - 8, 128)] });

/* ---------------------------------------------------------------- */
/* Glyph table                                                        */
/* ---------------------------------------------------------------- */

const glyphs = {};
const def = (key, g) => (glyphs[key] = g);

// h, l, b — ascender loop
for (const k of ["", "0", "^"]) {
  const S = ASC_S[k];
  const up = ascenderEntry[k];
  def(`h${k}`, { w: S + 76 + FOOT, body: [...up, cn(S, 0), ...lastArch(S, 76)] });
  def(`l${k}`, { w: S + FOOT, body: [...up, ...foot(S)] });
  // b: the stem runs on into a bowl turning right (no pen lift), up and over,
  // then the same small top loop as o
  const cxb = S + 33;
  const eb = ellipse(cxb, 33);
  const bBowl = [pt(S, 74), eb(200), eb(225), eb(250), eb(272), eb(296), eb(320), eb(342), eb(4), eb(24), eb(44), eb(62), eb(76), eb(86)];
  for (const x of ["", "»"]) def(`b${k}${x}`, { w: topLoopW(cxb, x), body: [...up, ...bBowl, ...topLoop(cxb, x)] });
}

// e — the entry rises into a large eye that crosses low
def("e", {
  w: 64,
  body: [RISE, pt(25, 14), pt(38, 27), pt(52, 43), pt(65, 61), pt(74, 79), pt(75, 93), pt(68, 102), pt(55, 105.5), pt(41, 101), pt(31, 89), pt(26, 72), pt(25.5, 54), pt(28, 37), pt(33, 20), pt(41, 7), pt(52, 1), pt(64, 0)],
});

// o, a, á, c
for (const x of ["", "»"]) {
  def(`o${x}`, oGlyph("", 73.3, x));
  def(`o^${x}`, oGlyph("^", 44, x));
  def(`o0${x}`, oGlyph("0", 40, x));
}
def("o~", (() => {
  // after j the stroke is still turning out of the descender loop: let it
  // straighten on its way to D instead of flattening and kinking up again
  const g = oGlyph("", 67.8);
  const i = g.body.findIndex((n) => n[2] === "c");
  return { ...g, body: [pt(14, 17.5), ...g.body.slice(i)] };
})());
def("a", aGlyph("", 71.5));
def("a^", aGlyph("^", 44));
def("a0", aGlyph("0", 40));
def("á", aGlyph("", 71.5, [acute(71.5)]));
def("á^", aGlyph("^", 44, [acute(44)]));
def("á0", aGlyph("0", 40, [acute(40)]));
def("c0", cGlyph(38));

// i, j
def("i", { w: 64 + FOOT, body: [...spike(64), pt(64, 66), ...foot(64)], marks: [tittle(64)] });
const jLoop = (x) => [pt(x, 66), pt(x, 0), pt(x - 1.5, -60), pt(x - 7, -106), pt(x - 18, -130), pt(x - 30, -134), pt(x - 39, -122), pt(x - 39, -96), pt(x - 31, -64), pt(x - 17, -32), pt(x - 3, -10), pt(x + 11, 6)];
def("j", { w: 64 + 11, body: [...spike(64), ...jLoop(64)], marks: [tittle(64)] });

// u — a pointed first top; the trough climbs into the second stem, which is
// then retraced down over the very same nodes, so it stays a single line
const uRest = (x, w2) => {
  const s = x + w2;
  const stem = [pt(s, 82), pt(s, 58), pt(s, 34)];
  return [pt(x, 66), pt(x, 20), pt(x + 3, 5), pt(x + 13, 0), pt(x + 27, 2.5), pt(x + 38, 11), pt(s - 1.2, 25), ...stem.slice(1).reverse(), stem[0], cn(s, 102), ...stem, ...foot(s).slice(1)];
};
def("u", { w: 64 + 54 + FOOT, body: [...spike(64), ...uRest(64, 54)] });
def("u^", { w: 28 + 54 + FOOT, body: [pt(12, 102.5), cn(28, 102), ...uRest(28, 54)] });

// n, m — a narrow entry hump, then arches
def("n", { w: 64 + 70 + FOOT, body: [RISE, pt(30, 30), pt(45, 66), pt(52, 91), pt(58, 100.5), pt(63, 94), pt(64, 72), pt(64, 40), cn(64, 0), ...lastArch(64, 70)] });
def("n^", { w: 28 + 70 + FOOT, body: [pt(12, 102.5), pt(22, 100.5), pt(27, 92), pt(28, 72), pt(28, 40), cn(28, 0), ...lastArch(28, 70)] });
const mBody = (lead) => [...lead, pt(45, 66), pt(52, 91), pt(58, 100.5), pt(63, 94), pt(64, 72), pt(64, 40), cn(64, 0), ...arch(64, 66), ...lastArch(130, 66)];
def("m", { w: 196 + FOOT, body: mBody([RISE, pt(30, 30)]) });
def("m0", { w: 196 + FOOT, body: mBody([pt(10, 3), pt(28, 27)]) });

// r — up to a point above the x-height, a notch, a level shoulder, down
def("r", {
  w: 93.5 + FOOT,
  body: [RISE, pt(32, 32), pt(48, 72), cn(58, 114), pt(64, 104), pt(69, 98.5), pt(76, 103.5), pt(84, 106.5), pt(91, 104.5), pt(93.5, 96), pt(93.5, 72), ...foot(93.5)],
});

/* Word-final variants: the last letter carries the finishing stroke. */
for (const [key, g] of Object.entries(glyphs)) {
  const tail = key[0] === "o" ? O_TAIL : key[0] === "j" ? [pt(13, 15), pt(24, 25)] : LOW_TAIL;
  glyphs[`${key}$`] = { ...g, body: [...g.body, ...tail.map(([x, y]) => pt(g.w + x, y))] };
}

export const latin = glyphs;

/** Letters whose exit leaves from the x-height (out of the small top loop). */
const HIGH_EXIT = new Set(["o", "b"]);
/** Letters whose first stroke is an ascender loop. */
const ASCENDER = new Set(["b", "h", "l"]);

/**
 * Picks contextual glyph variants for a word.
 * @param {string} word
 * @returns {string[]} glyph keys for cursive()
 */
export function shape(word) {
  const chars = [...word.normalize("NFC")];
  return chars.map((ch, i) => {
    const prev = chars[i - 1];
    const next = chars[i + 1];
    const entry = i === 0 ? "0" : HIGH_EXIT.has(prev) ? "^" : prev === "j" ? "~" : "";
    const exit = HIGH_EXIT.has(ch) && ASCENDER.has(next) ? "»" : "";
    const end = next === undefined ? "$" : "";
    const key = ch + entry + exit + end;
    if (latin[key]) return key;
    throw new Error(`No Latin glyph "${key}"`);
  });
}

/** Lead-in strokes are part of each word-initial ("x0") glyph. */
export const leadIn = () => [];
export const LEAD = [];

/** Convenience: the strokes for a whole word. */
export const write = (word) => cursive(shape(word), latin, { lead: leadIn(word) });

export { dot };
