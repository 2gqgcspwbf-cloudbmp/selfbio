import { write } from "../scripts/greek.mjs";

/**
 * "γεια σου" — Greek lowercase in the hand of "hello", joined the way a
 * fluent Greek hand joins: γ on its own, then "εια" in one stroke, and after
 * the word space "σου" in one stroke (σ's bar runs into ο, ο leaves over its
 * top into υ). Monotonic spelling: both words are monosyllables, so no accent,
 * and σου takes the medial σ.
 */
export default {
  id: "el",
  text: "γεια σου",
  language: "Greek",
  lang: "el",
  dir: "ltr",
  script: "Greek",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: write([
    [["γ", 0]],
    [
      ["ε", 112],
      ["ι", 192],
      ["α", 258],
    ],
    [
      ["σ", 428],
      ["ο", 547],
      ["υ", 656],
    ],
  ]),
};
