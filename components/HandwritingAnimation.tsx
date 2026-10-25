"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";

/**
 * Writes one piece of hand-authored lettering, stroke by stroke.
 *
 * Every stroke is a centre-line path revealed along its own length
 * (stroke-dashoffset via the Web Animations API). Within a stroke the pen eases
 * in, slows through tight curves and runs faster along sweeping lines; between
 * strokes it pauses for a pen lift scaled to how far it has to travel.
 */

export interface HandwritingStroke {
  d: string;
  /** Approximate length in lettering units (the DOM measures the exact value). */
  length: number;
  /** Extra pause before this stroke, in ms (overrides the travel-based pen lift). */
  pause?: number;
  /** Relative pen speed for this stroke (1 = normal). */
  speed?: number;
  kind?: "dot";
}

export interface HandwritingArtwork {
  id: string;
  text: string;
  language: string;
  lang: string;
  dir: "ltr" | "rtl";
  script?: string;
  viewBox: [number, number, number, number];
  strokeWidth: number;
  strokes: HandwritingStroke[];
  timing?: { write?: number };
}

export interface HandwritingHandle {
  /** Speeds up whatever is still being written (used when the visitor continues). */
  hurry(rate?: number): void;
}

interface Props {
  artwork: HandwritingArtwork;
  /** CSS pixels per lettering unit, shared by every greeting so they're written at one size. */
  unit: number;
  /** false: render fully written with no animation (reduced motion). */
  animate: boolean;
  /** Varies the natural timing jitter between repeats. */
  seed?: number;
  onWritten?: () => void;
  className?: string;
}

/* ---------------------------------------------------------------- */
/* Timing                                                            */
/* ---------------------------------------------------------------- */

function random(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/**
 * Dash-offset keyframes for one stroke. Time per sample grows with the turn at
 * that point (the pen slows through curves) and near the ends (it eases in/out).
 */
function penKeyframes(path: SVGPathElement, length: number, hidden: number, strokeWidth: number): Keyframe[] {
  const samples = Math.max(8, Math.min(320, Math.round(length / 6)));
  const pts: DOMPoint[] = [];
  for (let i = 0; i <= samples; i++) pts.push(path.getPointAtLength((length * i) / samples));

  const turns: number[] = [];
  let prev: number | null = null;
  for (let i = 1; i < pts.length; i++) {
    const a = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    let turn = 0;
    if (prev !== null) {
      turn = Math.abs(a - prev);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
    }
    prev = a;
    turns.push(turn);
  }

  // Retraces: where the pen runs back over ink it has already laid in this stroke
  // (cursive stems, joins climbing a bowl), no new ink appears, so a constant pace
  // would read as a stall. A real hand glides through these quickly.
  const step = length / samples;
  const skip = Math.ceil((strokeWidth * 2.5) / step);
  const near = strokeWidth * 0.45;
  const segDist = (p: DOMPoint, a: DOMPoint, b: DOMPoint) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const retrace = turns.map((_, i) => {
    const mid = pts[i + 1];
    for (let j = 0; j + 1 <= i + 1 - skip; j++) if (segDist(mid, pts[j], pts[j + 1]) < near) return true;
    return false;
  });

  // Smooth the curvature so speed changes are gradual, never jerky.
  const weights = turns.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -2; k <= 2; k++) {
      const t = turns[i + k];
      if (t !== undefined) {
        sum += t;
        n++;
      }
    }
    const curvature = sum / n / (Math.PI / 5);
    const t = (i + 0.5) / turns.length;
    const ease = 1 + smoothstep((0.14 - t) / 0.14) * 1.6 + smoothstep((t - 0.86) / 0.14) * 1.1;
    return (1 + smoothstep(curvature) * 1.5) * ease * (retrace[i] ? 0.22 : 1);
  });
  const total = weights.reduce((a, b) => a + b, 0);

  const frames: Keyframe[] = [{ strokeDashoffset: hidden, offset: 0 }, { strokeDashoffset: length, offset: 0 }];
  let acc = 0;
  weights.forEach((w, i) => {
    acc += w;
    frames.push({ strokeDashoffset: length * (1 - (i + 1) / weights.length), offset: Math.min(1, acc / total) });
  });
  frames[frames.length - 1].offset = 1;
  return frames;
}

