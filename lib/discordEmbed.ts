/**
 * Discord component embeds: https://docs.discord.com/developers/link-previews/component-embeds
 * The payload must be in the server-rendered <head> and stay under 3,000 bytes.
 */

type TextDisplay = { type: 10; content: string };
type Thumbnail = { type: 11; media: { url: string } };
type Section = { type: 9; components: TextDisplay[]; accessory?: Thumbnail };
type Button = { type: 2; style: 5; url: string; label: string };
type ActionRow = { type: 1; components: Button[] };
type MediaGallery = { type: 12; items: { media: { url: string }; description?: string }[] };
type Container = {
  type: 17;
  accent_color?: number;
  components: (TextDisplay | Section | ActionRow | MediaGallery)[];
};

export interface ComponentEmbed {
  component: Container;
}

export interface EmbedLink {
  label: string;
  url: string;
}

const MAX_BYTES = 3000;

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

const plain = (value: string) => clip(value.replace(/\s+/g, " ").trim(), 200);

/** Keeps user-controlled text from breaking Discord's markdown. */
const markdown = (value: string) => plain(value).replace(/([\\*_~`>#|])/g, "\\$1");
const linkText = (value: string) => plain(value).replace(/([\\[\]])/g, "\\$1");

export function hexToInt(hex: string | undefined) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? "");
  return match ? Number.parseInt(match[1], 16) : undefined;
}

export function buildDiscordEmbed({
  name,
  tagline,
  avatar,
  image,
  url,
  accentColor,
  links,
}: {
  name: string;
  tagline: string | null;
  avatar: string | null;
  image: string | null;
  url: string;
  accentColor?: number;
  links: EmbedLink[];
}): ComponentEmbed {
  const title = `# **[${linkText(name)}](${url})**`;
  const section: Section = {
    type: 9,
    components: [{ type: 10, content: tagline ? `${title}\n${markdown(tagline)}` : title }],
  };
  if (avatar) section.accessory = { type: 11, media: { url: avatar } };

  const components: Container["components"] = [section];

  if (image) {
    components.push({
      type: 12,
      items: [{ media: { url: image }, description: `${name}'s profile background` }],
    });
  }

  const buttons: Button[] = [{ type: 2, style: 5, url, label: "Open profile" }];
  for (const link of links) {
    if (buttons.length >= 5) break;
    buttons.push({ type: 2, style: 5, url: link.url, label: clip(link.label, 80) });
  }
  components.push({ type: 1, components: buttons });

  const container: Container = { type: 17, components };
  if (accentColor !== undefined) container.accent_color = accentColor;

  return { component: container };
}

/** JSON with `<` escaped so a Discord name can never close the surrounding script tag. */
export function serializeDiscordEmbed(embed: ComponentEmbed) {
  const json = JSON.stringify(embed).replace(/</g, "\\u003c");
  if (new TextEncoder().encode(json).length <= MAX_BYTES) return json;

  // Last resort: title only, which always fits.
  const minimal: ComponentEmbed = {
    component: { type: 17, components: [{ type: 10, content: "# Profile" }] },
  };
  return JSON.stringify(minimal).replace(/</g, "\\u003c");
}
