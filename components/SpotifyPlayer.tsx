"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Music2 } from "lucide-react";
import { SafeImage } from "./SafeImage";
import { formatClock, type Spotify } from "@/lib/lanyard";

const fade = { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } as const;

export function SpotifyPlayer({ spotify, now }: { spotify: Spotify; now: number | null }) {
  const ts = spotify.timestamps;
  const trackKey = `${spotify.track_id ?? spotify.song}:${ts?.start ?? ""}`;
  const url = spotify.track_id ? `https://open.spotify.com/track/${encodeURIComponent(spotify.track_id)}` : null;

  return (
    <div className="lg-well rounded-2xl p-3">
      <div className="flex gap-3.5">
        <div className="relative size-[64px] shrink-0">
          <AnimatePresence initial={false}>
            <motion.div
              key={spotify.album_art_url ?? trackKey}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="absolute inset-0"
            >
              <SafeImage
                src={spotify.album_art_url}
                alt={spotify.album ? `${spotify.album} cover` : ""}
                className="size-full rounded-[10px] object-cover shadow-[0_0_0_1px_rgb(255_255_255/0.07),0_6px_16px_rgb(0_0_0/0.35)]"
                fallback={
                  <div className="flex size-full items-center justify-center rounded-[10px] bg-white/[0.05] text-white/35">
                    <Music2 className="size-6" strokeWidth={1.6} />
                  </div>
                }
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.09em] text-white/35 uppercase">
              <Equalizer />
              Listening on Spotify
            </p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open “${spotify.song}” in Spotify`}
                className="lg-control lg-ghost -m-[5px] grid size-6 place-items-center rounded-full text-white/35 hover:text-white/85"
              >
                <ArrowUpRight className="lg-lens size-3.5" strokeWidth={2.2} />
              </a>
            )}
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={trackKey}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={fade}
              className="min-w-0"
            >
              <p className="mt-0.5 truncate text-[14.5px] leading-tight font-semibold tracking-[-0.01em] text-white/95">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:decoration-white/30 hover:underline-offset-2">
                    {spotify.song}
                  </a>
                ) : (
                  spotify.song
                )}
              </p>
              {spotify.artist && <p className="mt-0.5 truncate text-[13px] text-white/60">{spotify.artist}</p>}
              {spotify.album && spotify.album !== spotify.song && (
                <p className="truncate text-[12.5px] text-white/38">{spotify.album}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {ts && <Progress key={`${ts.start}-${ts.end}`} start={ts.start} end={ts.end} now={now} />}
    </div>
  );
}

function Progress({ start, end, now }: { start: number; end: number; now: number | null }) {
  const duration = end - start;
  // The bar is a single CSS animation seeded once per track — perfectly smooth, no per-frame React work.
  const [offset, setOffset] = useState<number | null>(null);
  useEffect(() => setOffset(Math.min(duration, Math.max(0, Date.now() - start))), [start, duration]);

  const position = now === null ? null : Math.min(duration, Math.max(0, now - start));

  return (
    <div className="mt-3">
      <div
        className="h-[3px] overflow-hidden rounded-full bg-white/[0.09]"
        role="progressbar"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration / 1000)}
        aria-valuenow={position === null ? undefined : Math.round(position / 1000)}
      >
        {offset !== null && (
          <div
            className="progress-fill h-full rounded-full bg-white/80"
            style={{ animationDuration: `${duration}ms`, animationDelay: `${-offset}ms` }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-white/38 tabular-nums">
        <span>{position === null ? "–:––" : formatClock(position)}</span>
        <span>{formatClock(duration)}</span>
      </div>
    </div>
  );
}

function Equalizer() {
  return (
    <span aria-hidden className="flex h-[10px] items-end gap-[2px]">
      {[0, 0.25, 0.5].map((delay, i) => (
        <span
          key={i}
          className="eq-bar block h-full w-[2px] rounded-full bg-accent/90"
          style={{ animationDelay: `${-delay}s`, animationDuration: `${0.9 + i * 0.18}s` }}
        />
      ))}
    </span>
  );
}
