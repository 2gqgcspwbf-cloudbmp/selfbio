import { cursive } from "../engine.mjs";
import { latin, shape, leadIn } from "../scripts/latin.mjs";

export default {
  id: "en",
  text: "hello",
  language: "English",
  lang: "en",
  dir: "ltr",
  script: "Latin",
  slantDeg: 12,
  strokeWidth: 11,
  strokes: cursive(shape("hello"), latin, { lead: leadIn("hello") }),
};
