/**
 * Thai — "สวัสดี" (sawasdee), bespoke monoline looped Thai handwriting.
 *
 * Design space: consonant body height ~134, baseline 0, y up; a gentle hand
 * lean (slantDeg) is applied on top. Letters are drawn near-square, as in Thai
 * school handwriting (ตัวกลม), not condensed like a display face.
 *
 * Every consonant is one continuous pen stroke that begins at its head (the
 * small loop), exactly as Thai children are taught to write; the above-vowels
 * are added straight after the consonant they sit on. ั and ี are about the
 * same height and both float ~11 units clear of the letter below them.
 */
import { translate } from "../engine.mjs";

const at = (nodes, dx) => ({ nodes: translate(nodes, dx) });

/**
 * Nodes on a circular head loop, from angle a0 to a1 (degrees, y up;
 * a1 < a0 runs clockwise), roughly every `step` degrees.
 */
function loop(cx, cy, r, a0, a1, step = 20) {
  const n = Math.max(2, Math.round(Math.abs(a1 - a0) / step));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10]);
  }
  return out;
}

/**
 * ส (so suea): head at the bottom-left drawn clockwise (its foot just
 * overshoots the baseline), up the left side, over the low arch and down into
 * the stem at the foot, back up the stem, out into the flag (a short sickle
 * leaning up and to the right, retraced exactly), back to the joint and over
 * the top bar to the left, ending in a down-turned terminal.
 */
const soSuea = [
  ...loop(17, 16, 15, 180, -180),
  [1.8, 40],
  [5.5, 62],
  [19, 79],
  [44, 88],
  [71, 80],
  [88.5, 63],
  [97.5, 42],
  [100.2, 20],
  [100.2, 0, "c"],
  [100.6, 30],
  [101, 70],
  [101.6, 106],
  [103, 122, "c"],
  [109.5, 134],
  [117.5, 145, "c"],
  [109.5, 134],
  [103, 122, "c"],
  [86, 133],
  [61, 137.5],
  [35, 134.5],
  [16, 126],
  [6.5, 113],
];

/**
 * ว (wo waen): head at the foot drawn anticlockwise (it starts and ends on
 * the stem line, so the join is clean), up the stem on the right, over a round shoulder and
 * down into the short left terminal.
 */
const woWaen = [
  ...loop(62, 16, 15, 0, 360),
  [78, 44],
  [78.5, 76],
  [75.5, 103],
  [66, 121],
  [52, 131.5],
  [36, 134],
  [20, 129],
  [9, 118],
  [3, 104],
];

/** ั (mai han-akat): small head anticlockwise, then a smile rising to the right. */
const maiHanAkat = [
  ...loop(34, 169, 12.5, -90, 270),
  [50, 157.5],
  [66, 164],
  [78, 175],
  [87, 190],
];

/**
 * ด (do dek): head inside drawn clockwise, out down-left to the foot (arriving
 * at a wide enough angle that the corner stays open), up the left side, over
 * the round top and down the stem on the right.
 */
const doDek = [
  ...loop(52, 64, 15, -60, -420),
  [45, 41],
  [29, 25.5],
  [15, 11],
  [5, 0, "c"],
  [2.8, 36],
  [3, 70],
  [6.5, 99],
  [17.5, 120],
  [34, 131.5],
  [54, 135.5],
  [73.5, 131.5],
  [90, 120],
  [100.5, 100],
  [104.3, 72],
  [104.8, 36],
  [104, 0],
];

/**
 * ี (sara ii): shallow dome from the left, down its right side onto the pole,
 * then straight up: the pole clears the dome by about one pen width.
 */
const saraIi = [
  [17, 149.5],
  [28, 160.5],
  [42, 168.5],
  [61, 171.5],
  [80, 168],
  [94, 160],
  [102.5, 152],
  [104, 149, "c"],
  [104.5, 186],
];

// Optical spacing: about 30 units clear between letters, a little more where
// two straight sides face each other (ส|ด), and the ส flag clears ี by ~29.
const X = { so1: 0, wo: 138, so2: 255, do: 396 };

export default {
  id: "th",
  text: "สวัสดี",
  language: "Thai",
  lang: "th",
  dir: "ltr",
  script: "Thai",
  slantDeg: 6,
  strokeWidth: 11,
  strokes: [
    at(soSuea, X.so1),
    at(woWaen, X.wo),
    at(maiHanAkat, X.wo),
    at(soSuea, X.so2),
    at(doDek, X.do),
    at(saraIi, X.do),
  ],
};
