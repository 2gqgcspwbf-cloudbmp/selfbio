"use client";

import { motion } from "framer-motion";
import type { DiscordStatus } from "@/lib/lanyard";

export const STATUS_META: Record<DiscordStatus, { label: string; color: string }> = {
  online: { label: "Online", color: "#3fb37f" },
  idle: { label: "Idle", color: "#e5a83b" },
  dnd: { label: "Do Not Disturb", color: "#e5534b" },
  offline: { label: "Offline", color: "#6f727a" },
};

/* A 14px dot with a surface-coloured cut-out that morphs between Discord's shapes. */
const CUTOUT: Record<DiscordStatus, { width: number; height: number; left: number; top: number; borderRadius: number }> = {
  online: { width: 0, height: 0, left: 7, top: 7, borderRadius: 7 },
  idle: { width: 9, height: 9, left: -1.5, top: -1.5, borderRadius: 5 },
  dnd: { width: 8, height: 3, left: 3, top: 5.5, borderRadius: 2 },
  offline: { width: 6, height: 6, left: 4, top: 4, borderRadius: 3 },
};

const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

export function StatusDot({ status, size = 14 }: { status: DiscordStatus; size?: number }) {
  const scale = size / 14;
  return (
    <motion.span
      role="img"
      aria-label={STATUS_META[status].label}
      className="relative block overflow-hidden rounded-full"
      style={{ width: 14, height: 14, scale, transformOrigin: "center" }}
      initial={false}
      animate={{ backgroundColor: STATUS_META[status].color }}
      transition={{ duration: 0.35 }}
    >
      <motion.span
        className="absolute bg-[var(--surface)]"
        initial={false}
        animate={CUTOUT[status]}
        transition={spring}
      />
    </motion.span>
  );
}
