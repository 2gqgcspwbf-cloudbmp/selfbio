"use client";

import { useEffect, useState } from "react";
import { LANYARD_WS, fetchPresence, normalisePresence, type LanyardResult, type Presence } from "@/lib/lanyard";

/**
 * - `live`       WebSocket subscribed and receiving updates
 * - `polling`    socket down; REST is filling in while we reconnect
 * - `connecting` first connection attempt in flight
 * - `offline`    browser reports no network
 */
export type Connection = "connecting" | "live" | "polling" | "offline";

export interface LanyardState {
  presence: Presence | null;
  /** `unavailable` = we couldn't fetch presence; it says nothing about whether you're offline. */
  status: "loading" | "ready" | "not_monitored" | "unavailable";
  connection: Connection;
}

const POLL_INTERVAL = 20_000;
const MAX_BACKOFF = 30_000;

enum Op {
  Event = 0,
  Hello = 1,
  Initialize = 2,
  Heartbeat = 3,
}

function initialState(initial?: LanyardResult | null): LanyardState {
  if (initial?.ok) return { presence: initial.presence, status: "ready", connection: "connecting" };
  if (initial?.reason === "not_monitored")
    return { presence: null, status: "not_monitored", connection: "connecting" };
  return { presence: null, status: "loading", connection: "connecting" };
}

export function useLanyard(userId: string, initial?: LanyardResult | null): LanyardState {
  const [state, setState] = useState<LanyardState>(() => initialState(initial));

  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let restAbort: AbortController | null = null;
    let attempts = 0;

    const patch = (next: Partial<LanyardState>) => {
      if (!disposed) setState((prev) => ({ ...prev, ...next }));
    };

    const applyRest = (result: LanyardResult) => {
      if (disposed) return;
      setState((prev) => {
        if (result.ok) return { ...prev, presence: result.presence, status: "ready" };
        if (result.reason === "not_monitored") return { ...prev, presence: null, status: "not_monitored" };
        // Keep the last good snapshot if we have one, but never pretend it's fresh.
        return { ...prev, status: prev.presence ? prev.status : "unavailable" };
      });
    };

    const poll = async () => {
      restAbort?.abort();
      const controller = new AbortController();
      restAbort = controller;
      try {
        applyRest(await fetchPresence(userId, { signal: controller.signal, cache: "no-store" }));
      } catch {
        /* aborted */
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      void poll();
      pollTimer = setInterval(poll, POLL_INTERVAL);
    };

    const stopPolling = () => {
      clearInterval(pollTimer);
      pollTimer = undefined;
    };

    const closeSocket = () => {
      clearInterval(heartbeat);
      heartbeat = undefined;
      if (!socket) return;
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
      socket = null;
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      const base = Math.min(MAX_BACKOFF, 1000 * 2 ** attempts);
      const delay = base * (0.75 + Math.random() * 0.5);
      attempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;
      closeSocket();

      let ws: WebSocket;
      try {
        ws = new WebSocket(LANYARD_WS);
      } catch {
        startPolling();
        scheduleReconnect();
        return;
      }
      socket = ws;

      ws.onmessage = (event) => {
        let msg: { op?: number; t?: string; d?: unknown };
        try {
          msg = JSON.parse(typeof event.data === "string" ? event.data : "");
        } catch {
          return;
        }

        if (msg.op === Op.Hello) {
          const d = msg.d as { heartbeat_interval?: number } | undefined;
          const interval = d?.heartbeat_interval ?? 30_000;
          clearInterval(heartbeat);
          heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: Op.Heartbeat }));
          }, interval);
          ws.send(JSON.stringify({ op: Op.Initialize, d: { subscribe_to_id: userId } }));
          return;
        }

        if (msg.op === Op.Event && (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")) {
          const presence = normalisePresence(msg.d);
          attempts = 0;
          stopPolling();
          if (presence) {
            patch({ presence, status: "ready", connection: "live" });
          } else {
            // Subscribed but nothing usable (e.g. account not in the Lanyard server) — REST gives the reason.
            patch({ connection: "live" });
            void poll();
          }
        }
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        if (disposed || socket !== ws) return;
        clearInterval(heartbeat);
        socket = null;
        patch({ connection: navigator.onLine ? "polling" : "offline" });
        if (navigator.onLine) startPolling();
        scheduleReconnect();
      };
    };

    const handleOnline = () => {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      attempts = 0;
      patch({ connection: "connecting" });
      void poll();
      connect();
    };

    const handleOffline = () => {
      stopPolling();
      patch({ connection: "offline" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!initial?.ok) void poll();
    connect();

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(reconnectTimer);
      stopPolling();
      restAbort?.abort();
      closeSocket();
    };
    // `initial` only seeds the first render; re-subscribing on it would duplicate sockets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return state;
}
