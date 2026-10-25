"use client";

import type { CSSProperties } from "react";
import type { DiscordUser } from "@/lib/lanyard";
import type { NameEffect, NameStyleConfig } from "@/profile.config";

/**
 * Discord's effect IDs aren't officially documented; these come from community
 * reverse-engineering. Unknown (newer) IDs fall back to solid/gradient from the colour count.
 */
const DISCORD_EFFECTS: Record<number, NameEffect> = {
  1: "solid",
  2: "gradient",
  3: "neon",
  4: "toon",
  5: "pop",
  6: "glow",
};

function resolve(config: NameStyleConfig, user: DiscordUser | undefined) {
  if (config.source === "custom" && config.colors?.length) {
    return { colors: config.colors, effect: config.effect ?? (config.colors.length > 1 ? "gradient" : "solid") };
  }
  const style = config.source === "discord" ? user?.name_style : null;
  if (!style) return null;
  const known = style.effect_id !== null ? DISCORD_EFFECTS[style.effect_id] : undefined;
  return { colors: style.colors, effect: known ?? (style.colors.length > 1 ? "gradient" : "solid") };
}

export function StyledName({
  name,
  user,
  config,
  className,
}: {
  name: string;
  user: DiscordUser | undefined;
  config: NameStyleConfig;
  className: string;
}) {
  const resolved = resolve(config, user);
  const style: CSSProperties = config.font ? { fontFamily: `"${config.font}", var(--font-display)` } : {};
  let effectClass = "";

  if (resolved) {
    const [c1, c2 = c1] = resolved.colors;
    if (resolved.colors.length > 1) {
      // Loop the stops so the sweep animation wraps seamlessly.
      const stops = [...resolved.colors, resolved.colors[0]].join(", ");
      style.backgroundImage = `linear-gradient(90deg, ${stops})`;
      effectClass = "name-gradient";
    } else {
      style.color = c1;
    }

    switch (resolved.effect) {
      case "neon":
        style.filter = `drop-shadow(0 0 4px ${c1}aa) drop-shadow(0 0 14px ${c1}66)`;
        break;
      case "glow":
        style.filter = `drop-shadow(0 0 10px ${c1}66)`;
        break;
      case "toon":
        style.filter = `drop-shadow(0 2px 0 rgb(0 0 0 / 0.7)) drop-shadow(0 0 1px rgb(0 0 0 / 0.9))`;
        break;
      case "pop":
        style.filter = `drop-shadow(2px 2px 0 ${c2}88)`;
        break;
    }
  }

  return (
    <h1 className={`${className} ${effectClass}`} style={style}>
      {name}
    </h1>
  );
}
