import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "sv",
  text: "hej",
  language: "Swedish",
  lang: "sv",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("hej"), latin, { lead: leadIn("hej") }),
};
