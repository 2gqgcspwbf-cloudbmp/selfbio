"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { buildLensSlices, lensKey } from "@/lib/lensMap";

/**
 * Refracting bevel for a glass surface, as a progressive enhancement.
 *
 * Only Chromium renders an SVG filter inside backdrop-filter. Safari and Firefox accept url() as valid
 * syntax (so CSS.supports() says yes) and then drop the whole declaration at render time, blur
 * included. So:
 *   - the lens is switched on by engine, never by parse support;
 *   - it is applied only as an inline style, set after the <filter> has mounted and its map has
 *     decoded, and removed on unmount;
 *   - the stylesheet's blur is never touched, so every other engine, and any failure here, keeps it.
 */

export type LensTier = "off" | "lite" | "full";

type UAData = { brands?: { brand: string; version: string }[] };

const MIN_CHROMIUM = 120;

/**
 * navigator.userAgentData exists only in Chromium (and only in secure contexts: localhost and HTTPS),
 * and every iOS browser is WebKit without it. Anything uncertain stays "off".
 */
function detectTier(): LensTier {
  const nav = navigator as Navigator & { userAgentData?: UAData; deviceMemory?: number };
  const mq = (q: string) => window.matchMedia(q).matches;
  const chromium = Number(nav.userAgentData?.brands?.find((b) => b.brand === "Chromium")?.version ?? 0);
  if (!(chromium >= MIN_CHROMIUM)) return "off";
  if (!CSS.supports("backdrop-filter", "blur(1px)")) return "off";
  if (mq("(prefers-reduced-transparency: reduce)") || mq("(forced-colors: active)")) return "off";
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 4;
  // Touch devices keep the stylesheet blur: core count and memory say nothing about the GPU, and budget
  // octa-core phones would re-run the whole filter graph on every frame of the background video.
  if (!mq("(hover: hover) and (pointer: fine)")) return "off";
  // Desktop: dispersion (three displacement passes) when there's headroom, one pass otherwise.
  return cores >= 4 && memory >= 4 ? "full" : "lite";
}

let detected: LensTier | undefined;
const getTier = () => (detected ??= detectTier());
const getServerTier = (): LensTier => "off";
const subscribe = () => () => {};

/** Blue bends a little more than red: under 1px of colour split, right at the edge. */
const DISPERSION = 0.03;

/** Force alpha to 1. feColorMatrix works on un-premultiplied colour, so after a blur this also
 * renormalises the edge of the border box: nothing outside it darkens the frost. */
const OPAQUE = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1";
/** Light concentrates in the polished rim. */
const RIM_GAIN = "1.15 0 0 0 0  0 1.15 0 0 0  0 0 1.15 0 0  0 0 0 1 0";
/** Map blue -> alpha: how polished (unfrosted) the rim is at each pixel. */
const RIM_MASK = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0";
const CHANNEL = {
  r: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
  g: "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
  b: "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
};

function decode(src: string) {
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => undefined);
}

interface Props {
  /** Filter id: unique on the page and safe inside url(#…). */
  id: string;
  /** The glass element. */
  target: RefObject<HTMLElement | null>;
  /** Width of the polished bevel, CSS px. Keep it under the corner radius. */
  bezel: number;
  /** Peak inward shift is scale / 2. Keep scale × (1 + 2 × DISPERSION) <= bezel so the rim never folds. */
  scale: number;
  /** Frosted-face blur, px. Must equal the element's stylesheet blur(). */
  frost: number;
  /** Must equal the element's stylesheet saturate(), in %. */
  saturate: number;
}

