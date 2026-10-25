import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "es",
  text: "hola",
  language: "Spanish",
  lang: "es",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("hola"), latin, { lead: leadIn("hola") }),
};
