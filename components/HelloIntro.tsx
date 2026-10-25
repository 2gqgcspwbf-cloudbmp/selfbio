"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import greetingsData from "@/data/greetings.json";
import { HandwritingAnimation, type HandwritingArtwork, type HandwritingHandle } from "./HandwritingAnimation";

/**
 * Full-screen welcome: greetings in many languages, each written by hand on black,
 * held, dissolved, and followed by the next — until the visitor continues.
 * Artwork comes from public/handwriting/<id>.json (built from lettering/).
 */

const GREETINGS = greetingsData.greetings;
const START_DELAY = 500; // a moment of pure black before the first stroke
const HOLD = 800;
const DISSOLVE = 650;
const BLACK_GAP = 260;

const cache = new Map<string, Promise<HandwritingArtwork>>();
function load(id: string) {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/handwriting/${id}.json`).then((r) => {
      if (!r.ok) throw new Error(`handwriting ${id}: ${r.status}`);
      return r.json() as Promise<HandwritingArtwork>;
    });
    p.catch(() => cache.delete(id)); // retry on the next lap
    cache.set(id, p);
  }
  return p;
}

/**
 * Layout shared by every greeting: one pen scale (px per lettering unit) and one
 * baseline, so languages are written at the same size on the same line. A word only
 * shrinks when it would otherwise be wider than the screen (long words on phones).
 */
function layoutFor(art: HandwritingArtwork, vw: number, vh: number) {
  const [, y, w, h] = art.viewBox; // screen space: baseline at y = 0, ink above is negative
  const base = Math.min(1.25, vw / 620, vh / 700);
  const unit = Math.min(base, (vw * 0.9) / w, (vh * 0.86) / h);
  // One baseline for every greeting, a little below centre so a typical ~250-unit-tall
  // word is optically centred. Taken from the shared scale, so words that shrink to fit
  // still sit on the same line.
  const baseline = vh * 0.5 + 125 * base;
  let top = baseline + y * unit;
  top = Math.max(vh * 0.06, Math.min(top, vh * 0.94 - h * unit));
  const left = (vw - w * unit) / 2;
  return { unit, left, top };
}

export function HelloIntro({ onLeave, onDone }: { onLeave: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState<{ art: HandwritingArtwork; lap: number } | null>(null);
  const [dissolving, setDissolving] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const writerRef = useRef<HandwritingHandle>(null);
  const writtenRef = useRef<(() => void) | null>(null);
  const leavingRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onWritten = useCallback(() => {
    writtenRef.current?.();
    writtenRef.current = null;
  }, []);

  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    writerRef.current?.hurry(4); // finish the word in a quick flourish rather than cutting it off
    setLeaving(true);
    onLeave();
  }, [onLeave]);

  // Viewport + motion preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setReduceMotion(mq.matches);
    };
    sync();
    window.addEventListener("resize", sync);
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  // The sequence.
  useEffect(() => {
    let cancelled = false;
    const timers = new Set<number>();
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      await sleep(START_DELAY);
      let i = 0;
      let lap = 0;
      let failures = 0;
      while (!cancelled) {
        const entry = GREETINGS[i % GREETINGS.length];
        void load(GREETINGS[(i + 1) % GREETINGS.length].id).catch(() => {}); // preload the next greeting
        let art: HandwritingArtwork;
        try {
          art = await load(entry.id);
          failures = 0;
        } catch {
          i++;
          if (++failures >= GREETINGS.length) await sleep(3000);
          continue;
        }
        if (cancelled) return;

        const written = new Promise<void>((resolve) => (writtenRef.current = resolve));
        setDissolving(false);
        setCurrent({ art, lap });
        await written;
        if (cancelled) return;
        setShowHint(true);

        await sleep(reduce ? 2200 : HOLD);
        if (cancelled) return;
        setDissolving(true);
        await sleep(DISSOLVE);
        if (cancelled) return;
        setCurrent(null);
        await sleep(BLACK_GAP);

        i++;
        if (i % GREETINGS.length === 0) lap++;
      }
    })();

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      writtenRef.current = null;
    };
  }, []);

  // Keyboard: Enter, Space or Escape continues.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        leave();
      }
    };
    window.addEventListener("keydown", onKey);
    buttonRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  // Keep the page underneath from scrolling while the intro is up.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  const layout = current && viewport ? layoutFor(current.art, viewport.w, viewport.h) : null;

  return (
    <motion.div
      id="hello-intro"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black select-none"
      style={{ WebkitTapHighlightColor: "transparent" }}
      onClick={leave}
      initial={false}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.9, delay: leaving ? 0.25 : 0, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => leavingRef.current && onDone()}
    >
      <div
        className="absolute"
        style={{
          left: layout?.left ?? 0,
          top: layout?.top ?? 0,
          opacity: dissolving || leaving ? 0 : 1,
          transition: dissolving || leaving ? `opacity ${leaving ? 500 : DISSOLVE}ms cubic-bezier(0.4, 0, 0.2, 1)` : "none",
        }}
      >
        {current && layout && (
          <HandwritingAnimation
            key={`${current.art.id}:${current.lap}`}
            ref={writerRef}
            artwork={current.art}
            unit={layout.unit}
            animate={!reduceMotion}
            seed={current.lap}
            onWritten={onWritten}
          />
        )}
      </div>

      <motion.button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          leave();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: showHint && !leaving ? 1 : 0 }}
        transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute bottom-[max(2.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] tracking-[0.02em] whitespace-nowrap text-white/40 transition-colors outline-none hover:text-white/70 focus-visible:text-white/80 focus-visible:ring-1 focus-visible:ring-white/30"
      >
        Click anywhere to continue
      </motion.button>
    </motion.div>
  );
}
