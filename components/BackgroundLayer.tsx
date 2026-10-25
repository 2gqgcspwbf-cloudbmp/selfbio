"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { BackgroundConfig } from "@/profile.config";

export function BackgroundLayer({ background }: { background: BackgroundConfig }) {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduceMotion) video.pause();
    else void video.play().catch(() => {});
  }, [reduceMotion]);

  const media = background.type !== "none" ? background : null;
  const blur = media?.blur ?? 0;
  const dim = Math.min(1, Math.max(0, media?.dim ?? 0.55));
  const mediaStyle = {
    filter: blur ? `blur(${blur}px)` : undefined,
    // Scale hides the soft, transparent edges that blur creates.
    transform: blur ? `scale(${1 + blur / 200})` : undefined,
  };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      {media?.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={mediaStyle} />
      )}

      {media?.type === "video" && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={mediaStyle}
          poster={media.poster}
          // Always autoplay in markup (keeps SSR and client identical); reduced motion pauses it in the effect above.
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
        >
          {media.mobileSrc && <source src={media.mobileSrc} type="video/mp4" media="(max-width: 768px)" />}
          <source src={media.src} type="video/mp4" />
        </video>
      )}

      {media ? (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgb(9 9 11 / ${dim * 0.85}) 0%, rgb(9 9 11 / ${dim}) 55%, rgb(9 9 11 / ${Math.min(1, dim + 0.2)}) 100%)`,
          }}
        />
      ) : (
        <>
          {/* A single soft overhead light — depth, not colour. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 45% at 50% -8%, rgb(160 180 255 / 0.07), transparent 70%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: "linear-gradient(180deg, transparent, rgb(0 0 0 / 0.35))" }}
          />
        </>
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgb(0 0 0 / 0.45))" }}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
}
