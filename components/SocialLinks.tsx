"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { siDiscord, siGithub, siInstagram, siRoblox, siSpotify, siTiktok, siYoutube } from "simple-icons";
import { GlassLens } from "./GlassLens";
import { aimGlassLight } from "./glassLight";
import type { SocialLink, SocialPlatform } from "@/profile.config";

const BRANDS: Record<Exclude<SocialPlatform, "website">, { title: string; path: string }> = {
  discord: siDiscord,
  github: siGithub,
  roblox: siRoblox,
  spotify: siSpotify,
  youtube: siYoutube,
  tiktok: siTiktok,
  instagram: siInstagram,
};

function labelFor(link: SocialLink) {
  if (link.label) return link.label;
  if (link.platform === "website") {
    try {
      return new URL(link.url).hostname.replace(/^www\./, "");
    } catch {
      return "Website";
    }
  }
  return BRANDS[link.platform].title;
}

const away = { opacity: 0, y: 10, scale: 0.96 };

/**
 * The links float under the card in a thinner capsule of the same glass. Each link is a ghost
 * control: clear at rest, a droplet of glass that swells and fills with light under the pointer
 * or finger, then settles on a spring.
 */
export function SocialLinks({ links, revealed }: { links: SocialLink[]; revealed: boolean }) {
  const dock = useRef<HTMLElement>(null);

  if (links.length === 0) return null;

  return (
    <>
      {/* frost / saturate must match .lg-capsule's backdrop-filter in globals.css. */}
      <GlassLens id="lg-lens-dock" target={dock} bezel={14} scale={12} frost={14} saturate={160} />
      <motion.nav
        ref={dock}
        aria-label="Social links"
        // Opacity animates on the glass itself: a fading wrapper would cut it off from the page behind.
        initial={away}
        animate={revealed ? { opacity: 1, y: 0, scale: 1 } : away}
        transition={{ type: "spring", stiffness: 260, damping: 24, delay: revealed ? 0.35 : 0 }}
        onPointerMove={aimGlassLight}
        onPointerDown={aimGlassLight}
        className="lg-capsule mt-4 max-w-full p-1.5"
      >
        <ul className="relative z-[2] flex flex-wrap items-center justify-center gap-0.5">
          {links.map((link) => {
            const label = labelFor(link);
            const brand = link.platform === "website" ? null : BRANDS[link.platform];
            return (
              <li key={link.url} className="group relative">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={label}
                  className="lg-control lg-ghost flex size-11 items-center justify-center rounded-full text-white/60 hover:text-white focus-visible:text-white"
                >
                  <span className="lg-lens grid place-items-center">
                    {brand ? (
                      <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-current">
                        <path d={brand.path} />
                      </svg>
                    ) : (
                      <Globe className="size-[18px]" strokeWidth={1.8} aria-hidden />
                    )}
                  </span>
                </a>
                <span
                  role="tooltip"
                  className="lg-tip pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 -translate-x-1/2 translate-y-1 rounded-[8px] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white/85 opacity-0 transition duration-150 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </motion.nav>
    </>
  );
}
