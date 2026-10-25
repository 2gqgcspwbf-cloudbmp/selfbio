import type { Metadata } from "next";
import { Profile } from "@/components/Profile";
import { profile } from "@/profile.config";
import { avatarUrl, displayNameOf } from "@/lib/lanyard";
import { getInitialPresence } from "@/lib/serverPresence";
import { getSiteUrl } from "@/lib/site";

// Presence is live data — render per request so the first paint is current.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [initial, siteUrl] = await Promise.all([getInitialPresence(), getSiteUrl()]);
  const user = initial?.ok ? initial.presence.user : null;
  const name = profile.displayName ?? (user ? displayNameOf(user) : null) ?? "Profile";
  const description = profile.tagline ?? undefined;
  const avatar = user ? avatarUrl(user, 512, true) : undefined;

  const background = profile.background;
  const backgroundImage =
    background.type === "image" ? background.src : background.type === "video" ? background.poster : undefined;
  const image = avatar ?? (backgroundImage ? new URL(backgroundImage, siteUrl).toString() : undefined);

  return {
    metadataBase: new URL(siteUrl),
    title: name,
    description,
    openGraph: {
      type: "profile",
      title: name,
      description,
      url: siteUrl,
      siteName: name,
      images: image ? [image] : undefined,
    },
    twitter: { card: "summary", title: name, description, images: image ? [image] : undefined },
    icons: avatar ? { icon: avatar } : undefined,
  };
}

export default async function Page() {
  const initial = await getInitialPresence();
  return <Profile initial={initial} />;
}
