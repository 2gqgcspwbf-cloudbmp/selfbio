/**
 * Arabic — "مرحباً" (marhaban), bespoke monoline hand-lettering, written right to left.
 *
 * Design space: baseline y = 0, y up. Handwritten-naskh proportions: alif 162,
 * hah head ~100, meem head 60, beh tooth 56 (body ≈ 0.35 of the alif), reh tail
 * -60, tanween clear of the alif top, so the whole word (≈310 × 299 with the
 * pen) sits in the same height budget as "hello". The baseline is flat at y = 0
 * except where the tooth fillets and the alif corner leave it. The pen moves
 * right → left (x decreasing) along the word.
 *
 * Writing order, as a native writer forms it:
 *   1. م→ر   one stroke: the meem head looped clockwise, out along the baseline,
 *            into the reh, which drops below the line. ر never joins forward,
 *            so the pen lifts.
 *   2. ح→ب→ا one stroke: hah head right→left, a sharp vertex, the body arcs
 *            down to the right and curls back left into the baseline, then
 *            the beh tooth and on to the alif, which rises from the baseline
 *            as the final upward stroke.
 *   3. the beh's nuqta below the tooth.
 *   4-5. tanween fathatan above the alif: two short strokes, upper first,
 *            each drawn upper-right → lower-left.
 */
import { dot, translate } from "../engine.mjs";

/* Letter x positions (right → left). */
const MEEM = 424; // left edge of the meem head
const REH = 396; // the reh's shoulder
const HAH = 279; // the hah's top-left vertex
const BEH = 254; // the beh tooth
const ALIF = 200; // the alif stem

/* م → ر */
const meemReh = [
  // meem head: a round loop, looped clockwise from its lower-left point
  ...translate(
    [
      [10, 1],
      [2, 18],
      [2, 37],
      [14, 53],
      [34, 60],
      [52, 53],
      [62, 36],
      [58, 17],
      [41, 4],
      [20, 0],
      [-4, 0],
    ],
    MEEM,
  ),
  // reh: a slight shoulder at the joint, then the tail sweeps down and left
  ...translate(
    [
      [12, 0],
      [0, 1.5],
      [-7, -4],
      [-15, -18],
      [-28, -37],
      [-46, -52],
      [-70, -60],
    ],
    REH,
  ),
];

/* ح → ب → ا */
const hahBehAlif = [
  // hah head: a shallow arch drawn right → left, ending in a sharp vertex that
  // opens ~50° so the head and neck stay distinct strokes at pen width 11
  ...translate(
    [
      [60, 95],
      [42, 99.5],
      [22, 99.5],
      [2, 96, "c"],
      // the body arcs down to the right, staying under the head, and curls
      // flat into the baseline
      [16, 80],
      [29, 63],
      [39, 46],
      [45, 29],
      [46, 13],
      [40, 4],
      [27, 0.4],
      [12, 0],
    ],
    HAH,
  ),
  // beh tooth
  ...translate(
    [
      [20, 0],
      [10, 1.5],
      [4, 12],
      [1, 56, "c"],
      [-3, 12],
      [-9, 1.5],
      [-19, 0],
    ],
    BEH,
  ),
  // on to the alif, which rises from the baseline
  [ALIF + 20, 0],
  [ALIF + 8, 0],
  [ALIF, -1, "c"],
  [ALIF + 2, 80],
  [ALIF + 4, 162],
];

const nuqta = dot(BEH, -30, 7, 215);

const fathatan = [
  { nodes: [[ALIF + 14, 217], [ALIF - 2, 208]] },
  { nodes: [[ALIF + 14, 191], [ALIF - 2, 182]] },
];

export default {
  id: "ar",
  text: "مرحباً",
  language: "Arabic",
  lang: "ar",
  dir: "rtl",
  script: "Arabic",
  slantDeg: 0,
  strokeWidth: 11,
  strokes: [{ nodes: meemReh }, { nodes: hahBehAlif }, nuqta, ...fathatan],
};
