import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "tr",
  text: "merhaba",
  language: "Turkish",
  lang: "tr",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("merhaba"), latin, { lead: leadIn("merhaba") }),
};
