"use client";

import { useEffect, useState } from "react";

/**
 * Current time, re-rendering every `interval` ms. Returns `null` until mounted so
 * server and client markup match.
 */
export function useNow(interval = 1000, enabled = true) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);

  return now;
}
