"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SafeImage } from "./SafeImage";
import { StatusDot } from "./StatusIndicator";
import { avatarUrl, decorationUrl, displayNameOf, type Presence } from "@/lib/lanyard";
import type { LanyardState } from "@/hooks/useLanyard";
import { item } from "./motion";
import { StyledName } from "./StyledName";
import type { Badge, NameStyleConfig } from "@/profile.config";

interface Props {
  presence: Presence | null;
  loading: boolean;
  nameOverride: string | null;
  nameStyle: NameStyleConfig;
  badges: Badge[];
  tagline: string | null;
  banner: string | null;
  showDecoration: boolean;
  presenceStatus: LanyardState["status"];
  children?: React.ReactNode;
}

export function ProfileHeader({
  presence,
  loading,
  nameOverride,
  nameStyle,
  badges,
  tagline,
  banner,
  showDecoration,
  presenceStatus,
  children,
}: Props) {
  const user = presence?.user;
  const name = nameOverride ?? (user ? displayNameOf(user) : null);
  const decoration = showDecoration && user ? decorationUrl(user) : null;
  const showUsername = user && user.username.toLowerCase() !== name?.toLowerCase().replace(/\s/g, "");

  return (
    <header className="flex flex-col items-center text-center">
      {banner && (
        <motion.div
          variants={item}
          className="relative h-[120px] w-[calc(100%-16px)] overflow-hidden rounded-[18px] sm:h-[136px]"
        >
          <SafeImage src={banner} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
          <div className="absolute inset-0 rounded-[18px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]" />
        </motion.div>
      )}

      {/* Avatar */}
      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 0.94 },
          show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 220, damping: 26 } },
        }}
        className={`relative ${banner ? "-mt-12" : "mt-9 sm:mt-10"}`}
      >
        <div
          className="relative size-[92px] overflow-hidden rounded-full bg-white/[0.04] sm:size-[100px]"
          style={{
            boxShadow: banner
              ? "0 0 0 4px var(--surface), 0 0 0 5px rgb(255 255 255 / 0.07), 0 8px 24px rgb(0 0 0 / 0.4)"
              : "0 0 0 1px rgb(255 255 255 / 0.1), 0 10px 30px rgb(0 0 0 / 0.45)",
          }}
        >
          {loading ? (
            <div className="skeleton h-full w-full" />
          ) : user ? (
            <SafeImage
              src={[avatarUrl(user, 256), avatarUrl({ ...user, avatar: null })]}
              alt={`${name}'s avatar`}
              className="h-full w-full object-cover"
              fallback={<Monogram name={name} />}
            />
          ) : (
            <Monogram name={name} />
          )}
        </div>

        {decoration && (
          <SafeImage
            src={decoration}
            className="pointer-events-none absolute -inset-[10%] h-[120%] w-[120%] max-w-none"
          />
        )}

        <AnimatePresence>
          {presence && presenceStatus === "ready" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-[3px] bottom-[3px] rounded-full bg-[var(--surface)] p-[4px] sm:right-[4px] sm:bottom-[4px]"
            >
              <StatusDot status={presence.status} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Name */}
      <motion.div variants={item} className="mt-5 w-full px-6">
        {name ? (
          <div className="flex items-center justify-center gap-2">
            <StyledName
              name={name}
              user={user}
              config={nameStyle}
              className="min-w-0 truncate font-display text-[26px] leading-[1.15] font-semibold tracking-[-0.022em] text-white sm:text-[28px]"
            />
            {badges.length > 0 && (
              <ul aria-label="Badges" className="flex shrink-0 items-center gap-1">
                {badges.map((badge) => (
                  <li key={badge.name} className="group relative">
                    <SafeImage
                      src={badge.icon}
                      alt={badge.name}
                      tabIndex={0}
                      className="size-[22px] rounded-[5px] object-contain transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:scale-105"
                    />
                    <span
                      role="tooltip"
                      className="lg-tip pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-1 rounded-[8px] px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white/85 opacity-0 transition duration-150 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
                    >
                      {badge.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="skeleton mx-auto h-7 w-40 rounded-md" />
        )}
      </motion.div>

      <motion.div variants={item} className="mt-1.5 flex min-h-5 w-full items-center justify-center px-6">
        {showUsername && user ? (
          <p className="truncate text-[14px] tracking-[-0.005em] text-white/45">@{user.username}</p>
        ) : loading ? (
          <div className="skeleton h-3.5 w-24 rounded" />
        ) : null}
      </motion.div>

      {children}

      {tagline && (
        <motion.p variants={item} className="mt-3 px-8 text-[13px] tracking-[0.01em] text-white/50">
          {tagline}
        </motion.p>
      )}
    </header>
  );
}

function Monogram({ name }: { name: string | null }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-[32px] font-medium text-white/40">
      {name?.trim().charAt(0).toUpperCase() ?? ""}
    </div>
  );
}
