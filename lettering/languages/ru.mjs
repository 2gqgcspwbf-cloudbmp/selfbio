import { cursive } from "../engine.mjs";
import { cyrillic, LEAD } from "../scripts/cyrillic.mjs";

export default {
  id: "ru",
  text: "привет",
  language: "Russian",
  lang: "ru",
  dir: "ltr",
  script: "Cyrillic",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive("привет", cyrillic, { lead: LEAD }),
};
