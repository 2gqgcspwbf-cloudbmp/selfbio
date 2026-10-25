"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { profile } from "@/profile.config";
import { useLanyard, type LanyardState } from "@/hooks/useLanyard";
import { useNow } from "@/hooks/useNow";
import { ActivityType, isMusicPresenceActivity, isSpotifyActivity, isValidDiscordId, type LanyardResult } from "@/lib/lanyard";
import { BackgroundLayer } from "./BackgroundLayer";
import { ProfileHeader } from "./ProfileHeader";
import { DiscordPresence } from "./DiscordPresence";
import { ActivityCard } from "./ActivityCard";
import { SpotifyPlayer } from "./SpotifyPlayer";
import { SocialLinks } from "./SocialLinks";
import { HelloIntro } from "./HelloIntro";
import { GlassLens } from "./GlassLens";
import { aimGlassLight } from "./glassLight";
import { container, item, presenceRow, softSpring } from "./motion";
import type { SocialLink } from "@/profile.config";

const card: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...softSpring, ...(container.show as { transition: object }).transition },
  },
};

export function Profile({ initial }: { initial: LanyardResult | null }) {
  const configured = isValidDiscordId(profile.discordId);
  const lanyard = useLanyard(configured ? profile.discordId : "", initial);
  const presence = lanyard.presence;
  const status: LanyardState["status"] = configured ? lanyard.status : "unavailable";

  const activities =
    presence?.activities.filter(
      (a) => a.type !== ActivityType.Custom && !isSpotifyActivity(a) && !isMusicPresenceActivity(a),
    ) ?? [];
  const spotify = presence?.spotify ?? null;
  const hasRows = activities.length > 0 || spotify !== null;
  const now = useNow(1000, hasRows);

  const links: SocialLink[] = [
    ...(configured && profile.showDiscordLink
      ? [{ platform: "discord" as const, url: `https://discord.com/users/${profile.discordId}`, label: "Discord" }]
      : []),
    ...profile.socials,
  ];

  // The welcome animation covers the page until the visitor continues; Lanyard keeps running underneath.
  const [intro, setIntro] = useState<"showing" | "leaving" | "done">("showing");
  const revealed = intro !== "showing";
  const onIntroLeave = useCallback(() => setIntro("leaving"), []);
  const onIntroDone = useCallback(() => setIntro("done"), []);

  // The card is the one thick slab of glass. In Chromium, GlassLens gives it a refracting bevel.
  const cardRef = useRef<HTMLElement>(null);

  return (
    <MotionConfig reducedMotion="user">
      <BackgroundLayer background={profile.background} />
      {/* frost / saturate must match .lg-slab's backdrop-filter in globals.css. */}
      <GlassLens id="lg-lens-card" target={cardRef} bezel={24} scale={22} frost={24} saturate={150} />

      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 sm:py-20">
        <motion.article
          ref={cardRef}
          initial="hidden"
          animate={revealed ? "show" : "hidden"}
          variants={card}
          onPointerMove={aimGlassLight}
          onPointerDown={aimGlassLight}
          // With no presence rows the space under the name matches the space above the avatar;
          // with rows the wells sit 16px from the edge, concentric with the slab. Padding eases (see .lg-slab).
          className={`lg-slab w-full max-w-[420px] ${hasRows ? "pb-4" : "pb-9 sm:pb-10"} ${profile.banner ? "pt-2" : ""}`}
        >
          <div className="relative z-[2]">
            <ProfileHeader
              presence={presence}
              loading={configured && status === "loading"}
              nameOverride={profile.displayName}
              nameStyle={profile.nameStyle}
              badges={profile.badges}
              tagline={profile.tagline}
              banner={profile.banner}
              showDecoration={profile.showAvatarDecoration}
              presenceStatus={status}
            >
              <DiscordPresence presence={presence} />
            </ProfileHeader>

            <motion.div
              variants={item}
              className={`px-4 transition-[padding] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${hasRows ? "pt-3" : ""}`}
            >
              <AnimatePresence initial={false}>
                {activities.map((activity) => (
                  <motion.div key={`${activity.id}:${activity.name}`} {...presenceRow} className="overflow-hidden">
                    <div className="pt-2">
                      <ActivityCard activity={activity} now={now} />
                    </div>
                  </motion.div>
                ))}
                {spotify && (
                  <motion.div key="spotify" {...presenceRow} className="overflow-hidden">
                    <div className="pt-2">
                      <SpotifyPlayer spotify={spotify} now={now} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.article>

        {/* Links float under the card in their own capsule: the only other glass that samples the page. */}
        <SocialLinks links={links} revealed={revealed} />
      </main>

      {intro !== "done" && <HelloIntro onLeave={onIntroLeave} onDone={onIntroDone} />}
    </MotionConfig>
  );
}
