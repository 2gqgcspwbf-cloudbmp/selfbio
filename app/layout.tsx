import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { profile } from "@/profile.config";
import greetingsData from "@/data/greetings.json";
import { avatarUrl, displayNameOf } from "@/lib/lanyard";
import { buildDiscordEmbed, hexToInt, serializeDiscordEmbed } from "@/lib/discordEmbed";
import { getInitialPresence } from "@/lib/serverPresence";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

// Used only where SF Pro isn't available (Windows, Android, Linux).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Profile",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Optional display-name font from profile.config.ts (any Google Fonts family).
const nameFont = profile.nameStyle.source === "plain" ? null : profile.nameStyle.font;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initial = await getInitialPresence();
  const user = initial?.ok ? initial.presence.user : null;
  const name = profile.displayName ?? (user ? displayNameOf(user) : null) ?? "Profile";
  const siteUrl = await getSiteUrl();

  const accentColors =
    profile.nameStyle.source === "custom"
      ? profile.nameStyle.colors
      : profile.nameStyle.source === "discord"
        ? user?.name_style?.colors
        : undefined;

  const background = profile.background;
  const imagePath = background.type === "image" ? background.src : background.type === "video" ? background.poster : null;
  const accentColor = hexToInt(accentColors?.find((color) => !/^#0{6}$/i.test(color))) ?? 0x7c9cff;
  const embedJson = serializeDiscordEmbed(
    buildDiscordEmbed({
      name,
      tagline: profile.tagline,
      avatar: user ? avatarUrl(user, 512, true) : null,
      image: imagePath ? new URL(imagePath, siteUrl).toString() : null,
      url: siteUrl,
      accentColor,
      links: profile.socials.map((link) => ({
        label: link.label ?? link.platform.charAt(0).toUpperCase() + link.platform.slice(1),
        url: link.url,
      })),
    }),
  );

  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* The first greeting is written as soon as the page loads. */}
        <link rel="preload" href={`/handwriting/${greetingsData.greetings[0].id}.json`} as="fetch" crossOrigin="anonymous" />
        {/* Without JavaScript the intro can't be dismissed, so don't show it. */}
        <noscript>
          <style>{`#hello-intro{display:none!important}`}</style>
        </noscript>
        {/* Discord component embed (https://docs.discord.com/developers/link-previews/component-embeds). */}
        <script
          id="discord:component-embed"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: embedJson }}
        />
        {nameFont && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link
              rel="stylesheet"
              href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(nameFont)}&display=swap`}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
