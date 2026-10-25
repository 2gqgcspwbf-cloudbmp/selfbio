import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "fr",
  text: "bonjour",
  language: "French",
  lang: "fr",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("bonjour"), latin, { lead: leadIn("bonjour") }),
};
