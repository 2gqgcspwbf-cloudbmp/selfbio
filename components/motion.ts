import type { Transition, Variants } from "framer-motion";

export const softSpring: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };

export const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.12 } },
};

export const item: Variants = {
  hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: softSpring,
    // Drop the filter once settled. A lingering blur(0px) keeps every row a filter layer (and a
    // backdrop root) for the life of the page, re-composited on every video frame under the glass.
    transitionEnd: { filter: "none" },
  },
};

/** Presence rows entering and leaving: fade, slight lift and height collapse. */
export const presenceRow = {
  initial: { opacity: 0, height: 0, y: 6 },
  animate: { opacity: 1, height: "auto", y: 0 },
  exit: { opacity: 0, height: 0, y: -4 },
  transition: { ...softSpring, opacity: { duration: 0.25 } },
} as const;
