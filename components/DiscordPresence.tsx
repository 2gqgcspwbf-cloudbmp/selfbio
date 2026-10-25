"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SafeImage } from "./SafeImage";
import { ActivityType, emojiUrl, type Presence } from "@/lib/lanyard";

/** Your Discord custom status (emoji + text), sitting under the name. */
export function DiscordPresence({ presence }: { presence: Presence | null }) {
  const custom = presence?.activities.find((a) => a.type === ActivityType.Custom);
  const customText = custom?.state;
  const customEmoji = custom?.emoji;

  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {(customText || customEmoji) && (
          <motion.p
            key={`${customEmoji?.id ?? customEmoji?.name ?? ""}:${customText ?? ""}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="mx-auto mt-3 flex max-w-[calc(100%-48px)] items-center justify-center gap-1.5 text-[13.5px] leading-snug text-white/70"
          >
            {customEmoji &&
              (customEmoji.id ? (
                <SafeImage
                  src={emojiUrl(customEmoji)}
                  alt={`:${customEmoji.name}:`}
                  className="size-[18px] shrink-0 object-contain"
                  fallback={null}
                />
              ) : (
                <span aria-hidden className="shrink-0 text-[15px] leading-none">
                  {customEmoji.name}
                </span>
              ))}
            {customText && <span className="line-clamp-2 break-words">{customText}</span>}
          </motion.p>
        )}
      </AnimatePresence>

    </>
  );
}
