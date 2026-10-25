/**
 * こんにちは — Japanese, written in hiragana with a monoline pen.
 *
 * Centre lines and stroke order come from KanjiVG (CC BY-SA 3.0): こ 2 strokes,
 * ん 1, に 3, ち 2, は 3 — written left to right, each kana with its own pen
 * lifts, the flicks (はね) that lead the hand into the next stroke kept.
 */
import { kanjivg, inkBounds, shift } from "../sources/cjk.mjs";

// Kana ink is about 90% of the hanzi height in 你好 (whose box is 265), so the
// greeting carries the same visual weight as the other scripts.
const SIZE = 255; // KanjiVG box (109) scaled
const GAP = 34; // space between one kana's ink and the next

// Stroke edits in the KanjiVG 109 box (y down). A pen has no brush entry dip:
// every stroke starts clean on its own line, so the dips are redrawn away
// (`points`) rather than kept, and curled brush hane become crisp pen flicks
// that point at the start of the next stroke.
const EDITS = {
  こ: {
    0: { points: [[37, 28.7], [51.7, 26.5], [63.1, 25.6], [68.4, 25.9], [70.4, 27], [66.2, 33.8]], corners: [4] },
  },
  ん: {
    // One straight diagonal from the top to the foot, a sharp turn, back up
    // exactly on the same line for a moment (a straight run, so the two pen
    // lines coincide instead of thickening the foot), then off it on a straight
    // branch — a crisp V; the corner where it leaves lies inside the ink —
    // over the hump and out with the rising tail.
    0: {
      points: [
        [60.3, 17.5], [39, 52], [22.1, 79.1], [17.2, 89.2],
        [21.1, 81.2], [31, 72.8], [41.5, 63.8], [48.5, 61.5], [54.5, 65], [57, 73.5], [59.5, 85], [66.5, 91.8], [77, 87.5], [89.8, 68.6],
      ],
      corners: [3, 4],
    },
  },
  に: {
    0: { points: [[25.3, 22.8], [24.6, 32], [20.5, 52], [18.3, 76.8], [19.6, 86], [26.8, 74.2]], corners: [4] },
    1: { points: [[55, 32.2], [66, 31], [80.3, 28.6], [85, 28.9], [86.9, 30.1], [82.6, 36.8]], corners: [4] },
  },
  ち: {
    0: { points: [[25.5, 33.9], [42, 31.4], [57.75, 27.74], [65.4, 25.4]] },
  },
  は: {
    0: { points: [[26.4, 18.5], [24.9, 30], [22.6, 46], [21.6, 64], [22.1, 79.5], [23.3, 87.5], [29.3, 76.6]], corners: [5] },
    1: { points: [[50.5, 39.8], [69.5, 36.9], [88.6, 33.7]] },
    // Straight down the stem, past the crossing, round the knot (down, left,
    // up, right across the stem) and out to the lower right. The knot is a
    // round oval with an open eye, not a flat almond.
    2: {
      points: [
        [72.6, 17.2], [72.9, 30], [73.6, 50], [74.2, 68], [74.2, 79],
        [72.4, 85.6], [67.6, 89.9], [60.5, 91.6], [52.5, 90.8], [46.6, 87.9], [44.2, 83.4], [45.8, 78.6], [51, 75.3], [58.5, 74.2], [66.5, 75.2],
        [74.2, 77.6], [80.2, 81.6], [86.4, 88],
      ],
    },
  },
};

const strokes = [];
let cursor = 0;
for (const ch of "こんにちは") {
  const glyph = kanjivg(ch, { size: SIZE, edits: EDITS[ch] });
  const b = inkBounds(glyph);
  strokes.push(...shift(glyph, cursor - b.minX));
  cursor += b.maxX - b.minX + GAP;
}

export default {
  id: "ja",
  text: "こんにちは",
  language: "Japanese",
  lang: "ja",
  dir: "ltr",
  script: "Hiragana",
  slantDeg: 0,
  strokeWidth: 11,
  strokes,
};
