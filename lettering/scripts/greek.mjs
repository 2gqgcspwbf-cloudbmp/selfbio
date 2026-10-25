/**
 * Bespoke monoline Greek lowercase — the same hand as the Latin "hello".
 *
 * Upright design space (the engine applies the slant): x-height 100,
 * γ's loop to ~-125, baseline 0, y up. x is measured from each letter's own
 * left edge. Each glyph is a `body`: the pen path in writing order, from where
 * the pen arrives to where it leaves.
 *
 * A fluent Greek hand is partly joined: γ stands on its own, the ε's exit
 * rises into ι, ι's foot runs into α, and σ's bar runs straight on into ο,
 * which leaves over its top into υ — the same joins the Latin hand uses
 * (low join into a spike, low join onto a bowl, high join along a bowl's top).
 * The bowls (α, σ, ο) share the Latin bowl ellipse (centre 50,52; radii
 * 33 x 52) and are written counter-clockwise from the top, as Greek is taught.
 */
import { translate } from "../engine.mjs";

/* ---------------------------------------------------------------- */
/* Bowls (same geometry as the Latin a/o)                            */
/* ---------------------------------------------------------------- */

const BOWL_A = [17.1, 56];
const BOWL_D = [17, 52];
const BOWL_E = [16.9, 48];
/** Left side of the bowl, climbing from just above its leftmost point to the top. */
const BOWL_UP = [BOWL_A, [17.8, 64], [20.6, 75], [25.5, 86], [34, 97], [49, 104]];
/** From the top back over the left shoulder, down the left side, round to the bottom. */
const bowlLeft = [...[...BOWL_UP].reverse(), BOWL_D, BOWL_E, [17.6, 38], [20.6, 27], [27, 15], [37, 5], [50, 0]];
/** Bottom to the right side (up to about two thirds of the height). */
const bowlRight = [
  [63, 5],
  [74, 15],
  [80.6, 29],
  [83, 46],
];

/*
 * A low join meets a bowl at its leftmost point D, climbs the left side and
 * the top to the start point, and the bowl retraces that climb on its way
 * round. Centripetal Catmull-Rom segments depend only on their neighbours,
 * and the climb and the retrace pass through the same nodes with mirrored
 * phantom ends, so the two coincide exactly: the join reads as one line
 * forking off the bowl and nothing cuts through the counter.
 */
const lowBowlEntry = (P) => [[...BOWL_D, "c"], ...BOWL_UP, [...P, "c"]];

/* ---------------------------------------------------------------- */
/* Glyphs                                                            */
/* ---------------------------------------------------------------- */

/** α: top right of the bowl and top of the stem are one point. */
const ALPHA_P = [82, 101];

/** ο: starts just right of the top, where its own closing stroke hides the turn. */
const OMICRON_P = [62, 101];

export const greek = {
  // γ (on its own): a small tick at the top left, the left arm falls through
  // the crossing just above the baseline, loops clockwise in the descender
  // and climbs out as the gently bowed right arm.
  "γ": {
    w: 112,
    body: [
      [-5, 82],
      [-1, 94],
      [7, 100.5],
      [16, 98],
      [23, 86],
      [30, 66],
      [40, 42],
      [50, 14],
      [57, -22],
      [61, -64],
      [61, -94],
      [56, -114],
      [45, -124],
      [34, -120],
      [29, -104],
      [30, -80],
      [33, -52],
      [38, -26],
      [44, -4],
      [53, 18],
      [64, 40],
      [77, 66],
      [90, 88],
      [102, 101],
    ],
  },

  // ε: from its top right, two counter-clockwise curves meeting at a crisp
  // point at the waist (never an out-and-back tongue), then out of the lower
  // curve rising into the next letter.
  "ε": {
    w: 80,
    body: [
      [60, 87],
      [50, 98],
      [34, 101],
      [20, 95],
      [13, 81],
      [16, 67],
      [27, 57, "c"],
      [15, 47],
      [7, 31],
      [9, 13],
      [23, 2],
      [42, 0],
      [60, 6],
      [72, 18],
    ],
  },

  // ι (joined): the rising join comes to a point at the x-height, one short
  // downstroke, and the foot turns out to the right. No dot.
  "ι": {
    w: 66,
    body: [
      [18, 48],
      [28, 84],
      [32, 102, "c"],
      [30, 60],
      [30, 28],
      [36, 6],
      [50, 0],
      [64, 8],
      [74, 22],
    ],
  },

  // α (after a low join): onto the bowl, round it counter-clockwise from the
  // top right, up the right side into the top of the stem, down the stem
  // (retracing the bowl until it forks near the foot) and out in a small tail.
  "α": {
    w: 120,
    body: [
      ...lowBowlEntry(ALPHA_P),
      ...bowlLeft,
      ...bowlRight,
      [83, 66],
      [82.6, 84],
      [...ALPHA_P, "c"],
      [82.6, 84],
      [83, 66],
      [83, 46],
      [84, 26],
      [88, 8],
      [97, 0],
      [108, 2],
      [117, 10],
    ],
  },

  // σ (medial, starting a word): counter-clockwise round the bowl from the
  // top, closing at the top right and running on, level, as the bar.
  "σ": {
    w: 100,
    body: [
      [64, 103.5],
      [49, 104],
      ...bowlLeft.slice(1),
      ...bowlRight,
      [82.5, 64],
      [77.5, 86],
      [64, 103.5, "c"],
      [88, 104],
    ],
  },

  // ο (after σ's bar or any high join): the bar lands on the top and turns
  // back at P, counter-clockwise round the bowl, up the right side into a
  // small loop at the top, and out level at the x-height (as in "hello").
  "ο": {
    w: 104,
    body: [
      [30, 104],
      [49, 104],
      [...OMICRON_P, "c"],
      ...bowlLeft,
      ...bowlRight,
      [81.4, 66],
      [75.5, 84],
      [67, 98],
      [57, 104.5],
      [47, 98],
      [46, 85],
      [55, 75],
      [71, 78],
      [86, 93],
      [102, 103],
      [118, 104],
    ],
  },

  // υ (after a high join): down the left arm, round at the bottom (never
  // pointed — that would be ν), up the right arm to a soft outward finish.
  "υ": {
    w: 108,
    body: [
      [24, 104],
      [30, 101, "c"],
      [28, 60],
      [28, 28],
      [36, 6],
      [52, 0],
      [70, 10],
      [82, 40],
      [86.5, 70],
      [89.5, 89],
      [94, 99],
      [100, 103],
      [106, 104],
    ],
  },
};

/**
 * Writes a greeting. `strokes` is a list of pen strokes; each is a list of
 * [key, x] letters joined into one continuous line, x being the letter's
 * left edge. Returns engine strokes in writing order.
 */
export function write(strokes, glyphs = greek) {
  return strokes.map((letters) => {
    const nodes = [];
    for (const [key, x, dy = 0] of letters) {
      const g = glyphs[key];
      if (!g) throw new Error(`No Greek glyph for "${key}"`);
      const body = translate(g.body, x, dy);
      // Drop a duplicate join node.
      const last = nodes.at(-1);
      if (last && Math.hypot(last[0] - body[0][0], last[1] - body[0][1]) < 0.5) body.shift();
      nodes.push(...body);
    }
    return { nodes };
  });
}
