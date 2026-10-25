import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "de",
  text: "hallo",
  language: "German",
  lang: "de",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("hallo"), latin, { lead: leadIn("hallo") }),
};
