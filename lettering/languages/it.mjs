import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "it",
  text: "ciao",
  language: "Italian",
  lang: "it",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("ciao"), latin, { lead: leadIn("ciao") }),
};
