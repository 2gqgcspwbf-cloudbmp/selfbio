"use client";

import { useState, type ImgHTMLAttributes, type ReactNode } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /** Tried in order; the next one is used when an image fails to load. */
  src: string | null | undefined | (string | null | undefined)[];
  fallback?: ReactNode;
};

/** An <img> that never shows a broken-image icon. */
export function SafeImage({ src, fallback = null, alt = "", ...rest }: Props) {
  const sources = (Array.isArray(src) ? src : [src]).filter((s): s is string => !!s);
  const [failed, setFailed] = useState<string[]>([]);
  const current = sources.find((s) => !failed.includes(s));

  if (!current) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote, often animated, unknown hosts
    <img
      {...rest}
      key={current}
      src={current}
      alt={alt}
      decoding="async"
      draggable={false}
      onError={() => setFailed((f) => [...f, current])}
    />
  );
}
