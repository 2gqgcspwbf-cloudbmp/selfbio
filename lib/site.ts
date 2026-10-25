import { cache } from "react";
import { headers } from "next/headers";

/** Absolute origin of the current request, used for link-preview URLs. */
export const getSiteUrl = cache(async () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto = forwardedProto ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
});
