export const LANYARD_REST = "https://api.lanyard.rest/v1/users/";
export const LANYARD_WS = "wss://api.lanyard.rest/socket";

export type DiscordStatus = "online" | "idle" | "dnd" | "offline";

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  display_name: string | null;
  avatar: string | null;
  avatar_decoration_data: { asset: string } | null;
  /** Discord "Display Name Styles" (Nitro). Colours are hex strings. */
  name_style: { colors: string[]; effect_id: number | null; font_id: number | null } | null;
}

export interface Activity {
  id: string;
  name: string;
  type: number;
  state?: string;
  details?: string;
  application_id?: string;
  timestamps?: { start?: number; end?: number };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  emoji?: { name: string; id?: string; animated?: boolean };
}

export interface Spotify {
  track_id: string | null;
  song: string;
  artist: string;
  album: string | null;
  album_art_url: string | null;
  timestamps: { start: number; end: number } | null;
}

export interface Presence {
  user: DiscordUser;
  status: DiscordStatus;
  platforms: { desktop: boolean; mobile: boolean; web: boolean };
  activities: Activity[];
  spotify: Spotify | null;
}

export type LanyardResult =
  | { ok: true; presence: Presence }
  | { ok: false; reason: "not_monitored" | "error"; message?: string };

export const ActivityType = {
  Playing: 0,
  Streaming: 1,
  Listening: 2,
  Watching: 3,
  Custom: 4,
  Competing: 5,
} as const;

/* ------------------------------------------------------------------ */
/* Normalisation — the API is treated as untrusted, partial input.     */
/* ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null;
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const STATUSES: DiscordStatus[] = ["online", "idle", "dnd", "offline"];

function normaliseActivity(raw: unknown): Activity | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name);
  const type = num(raw.type);
  if (!name || type === undefined) return null;

  const ts = isObj(raw.timestamps) ? raw.timestamps : undefined;
  const assets = isObj(raw.assets) ? raw.assets : undefined;
  const emoji = isObj(raw.emoji) && str(raw.emoji.name) ? raw.emoji : undefined;

  return {
    id: str(raw.id) ?? `${type}:${name}`,
    name,
    type,
    state: str(raw.state),
    details: str(raw.details),
    application_id: str(raw.application_id),
    timestamps: ts ? { start: num(ts.start), end: num(ts.end) } : undefined,
    assets: assets
      ? {
          large_image: str(assets.large_image),
          large_text: str(assets.large_text),
          small_image: str(assets.small_image),
          small_text: str(assets.small_text),
        }
      : undefined,
    emoji: emoji
      ? { name: emoji.name as string, id: str(emoji.id), animated: emoji.animated === true }
      : undefined,
  };
}

function normaliseSpotify(raw: unknown, listening: boolean): Spotify | null {
  if (!listening || !isObj(raw)) return null;
  const song = str(raw.song);
  if (!song) return null;
  const ts = isObj(raw.timestamps) ? raw.timestamps : undefined;
  const start = num(ts?.start);
  const end = num(ts?.end);
  return {
    track_id: str(raw.track_id) ?? null,
    song,
    // Lanyard separates multiple artists with "; "
    artist: (str(raw.artist) ?? "").split(/;\s*/).filter(Boolean).join(", "),
    album: str(raw.album) ?? null,
    album_art_url: str(raw.album_art_url) ?? null,
    timestamps: start !== undefined && end !== undefined && end > start ? { start, end } : null,
  };
}

export function normalisePresence(raw: unknown): Presence | null {
  if (!isObj(raw) || !isObj(raw.discord_user)) return null;
  const u = raw.discord_user;
  const id = str(u.id);
  const username = str(u.username);
  if (!id || !username) return null;

  const status = STATUSES.includes(raw.discord_status as DiscordStatus)
    ? (raw.discord_status as DiscordStatus)
    : "offline";

  const decoration = isObj(u.avatar_decoration_data) ? str(u.avatar_decoration_data.asset) : undefined;

  const styles = isObj(u.display_name_styles) ? u.display_name_styles : undefined;
  // Colours arrive as base-10 RGB integers.
  const nameColors = Array.isArray(styles?.colors)
    ? styles.colors
        .filter((c): c is number => typeof c === "number" && c >= 0 && c <= 0xffffff)
        .map((c) => `#${c.toString(16).padStart(6, "0")}`)
    : [];

  return {
    user: {
      id,
      username,
      global_name: str(u.global_name) ?? null,
      display_name: str(u.display_name) ?? null,
      avatar: str(u.avatar) ?? null,
      avatar_decoration_data: decoration ? { asset: decoration } : null,
      name_style:
        styles && nameColors.length > 0
          ? { colors: nameColors, effect_id: num(styles.effect_id) ?? null, font_id: num(styles.font_id) ?? null }
          : null,
    },
    status,
    platforms: {
      desktop: raw.active_on_discord_desktop === true,
      mobile: raw.active_on_discord_mobile === true,
      web: raw.active_on_discord_web === true,
    },
    activities: Array.isArray(raw.activities)
      ? raw.activities.map(normaliseActivity).filter((a): a is Activity => a !== null)
      : [],
    spotify: normaliseSpotify(raw.spotify, raw.listening_to_spotify === true),
  };
}

