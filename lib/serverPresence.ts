import { cache } from "react";
import { profile } from "@/profile.config";
import { fetchPresence, isValidDiscordId, type LanyardResult } from "./lanyard";

/** Shared between the layout (link preview) and the page (first paint) within one request. */
export const getInitialPresence = cache(async (): Promise<LanyardResult | null> => {
  if (!isValidDiscordId(profile.discordId)) return null;
  try {
    // Don't let a slow Lanyard hold the page; the client will catch up over the socket.
    return await fetchPresence(profile.discordId, { cache: "no-store", signal: AbortSignal.timeout(2500) });
  } catch {
    return null;
  }
});
