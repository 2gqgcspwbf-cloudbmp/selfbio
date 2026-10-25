/**
 * Renders lettering to PNG so letterforms can be judged visually.
 *
 *   node scripts/preview-lettering.mjs <id|all> [--out DIR] [--debug] [--stages 25,50,75,100]
 *
 * For each language it writes <id>-<stage>.png (the word partly written, as the
 * animation would show it at that point) and, with --debug, <id>-debug.png with
 * every authored node marked (corners in red) and strokes numbered/coloured by order.
 * --sheet writes one contact sheet of all requested languages at 100%.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { compileLanguage, listLanguages } from "../lettering/index.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const target = args[0] ?? "all";
const outDir = path.resolve(opt("--out", path.join(ROOT, ".lettering-preview")));
const stages = opt("--stages", "25,50,75,100").split(",").map(Number);
const debug = flag("--debug");
fs.mkdirSync(outDir, { recursive: true });

const WIDTH = 1200;

function svgFor(art, progress, { debugNodes = null, numbered = false } = {}) {
  const [x, y, w, h] = art.viewBox;
  const total = art.strokes.reduce((a, s) => a + s.length, 0);
  let budget = total * progress;
  const paths = [];
  art.strokes.forEach((s, i) => {
    const visible = Math.max(0, Math.min(s.length, budget));
    budget -= s.length;
    if (visible <= 0) return;
    const color = numbered ? `hsl(${Math.round((i / Math.max(1, art.strokes.length - 1)) * 280)} 85% 62%)` : "#fff";
    const dash = visible >= s.length ? "" : ` stroke-dasharray="${visible} ${s.length + 1000}"`;
    paths.push(`<path d="${s.d}" stroke="${color}"${dash}/>`);
  });
  let overlay = "";
  if (debugNodes) {
    const r = art.strokeWidth * 0.28;
    debugNodes.forEach((nodes, si) => {
      nodes.forEach(([nx, ny, corner], ni) => {
        overlay += `<circle cx="${nx}" cy="${ny}" r="${r}" fill="${corner ? "#ff3b30" : "#ffd60a"}"/>`;
        if (ni === 0) overlay += `<text x="${nx + r * 2}" y="${ny - r * 2}" fill="#fff" font-size="${art.strokeWidth * 1.4}" font-family="sans-serif">${si + 1}</text>`;
      });
    });
  }
  const pad = art.strokeWidth * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}">
<rect x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}" fill="#000"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${art.strokeWidth}">${paths.join("")}</g>${overlay}</svg>`;
}

function png(svg, width = WIDTH) {
  return new Resvg(svg, { fitTo: { mode: "width", value: width }, background: "#000" }).render().asPng();
}

const ids = target === "all" ? (await listLanguages()).map((l) => l.id) : target.split(",");

if (flag("--sheet")) {
  // Every greeting at the same scale (lettering units), 2 per row.
  const arts = [];
  for (const id of ids) arts.push(await compileLanguage(id));
  const cellW = Math.max(...arts.map((a) => a.viewBox[2])) + 60;
  const cellH = Math.max(...arts.map((a) => a.viewBox[3])) + 70;
  const cols = 2;
  const rows = Math.ceil(arts.length / cols);
  let body = "";
  arts.forEach((a, i) => {
    const cx = (i % cols) * cellW;
    const cy = Math.floor(i / cols) * cellH;
    const [x, y, w, h] = a.viewBox;
    body += `<text x="${cx + 14}" y="${cy + 34}" fill="#666" font-size="22" font-family="sans-serif">${a.id} · ${a.language}</text>`;
    body += `<svg x="${cx + (cellW - w) / 2}" y="${cy + 50 + (cellH - 70 - h) / 2}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="visible"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="${a.strokeWidth}">${a.strokes.map((st) => `<path d="${st.d}"/>`).join("")}</g></svg>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * cellW} ${rows * cellH}"><rect width="100%" height="100%" fill="#000"/>${body}</svg>`;
  fs.writeFileSync(path.join(outDir, "sheet.png"), png(svg, 1600));
  console.log(`sheet → ${path.join(outDir, "sheet.png")}`);
  process.exit(0);
}
for (const id of ids) {
  const art = await compileLanguage(id, { debug });
  for (const st of stages) fs.writeFileSync(path.join(outDir, `${id}-${st}.png`), png(svgFor(art, st / 100)));
  if (debug) fs.writeFileSync(path.join(outDir, `${id}-debug.png`), png(svgFor(art, 1, { debugNodes: art.debugNodes, numbered: true })));
  console.log(`${id}: ${art.strokes.length} strokes, viewBox ${art.viewBox.join(" ")}`);
}
console.log(`→ ${outDir}`);
