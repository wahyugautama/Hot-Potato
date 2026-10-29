# HOT POTATO

Mobile-first Phaser party game with local practice and server-authoritative online rooms for 2–6 players.

## Local development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` (the defaults work locally).
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5173`. To test multiplayer, open another browser or private window and join with the displayed six-character code.

`npm run dev` starts Vite and the Colyseus server together. The client is on port 5173 and the game server/API is on port 2567.

## Validation

- `npm run typecheck` checks strict TypeScript for client and server.
- `npm test` runs practice-rule and authoritative multiplayer-rule tests.
- `npm run build` creates the static client in `dist/` and Node server in `server/dist/`.
- `npm run build:client` is the Vercel build command.
- `npm run build:server` is the Railway build command.

## Deployment

Deploy the static client to Vercel using `vercel.json`. Set `VITE_GAME_SERVER_URL` to the public HTTPS Railway URL before building. The Colyseus client automatically uses secure WebSockets when the endpoint is HTTPS. There is deliberately no production localhost fallback.

Deploy the Node server to Railway using `railway.json`. Railway supplies `PORT`; set `NODE_ENV=production` and `CLIENT_ORIGIN` to the exact Vercel origin. Multiple origins may be comma-separated. The server exposes `GET /health`, binds to `0.0.0.0`, handles termination signals, and drains active rooms. WebSockets require a persistent Node service and are intentionally not hosted as Vercel serverless functions.

### Recommended deployment order

1. Import the GitHub repository into Railway and deploy from the repository root.
2. Set `NODE_ENV=production`; temporarily set `CLIENT_ORIGIN` to the expected Vercel origin.
3. Generate a Railway public domain and verify `https://<railway-domain>/health` returns `{ "ok": true }`.
4. Import the same GitHub repository into Vercel. Keep the root directory at the repository root.
5. Set `VITE_GAME_SERVER_URL=https://<railway-domain>` in Vercel and deploy.
6. Set Railway `CLIENT_ORIGIN` to the final Vercel HTTPS origin and redeploy the backend.
7. Open two independent browsers, create a room, join through the invitation URL, ready both clients, and complete a match/rematch.

Never put secrets in either Vite variable: variables prefixed with `VITE_` are embedded in the public browser bundle.

## Connection and diagnostics

Online play shows `CONNECTING`, `CONNECTED`, `RECONNECTING`, and `DISCONNECTED` states. Unexpected disconnects retry with the existing Colyseus reconnection token for approximately 15 seconds, matching the server grace period. Gameplay messages are suppressed until reconnection succeeds.

In local development, press `F3` to toggle the diagnostics overlay. It shows FPS, round-trip latency, connection state, room code, and connected player count. The overlay is excluded from normal production use.

## Mobile staging checklist

Check portrait layouts at 375×667, 390×844, 393×852, and 430×932. Verify the complete create/invite/join/ready/start/play/eliminate/winner/rematch path on at least two physical phones before calling the staging release production-ready. Physical-device testing has not been performed by the automated development workflow.

Rooms live in server memory. A single Railway instance is appropriate for this stage; horizontal scaling needs shared Colyseus presence/driver infrastructure in a later stage.
