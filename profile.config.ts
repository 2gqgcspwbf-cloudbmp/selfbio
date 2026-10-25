/**
 * Everything personal about the site lives here.
 *
 * Discord data (avatar, name, presence, activities, Spotify) is pulled live
 * from Lanyard. Anything below that is left `null` simply isn't shown —
 * nothing is ever invented to fill a gap.
 */

export type SocialPlatform =
  | "discord"
  | "github"
  | "roblox"
  | "spotify"
  | "youtube"
  | "tiktok"
  | "instagram"
  | "website";

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  /** Accessible label / tooltip. Defaults to the platform name. */
  label?: string;
}

export type BackgroundConfig =
  | { type: "none" }
  | {
      type: "image" | "video";
      src: string;
      /** Video only: a lighter file for screens up to 768px wide. */
      mobileSrc?: string;
      /** Poster shown while a video loads, or instead of it for reduced motion. */
      poster?: string;
      /** Blur radius in px. 0–24 is a sensible range. */
      blur?: number;
      /** 0 (none) – 1 (black). Keeps text readable over busy imagery. */
      dim?: number;
    };

export type NameEffect = "solid" | "gradient" | "neon" | "toon" | "pop" | "glow";

export interface NameStyleConfig {
  /**
   * - "discord": colours + effect from your Discord Display Name Style (live)
   * - "custom":  the `colors` / `effect` below
   * - "plain":   no styling
   */
  source: "discord" | "custom" | "plain";
  /**
   * Any Google Fonts family, e.g. "Pixelify Sans". Discord's name fonts aren't
   * publicly available, so pick a look-alike. `null` keeps the site font.
   */
  font: string | null;
  /** Hex colours, used when source is "custom". Two or more make a gradient. */
  colors?: string[];
  effect?: NameEffect;
}

export interface Badge {
  /** Shown as the tooltip and used as the accessible label. */
  name: string;
  /** Image path (put files in /public) or URL. Square images work best. */
  icon: string;
}

export interface ProfileConfig {
  /** Read from NEXT_PUBLIC_DISCORD_ID — see .env.example. */
  discordId: string;
  /** Overrides your Discord display name. `null` follows Discord. */
  displayName: string | null;
  nameStyle: NameStyleConfig;
  /** Small icons shown beside your name. Lanyard doesn't expose Discord badges, so list them here. */
  badges: Badge[];
  /** A short line under your username. */
  tagline: string | null;
  /** Banner image URL (Lanyard doesn't expose Discord banners). `null` for none. */
  banner: string | null;
  background: BackgroundConfig;
  /** Show the Discord avatar decoration when you have one equipped. */
  showAvatarDecoration: boolean;
  /** Adds a Discord link built from your user ID. */
  showDiscordLink: boolean;
  socials: SocialLink[];
}

export const profile: ProfileConfig = {
  discordId: process.env.NEXT_PUBLIC_DISCORD_ID || "1451387900670382091",

  displayName: null,
  nameStyle: { source: "discord", font: null },
  // nameStyle: { source: "custom", font: "Pixelify Sans", colors: ["#ffffff", "#8fa8ff"], effect: "gradient" },
  tagline: null,

  badges: [
    { name: "Nitro Gold", icon: "/badges/nitro-gold.png" },
  ],

  banner: null,

  background: {
    type: "video",
    src: "/background/dolphins-1080.mp4",
    mobileSrc: "/background/dolphins-720.mp4",
    poster: "/background/dolphins-poster.jpg",
    blur: 0,
    dim: 0.42,
  },
  // background: { type: "none" },
  // background: { type: "image", src: "/background.jpg", blur: 12, dim: 0.55 },

  showAvatarDecoration: false,
  showDiscordLink: false,

  socials: [
    // { platform: "github", url: "https://github.com/your-handle" },
    // { platform: "roblox", url: "https://www.roblox.com/users/0000000/profile" },
    // { platform: "spotify", url: "https://open.spotify.com/user/your-id" },
    // { platform: "youtube", url: "https://youtube.com/@your-handle" },
    // { platform: "tiktok", url: "https://tiktok.com/@your-handle" },
    // { platform: "instagram", url: "https://instagram.com/your-handle" },
    // { platform: "website", url: "https://example.com", label: "Blog" },
  ],
};
