# Liquid Profile

A personal bio page that syncs live with your Discord profile through [Lanyard](https://github.com/Phineas/lanyard).

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Lucide

## Setup

1. Join the Lanyard Discord server: <https://discord.gg/lanyard>. Lanyard only tracks members of that server.
2. Copy your Discord user ID: turn on **Settings → Advanced → Developer Mode**, then right-click your name and choose **Copy User ID**.
3. Create `.env.local`:

   ```bash
   cp .env.example .env.local
   # then set NEXT_PUBLIC_DISCORD_ID=<your id>
   ```

4. Run it:

   ```bash
   npm install
   npm run dev
   ```

## Personalising

Everything personal lives in [`profile.config.ts`](profile.config.ts): name override, name style, badges, tagline, banner, background image or video, and social links. Leave a field as `null` and it isn't shown.

Put local images or videos in `public/` and reference them as `/file.jpg`.

## How the live data works

- **First paint:** the server fetches Lanyard's REST endpoint, with a 2.5s timeout, so the page shows real data right away.
- **Live updates:** the client subscribes over `wss://api.lanyard.rest/socket`, sends heartbeats at the interval the server asks for, and reconnects with jittered exponential backoff (1s → 30s).
- **Fallback:** while the socket is down, the page polls REST every 20s. The footer shows *Live*, *Reconnecting* or *Offline*.
- **Missing data:** "Presence unavailable" (a failed fetch) is shown differently from Discord's *Offline* status. Accounts not on Lanyard get a quiet note in the footer. No placeholder data is ever shown.

No API keys or Discord tokens are used. Your user ID is public information.

## Welcome animation

When the page loads, a full-screen greeting is written by hand on black, stroke by stroke. It holds, dissolves, and the next language begins. This repeats until the visitor clicks, taps or presses Enter, Space or Escape.

**Every greeting is bespoke lettering**, not a font. Each language lives in its own file in [`lettering/languages/`](lettering/languages):
- A file lists the pen strokes in writing order. Each stroke is a series of points the pen passes through, with corners marked wherever the pen turns sharply.
- Joined scripts (Latin, Cyrillic) are built from a hand-designed glyph set in [`lettering/scripts/`](lettering/scripts).
- Chinese and Japanese use real stroke-order data.

**The pieces:**
- [`lettering/engine.mjs`](lettering/engine.mjs) turns points into smooth centre-line curves. It also slants the writing and joins cursive letters into continuous strokes.
- `npm run lettering` compiles every language into `public/handwriting/<id>.json` and the sequence into `data/greetings.json`. The order is set in [`lettering/index.mjs`](lettering/index.mjs).
- `npm run lettering:preview -- <id> --debug` renders PNGs of a greeting at 25/50/75/100% written, plus a debug view with numbered strokes and marked points. Output goes to `.lettering-preview/`.
- [`components/HandwritingAnimation.tsx`](components/HandwritingAnimation.tsx) writes one piece of artwork. The pen eases in, slows through curves, speeds along sweeps and pauses between strokes. With reduced motion on, greetings appear already written.
- [`components/HelloIntro.tsx`](components/HelloIntro.tsx) runs the sequence and preloads the next greeting.

**Adding a language:** create `lettering/languages/<id>.mjs`, add the id to `SEQUENCE`, preview it, then run `npm run lettering`.

## Credits

Stroke-order data: [KanjiVG](https://kanjivg.tagaini.net) (CC BY-SA 3.0) and [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) via `hanzi-writer-data` (Arphic Public License).

## Deploying to Vercel

Import the repo, add `NEXT_PUBLIC_DISCORD_ID` under **Environment Variables**, and deploy.
