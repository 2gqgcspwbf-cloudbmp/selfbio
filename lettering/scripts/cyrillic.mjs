/**
 * Bespoke monoline Cyrillic script — Russian school cursive (прописи), lowercase,
 * joined, in the same hand as the Latin "hello".
 *
 * Upright design space (the engine applies the slant): x-height 100, ascender
 * loop ~248, descender ~-108, baseline 0, y up. Every glyph's body runs from
 * where the joining stroke arrives to where it leaves; joins are formed by the
 * spline flowing from one glyph's exit (the foot of its last downstroke) into
 * the next glyph's entry, so each entry also carries its rising join.
 *
 * Letter construction follows the Russian copybook:
 *  - п, р, т open with a round hook ("ведём вверх вправо, закругляем") into a
 *    straight slanted stem; inner stems are retraced back up ("возвращаемся
 *    вверх по ней же") before the next arch springs off them. The hook has the
 *    proportions of the Latin n/m in "hello".
 *  - и is two downstrokes rounded at the bottom, sharp at the top; the second
 *    upstroke runs onto its stem and the downstroke comes back over it.
 *  - в rises in a loop (crossing at the x-height), drops its stem, rounds into a
 *    bowl that closes on the stem about halfway up, makes a small петелька there
 *    and leaves to the right over the bowl (верхнее соединение).
 *  - е is a loop written counter-clockwise from its crossing.
 */

/** Stem-to-stem spacing of the arches of п, р, т. */
const ARCH = 58;

/** The round opening hook of п/р/т, ending on a stem at x = sx (stem not included). */
const hump = (sx) => [
  [sx - 28, 84],
  [sx - 21, 97],
  [sx - 11, 102],
  [sx - 2, 96],
  [sx, 78],
];

/** Retrace up a stem standing at x = sx and spring an arch over to x = sx + w. */
const arch = (sx, w = ARCH) => [
  [sx, 44],
  [sx + 2, 68],
  [sx + 0.22 * w, 92],
  [sx + 0.52 * w, 101],
  [sx + 0.8 * w, 94],
  [sx + 0.97 * w, 72],
];

/** Last downstroke at x = lx: down to the baseline and round into the joining stroke. */
const leg = (lx) => [
  [lx, 26],
  [lx + 6, 6],
  [lx + 19, 0],
];

/** Word-final leg: the same foot, then a relaxed rising exit (the Latin foot). */
const legEnd = (lx) => [
  [lx, 26],
  [lx + 6, 6],
  [lx + 20, 0],
  [lx + 34, 8],
  [lx + 46, 20],
];

/** Glyphs start on their own: п begins "чуть ниже верхней линии", no lead-in. */
export const LEAD = [];

const P_STEM = 38;
const R_STEM = 50;
const T_STEM = 50;
/** в: the stem the loop comes down. */
const V = 28;

export const cyrillic = {
  п: {
    w: 124,
    body: [
      [P_STEM - 34, 66],
      ...hump(P_STEM),
      [P_STEM, 0, "c"],
      ...arch(P_STEM),
      ...leg(P_STEM + ARCH),
    ],
  },

  р: {
    w: 138,
    body: [
      [R_STEM - 34, 48],
      ...hump(R_STEM),
      [R_STEM, 0],
      [R_STEM, -108, "c"],
      [R_STEM, -50],
      ...arch(R_STEM),
      ...leg(R_STEM + ARCH),
    ],
  },

  и: {
    w: 125,
    body: [
      [18, 48],
      [28, 84],
      [32, 102, "c"],
      [31, 60],
      [31, 26],
      [37, 7],
      [52, 0],
      [68, 8],
      [80, 30],
      [87, 62],
      [89, 102, "c"],
      [87, 62],
      ...leg(87),
    ],
  },

  в: {
    w: 100,
    body: [
      // Join rising from the foot of и into the loop; crosses the stem at the x-height.
      [V - 18, 54],
      [V - 1, 100],
      [V + 16, 150],
      [V + 33, 198],
      [V + 39, 228],
      [V + 29, 247],
      [V + 12, 244],
      [V + 3, 214],
      [V, 150],
      [V, 60],
      // Bowl, counter-clockwise, closing on the stem from the right.
      [V + 2, 24],
      [V + 10, 6],
      [V + 26, 0],
      [V + 43, 6],
      [V + 54, 22],
      [V + 57, 42],
      [V + 52, 58],
      [V + 40, 67],
      [V + 24, 66],
      [V + 11, 57],
      // Петелька: on round, crossing the bowl's shoulder, and out to the right.
      [V + 12, 48],
      [V + 19, 43],
      [V + 28, 44],
      [V + 40, 53],
      [V + 50, 61],
      [V + 60, 66],
    ],
  },

  е: {
    w: 86,
    body: [
      [4, 68],
      [22, 71],
      [38, 82],
      [46, 96],
      [39, 106],
      [25, 103],
      [15, 86],
      [12, 62],
      [15, 28],
      [26, 7],
      [44, 0],
      [60, 5],
      [74, 18],
      [86, 38],
    ],
  },

  т: {
    w: 230,
    body: [
      ...hump(T_STEM),
      [T_STEM, 0, "c"],
      ...arch(T_STEM),
      [T_STEM + ARCH, 0, "c"],
      ...arch(T_STEM + ARCH),
      ...legEnd(T_STEM + 2 * ARCH),
    ],
  },
};
