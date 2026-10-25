/**
 * Hindi — "नमस्ते" (namaste), bespoke monoline Devanagari.
 *
 * Design space: baseline 0, shirorekha (headline) at y = 175, letter bodies
 * hanging from it, the e-matra rising to ~247 above it. Upright (no slant),
 * strokeWidth 11.
 *
 * Written the way a native hand writes it: each letter's body first (left part,
 * then the standing stem from the top down), the shirorekha in one sweep across
 * the whole word, and finally the e-matra flag springing down onto it.
 *
 * Proportions follow the printed forms: न's small drop hangs just under a bar
 * at ~60 % of the body; म's knot sits lower, at the foot of its arm; the half-sa
 * hangs from the headline and closes onto its bar at the cusp, from which the
 * slant leaves; every bar rises only a few degrees.
 */
import { translate } from "../engine.mjs";

const H = 175; // shirorekha

const at = (dx, nodes) => translate(nodes, dx);

// Pen lifts (ms): quick within a letter, a breath between letters, a longer
// reach back to the start of the word for the headline.
const LIFT = 90;
const NEXT = 140;

/* न — the small drop first (pen sets down on the bar line, runs down the
 * drop's right side and round clockwise), out along the bar to the stem; then
 * the stem from the top down. */
const NA = 0;
const na = [
  {
    nodes: at(NA, [
      [45, 105],
      [47, 88],
      [42, 72],
      [29, 63],
      [16, 67],
      [11, 83],
      [18, 98],
      [36, 104],
      [118, 110],
    ]),
  },
  { nodes: at(NA, [[118, H], [118, 0]]), pause: LIFT },
];

/* म — straight down the left arm from the headline, one round turn at its
 * foot, back up across the arm into a low bar to the stem; then the stem. */
const MA = 158;
const ma = [
  {
    nodes: at(MA, [
      [28, H],
      [28, 112],
      [28, 72],
      [26, 54],
      [17, 44],
      [4, 42],
      [-6, 48],
      [-10, 62],
      [-5, 77],
      [8, 88],
      [28, 94],
      [124, 101],
    ]),
    pause: NEXT,
  },
  { nodes: at(MA, [[124, H], [124, 0]]), pause: LIFT },
];

/* स्त — half-sa: a small hook rising to hang from the headline, the bowl
 * swinging round and back left onto the bar line, a cusp, the slant down to the
 * baseline; then the bar from the cusp, which runs straight on into ta's bar.
 * Ta itself: from its stem leftwards along that same line, turning down at the
 * junction into its hook; then the stem. */
const STA = 308;
// One straight bar line from the cusp to ta's stem (~3° rise).
const bar = (x) => 100 + (x - 6) * (10 / 180);
const sta = [
  {
    nodes: at(STA, [
      [15, 141],
      [25, 162],
      [50, 174.5],
      [76, 168],
      [86, 149],
      [78, 127],
      [58, 109],
      [38, bar(38)],
      [20, bar(20)],
      [6, 100, "c"],
      [34, 50],
      [70, 4],
    ]),
    pause: NEXT,
  },
  {
    nodes: at(STA, [
      [6, 100],
      [38, bar(38)],
      [80, bar(80)],
      [118, bar(118)],
    ]),
    pause: LIFT,
  },
  {
    nodes: at(STA, [
      [186, bar(186)],
      [152, bar(152)],
      [118, bar(118), "c"],
      [108, 92],
      [102, 74],
      [101, 56],
      [106, 36],
      [122, 16],
      [150, 3],
    ]),
    pause: LIFT,
  },
  { nodes: at(STA, [[190, H], [190, 0]]), pause: LIFT },
];

/* The shirorekha in one sweep across the word, then the e-matra: one soft arc
 * that starts above the ta and curves down onto the headline at the stem. */
const headline = { nodes: [[-5, H], [STA + 206, H]], pause: 190 };
const eMatra = {
  nodes: at(STA, [
    [126, 240],
    [146, 247],
    [166, 236],
    [182, 210],
    [193, 178],
  ]),
  pause: 120,
};

export default {
  id: "hi",
  text: "नमस्ते",
  language: "Hindi",
  lang: "hi",
  dir: "ltr",
  script: "Devanagari",
  slantDeg: 0,
  strokeWidth: 11,
  // Ten strokes: give the pen the same pace as "hello" instead of squeezing
  // the ink between the pen lifts.
  timing: { write: 2900 },
  strokes: [...na, ...ma, ...sta, headline, eMatra],
};
