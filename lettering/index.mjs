/**
 * Language registry for the welcome sequence. Order here is the order shown.
 * Each language's artwork and stroke order lives in its own file in ./languages.
 */
import { compile } from "./engine.mjs";

export const SEQUENCE = ["en", "fr", "es", "it", "de", "zh", "ja", "ko", "ar", "ru", "hi", "pt", "he", "th", "el", "tr", "sv"];

const cache = new Map();
export async function loadLanguage(id) {
  if (!cache.has(id)) cache.set(id, (await import(`./languages/${id}.mjs?v=${Date.now()}`)).default);
  return cache.get(id);
}

export async function listLanguages() {
  const out = [];
  for (const id of SEQUENCE) {
    try {
      out.push(await loadLanguage(id));
    } catch (e) {
      if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
    }
  }
  return out;
}

/** Compiles one language to the JSON shape the animation component consumes. */
export async function compileLanguage(id, { debug = false } = {}) {
  const def = await loadLanguage(id);
  const art = compile(def.strokes, { slantDeg: def.slantDeg ?? 0, strokeWidth: def.strokeWidth ?? 11, debug });
  return {
    id: def.id,
    text: def.text,
    language: def.language,
    lang: def.lang,
    dir: def.dir ?? "ltr",
    script: def.script,
    timing: def.timing ?? {},
    ...art,
  };
}
