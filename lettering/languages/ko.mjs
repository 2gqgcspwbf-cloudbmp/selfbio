/**
 * Korean — 안녕하세요, written jamo by jamo in standard Hangul stroke order,
 * as a light pen hand (펜글씨 정자 with a little 흘림 in the motion).
 *
 * Design space: y up, baseline 0. Blocks are authored ~200 tall in their own
 * local box (x from 0), placed left to right, then the word is scaled to the
 * size of the other CJK greetings.
 *
 * Every stroke is a pen gesture rather than a ruler line:
 *  - downstrokes set in with a small touch from the upper left (기필) and ease
 *    a hair to the left as the pen leaves the paper;
 *  - horizontals rise to the right (우상향) on a faint convex arc;
 *  - ㅇ is one open stroke, counter-clockwise from the top, slightly tilted and
 *    egg-shaped, closing just inside its own start the way a pen does.
 * Order: ㅇ; ㅏ vertical then tick; ㄴ down-then-right; ㅕ upper bar, lower bar,
 * vertical; ㅎ 꼭지, ㅡ, ㅇ; ㅅ 삐침 then 파임 from its middle; ㅔ tick, short
 * vertical, long vertical; ㅛ left, right, bar.
 */
import { translate, scaleNodes } from "../engine.mjs";

const RAD = Math.PI / 180;
const SCALE = 0.86; // authored blocks ~200 tall → ~185, the size of 你好 / こんにちは

/**
 * Downstroke (세로획) from top to bottom: a small set-in from the upper left,
 * a straight drop, and a slight ease to the left at the foot.
 */
function down(x, top, bottom, { setIn = 1.8, ease = 1.2 } = {}) {
  const h = top - bottom;
  return [
    [x - setIn, top + setIn * 0.5],
    [x, top - 6.5],
    [x + 0.15, top - h * 0.38],
    [x - ease * 0.3, bottom + h * 0.25],
    [x - ease, bottom],
  ];
}

/**
 * Horizontal (가로획) left to right on a faint convex arc (two interior nodes,
 * so the curvature is spread along the stroke); `lift` lets the end rise a
 * little more as the pen leaves.
 */
function across(x1, y1, x2, y2, { arch = 1, lift = 0 } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy);
  const nx = -dy / l;
  const ny = dx / l;
  const p = (t, k) => [x1 + dx * t + nx * k, y1 + dy * t + ny * k];
  return [p(0, 0), p(1 / 3, arch), p(2 / 3, arch * 0.9), [x2, y2 + lift]];
}

/**
 * ㅇ as one pen stroke: starts just right of the top, runs counter-clockwise
 * (y up, so the angle grows), and closes `over`° past its start, drawn in by
 * `inset` so the end tucks inside the beginning instead of sealing a ring.
 * tilt leans the oval (negative = top to the right); egg narrows the top.
 */
function oh(cx, cy, rx, ry, { tilt = -10, egg = 0.05, from = 78, over = 16, inset = 0.8, step = 12 } = {}) {
  const t = tilt * RAD;
  const sweep = 360 + over;
  const n = Math.round(sweep / step);
  const nodes = [];
  for (let i = 0; i <= n; i++) {
    const d = (sweep * i) / n;
    const a = (from + d) * RAD;
    const s = Math.sin(a);
    const pull = d > 360 ? (inset * (d - 360)) / over : 0; // only where the end overlaps the start
    const x = (rx - pull) * Math.cos(a) * (1 - egg * s);
    const y = (ry - pull) * s;
    nodes.push([cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
  }
  return nodes;
}

const S = (nodes, extra = {}) => ({ nodes, ...extra });

/* -------------------------------------------------------------- 안 */
const AN = [
  S(oh(56, 157, 34, 37, { tilt: -12 })), // ㅇ
  S(down(132, 212, 98)), // ㅏ vertical
  S(across(136, 154, 168, 158, { arch: 0.6, lift: 0.6 })), // ㅏ tick, set inside the vertical
  S([[30, 84], [31, 44], [34, 28], [45, 20], [68, 18], [118, 21], [170, 29]]), // ㄴ 받침: down, round turn, rising right
];

/* -------------------------------------------------------------- 녕 */
const NYEONG = [
  S([[25, 209], [26, 152], [29, 135], [41, 127], [62, 127], [82, 132]]), // ㄴ: down, round turn, rising tail
  S(across(101, 189, 143, 193, { arch: 0.6 })), // ㅕ upper bar
  S(across(99, 151, 145, 157, { arch: 0.7 })), // ㅕ lower bar (a touch longer, rising a touch more)
  S(down(152, 217, 100)), // ㅕ vertical
  S(oh(89, 48, 40, 31, { tilt: -4, egg: 0.03, from: 80 })), // ㅇ 받침
];

/* -------------------------------------------------------------- 하 */
const HA = [
  S([[53, 213], [57.5, 207], [63, 200]]), // ㅎ 꼭지: short 점, upper left to lower right
  S(across(18, 170, 104, 177, { arch: 1.2 })), // ㅎ ㅡ
  S(oh(61, 111, 31, 32, { tilt: -10 })), // ㅎ ㅇ
  S(down(143, 216, 22)), // ㅏ vertical
  S(across(147, 124, 181, 128, { arch: 0.6, lift: 0.6 })), // ㅏ tick, set inside the vertical
];

/* -------------------------------------------------------------- 세 */
const SE = [
  S([[60, 201], [55, 166], [46, 130], [34, 96], [19, 62]]), // ㅅ 삐침: down and out to the left
  S([[48, 127], [61, 106], [77, 85], [97, 67]]), // ㅅ 파임: from inside the 삐침's middle, easing out
  S(across(104, 123, 132, 127, { arch: 0.5 })), // ㅓ tick, into the first vertical
  S(down(135, 196, 46)), // ㅓ (first) vertical, shorter
  S(down(177, 218, 18)), // ㅣ (second) vertical, longer
];

/* -------------------------------------------------------------- 요 */
const YO = [
  S(oh(93, 160, 36, 35, { tilt: -10 })), // ㅇ
  S([[69, 102], [70, 62], [70.5, 30]]), // ㅛ left short vertical
  S([[117, 102], [116.5, 64], [116, 33]]), // ㅛ right short vertical
  S(across(24, 20, 178, 31, { arch: 1.4 })), // ㅛ long bar
];

// Block origins, set for even optical spacing: about 30–37 units clear at the
// closest point and a similar mean gap across the height for every pair.
const BLOCKS = [
  [AN, 0],
  [NYEONG, 185],
  [HA, 362],
  [SE, 546],
  [YO, 748],
];

const strokes = BLOCKS.flatMap(([block, x0], bi) =>
  block.map((s, si) => ({
    ...s,
    nodes: scaleNodes(translate(s.nodes, x0), SCALE),
    ...(bi > 0 && si === 0 ? { pause: 80 } : {}),
  })),
);

export default {
  id: "ko",
  text: "안녕하세요",
  language: "Korean",
  lang: "ko",
  dir: "ltr",
  script: "Hangul",
  slantDeg: 0,
  strokeWidth: 11,
  strokes,
};