/* ------------------------------------------------------------------ */
/* REST                                                                */
/* ------------------------------------------------------------------ */

export async function fetchPresence(userId: string, init?: RequestInit): Promise<LanyardResult> {
  try {
    const res = await fetch(LANYARD_REST + encodeURIComponent(userId), {
      ...init,
      headers: { accept: "application/json", ...init?.headers },
    });
    const body: unknown = await res.json().catch(() => null);

    if (isObj(body) && body.success === true) {
      const presence = normalisePresence(body.data);
      if (presence) return { ok: true, presence };
      return { ok: false, reason: "error", message: "Malformed presence data" };
    }

    const err = isObj(body) && isObj(body.error) ? body.error : undefined;
    if (err?.code === "user_not_monitored" || res.status === 404) {
      return { ok: false, reason: "not_monitored", message: str(err?.message) };
    }
    return { ok: false, reason: "error", message: str(err?.message) ?? `HTTP ${res.status}` };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Network error" };
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const isValidDiscordId = (id: string) => /^\d{17,20}$/.test(id);

export function displayNameOf(user: DiscordUser) {
  return user.global_name ?? user.display_name ?? user.username;
}

export function avatarUrl(user: DiscordUser, size = 256, staticOnly = false) {
  if (!user.avatar) {
    // New-username accounts: default avatar index is (id >> 22) % 6
    const index = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = staticOnly ? "png" : user.avatar.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
}

export function decorationUrl(user: DiscordUser) {
  const asset = user.avatar_decoration_data?.asset;
  return asset
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=240&passthrough=true`
    : null;
}

export function emojiUrl(emoji: NonNullable<Activity["emoji"]>) {
  return emoji.id
    ? `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "webp"}?size=48`
    : null;
}

/** Resolves a Discord rich-presence asset key to an image URL. */
export function assetUrl(asset: string | undefined, applicationId?: string): string | null {
  if (!asset) return null;
  if (asset.startsWith("mp:external/"))
    return `https://media.discordapp.net/external/${asset.slice("mp:external/".length)}`;
  if (asset.startsWith("mp:")) return `https://media.discordapp.net/${asset.slice(3)}`;
  if (asset.startsWith("spotify:")) return `https://i.scdn.co/image/${asset.slice(8)}`;
  if (asset.startsWith("youtube:")) return `https://i.ytimg.com/vi/${asset.slice(8)}/hqdefault.jpg`;
  if (asset.startsWith("twitch:"))
    return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${asset.slice(7)}-160x160.jpg`;
  if (!applicationId) return null;
  return `https://cdn.discordapp.com/app-assets/${applicationId}/${asset}.png?size=160`;
}

/** Discord doesn't expose app icon hashes through presence; dstn's public CDN resolves them. */
export function appIconUrl(applicationId: string | undefined) {
  return applicationId ? `https://dcdn.dstn.to/app-icons/${applicationId}?size=160` : null;
}

export const isSpotifyActivity = (a: Activity) =>
  a.id === "spotify:1" || (a.type === ActivityType.Listening && a.name === "Spotify");

/** Music Presence mirrors another player's activity, so hide it to avoid a duplicate row. */
export const isMusicPresenceActivity = (a: Activity) => a.application_id === "1302023626018787379";

export function activityVerb(type: number) {
  switch (type) {
    case ActivityType.Streaming:
      return "Streaming";
    case ActivityType.Listening:
      return "Listening to";
    case ActivityType.Watching:
      return "Watching";
    case ActivityType.Competing:
      return "Competing in";
    default:
      return "Playing";
  }
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatDuration(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} hour${h === 1 ? "" : "s"}${m ? ` ${m} min` : ""}`;
}