/* ---------------------------------------------------------------- */

export const HandwritingAnimation = forwardRef<HandwritingHandle, Props>(function HandwritingAnimation(
  { artwork, unit, animate, seed = 0, onWritten, className },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const onWrittenRef = useRef(onWritten);
  onWrittenRef.current = onWritten;

  useImperativeHandle(ref, () => ({
    hurry(rate = 4) {
      for (const a of animationsRef.current) if (a.playState !== "finished") a.playbackRate = Math.max(a.playbackRate, rate);
    },
  }));

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onWrittenRef.current?.();
    };

    if (!animate) {
      for (const p of paths) {
        p.style.strokeDasharray = "";
        p.style.strokeDashoffset = "";
        p.style.visibility = "visible";
      }
      finish();
      return;
    }

    const rand = random(`${artwork.id}:${seed}`);
    const sw = artwork.strokeWidth;
    const lengths = paths.map((p) => Math.max(0.01, p.getTotalLength()));
    const ends = paths.map((p, i) => [p.getPointAtLength(0), p.getPointAtLength(lengths[i])] as const);

    // Pen lifts: a breath before each new stroke, longer when the pen travels further.
    const gaps = artwork.strokes.map((s, i) => {
      if (i === 0) return 0;
      if (s.pause !== undefined) return s.pause;
      const from = ends[i - 1][1];
      const to = ends[i][0];
      const travel = Math.hypot(to.x - from.x, to.y - from.y);
      return (70 + Math.min(230, travel * 0.75)) * (0.85 + rand() * 0.3);
    });

    // Stroke time grows a little slower than length, so short marks aren't flicked
    // past and long sweeps flow; dots are a quick touch of the pen.
    const raw = artwork.strokes.map((s, i) => {
      const base = s.kind === "dot" || lengths[i] < sw * 1.5 ? 0 : Math.pow(lengths[i], 0.86);
      return (base / (s.speed ?? 1)) * (0.92 + rand() * 0.16);
    });
    const ink = lengths.reduce((a, b) => a + b, 0);
    const target = artwork.timing?.write ?? Math.min(3300, Math.max(1600, 900 + ink * 0.55));
    const gapTotal = gaps.reduce((a, b) => a + b, 0);
    const rawTotal = raw.reduce((a, b) => a + b, 0) || 1;
    const k = Math.max(0.15, (target - gapTotal) / rawTotal);

    let delay = 0;
    const animations: Animation[] = [];
    paths.forEach((p, i) => {
      const length = lengths[i];
      delay += gaps[i];
      const duration = raw[i] === 0 ? 130 : Math.max(110, raw[i] * k);
      const hidden = length + sw;
      p.style.strokeDasharray = `${length} ${length + sw * 2}`;
      p.style.strokeDashoffset = `${hidden}`;
      p.style.visibility = "visible";
      const keyframes =
        raw[i] === 0
          ? [{ strokeDashoffset: hidden }, { strokeDashoffset: length, offset: 0.01 }, { strokeDashoffset: 0 }]
          : penKeyframes(p, length, hidden, sw);
      animations.push(p.animate(keyframes, { duration, delay, fill: "both", easing: "linear" }));
      delay += duration;
    });
    animationsRef.current = animations;

    let cancelled = false;
    Promise.all(animations.map((a) => a.finished))
      .then(() => !cancelled && finish())
      .catch(() => {});

    return () => {
      cancelled = true;
      for (const a of animations) a.cancel();
      animationsRef.current = [];
    };
  }, [artwork, animate, seed]);

  const [x, y, w, h] = artwork.viewBox;
  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={`${artwork.text} — ${artwork.language}`}
      lang={artwork.lang}
      viewBox={`${x} ${y} ${w} ${h}`}
      width={w * unit}
      height={h * unit}
      fill="none"
      stroke="#fff"
      strokeWidth={artwork.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      {artwork.strokes.map((s, i) => (
        // Hidden until the layout effect starts writing, so nothing flashes on mount.
        <path key={i} d={s.d} style={animate ? { visibility: "hidden" } : undefined} />
      ))}
    </svg>
  );
});