export function GlassLens({ id, target, bezel, scale, frost, saturate }: Props) {
  const tier = useSyncExternalStore(subscribe, getTier, getServerTier);
  const topRef = useRef<SVGFEImageElement>(null);
  const midRef = useRef<SVGFEImageElement>(null);
  const bottomRef = useRef<SVGFEImageElement>(null);

  useEffect(() => {
    const el = target.current;
    const top = topRef.current;
    const mid = midRef.current;
    const bottom = bottomRef.current;
    if (tier === "off" || !el || !top || !mid || !bottom) return;

    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    let cap = 0;
    let key = "";
    let timer = 0;
    let latest = 0;
    let alive = true;

    // Fit the slices to the element. Attribute writes only: no React state, no re-encode.
    const place = (w: number, h: number) => {
      for (const fe of [top, mid, bottom]) fe.setAttribute("width", String(w));
      top.setAttribute("height", String(cap));
      mid.setAttribute("y", String(cap));
      mid.setAttribute("height", String(Math.max(0, h - 2 * cap)));
      bottom.setAttribute("y", String(Math.max(0, h - cap)));
      bottom.setAttribute("height", String(cap));
    };

    const build = async () => {
      const run = ++latest;
      const slices = buildLensSlices(el.offsetWidth, el.offsetHeight, radius, bezel);
      await Promise.all([slices.top, slices.mid, slices.bottom].map(decode));
      if (!alive || run !== latest) return;
      cap = slices.cap;
      top.setAttribute("href", slices.top);
      mid.setAttribute("href", slices.mid);
      bottom.setAttribute("href", slices.bottom);
      place(el.offsetWidth, el.offsetHeight);
      // Only now does the element trade its stylesheet blur for the lens (the same frost, plus the bevel).
      el.style.setProperty("backdrop-filter", `url(#${id}) saturate(${saturate}%)`);
    };

    // Height changes (presence rows springing in) only move the slices; a width change re-encodes,
    // debounced, while the current map is stretched to fit.
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (cap) place(w, h);
      const next = lensKey(w, h, radius, bezel);
      if (next === key) return;
      key = next;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void build(), cap ? 120 : 0);
    });
    ro.observe(el);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      ro.disconnect();
      el.style.removeProperty("backdrop-filter");
    };
  }, [tier, target, id, bezel, saturate]);

  if (tier === "off") return null;

  const displace = (gain: number, result: string) => (
    <feDisplacementMap
      in="SourceGraphic"
      in2="map"
      scale={Math.round(scale * gain * 100) / 100}
      xChannelSelector="R"
      yChannelSelector="G"
      result={result}
    />
  );

  return (
    <svg aria-hidden focusable="false" width="0" height="0" className="pointer-events-none absolute">
      {/* Units are CSS px from the element's border box; the feImage boxes are written by the effect. */}
      <filter
        id={id}
        x="0"
        y="0"
        width="100%"
        height="100%"
        primitiveUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        {/* Displacement map: neutral grey everywhere (a slice that hasn't loaded bends nothing), slices on top. */}
        <feFlood floodColor="rgb(128, 128, 128)" result="neutral" />
        <feImage ref={topRef} x="0" y="0" width="0" height="0" preserveAspectRatio="none" result="top" />
        <feImage ref={midRef} x="0" y="0" width="0" height="0" preserveAspectRatio="none" result="mid" />
        <feImage ref={bottomRef} x="0" y="0" width="0" height="0" preserveAspectRatio="none" result="bottom" />
        <feMerge result="map">
          <feMergeNode in="neutral" />
          <feMergeNode in="top" />
          <feMergeNode in="mid" />
          <feMergeNode in="bottom" />
        </feMerge>

        {/* Frosted face: the same blur the stylesheet gives every other engine. */}
        <feGaussianBlur in="SourceGraphic" stdDeviation={frost} edgeMode="duplicate" result="blurred" />
        <feColorMatrix in="blurred" type="matrix" values={OPAQUE} result="frost" />

        {/* Polished bevel: the backdrop squeezed inward into the rim. */}
        {tier === "full" ? (
          <>
            {displace(1, "dr")}
            {displace(1 + DISPERSION, "dg")}
            {displace(1 + 2 * DISPERSION, "db")}
            <feColorMatrix in="dr" type="matrix" values={CHANNEL.r} result="cr" />
            <feColorMatrix in="dg" type="matrix" values={CHANNEL.g} result="cg" />
            <feColorMatrix in="db" type="matrix" values={CHANNEL.b} result="cb" />
            <feBlend in="cr" in2="cg" mode="screen" result="crg" />
            <feBlend in="crg" in2="cb" mode="screen" result="bent" />
          </>
        ) : (
          displace(1, "bent")
        )}
        <feGaussianBlur in="bent" stdDeviation="0.5" result="polished" />
        <feColorMatrix in="polished" type="matrix" values={RIM_GAIN} result="lit" />

        {/* Rim over face, weighted by the map's blue channel. */}
        <feColorMatrix in="map" type="matrix" values={RIM_MASK} result="rimMask" />
        <feComposite in="lit" in2="rimMask" operator="in" result="rim" />
        <feComposite in="rim" in2="frost" operator="over" />
      </filter>
    </svg>
  );
}
