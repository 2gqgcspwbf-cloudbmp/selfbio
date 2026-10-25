import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "pt",
  text: "olá",
  language: "Portuguese",
  lang: "pt",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("olá"), latin, { lead: leadIn("olá") }),
};
