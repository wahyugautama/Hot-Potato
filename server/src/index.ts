import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { sanitizeNickname, validRoomCode } from '../../shared/validation.js';
import { HotPotatoRoom } from './rooms/HotPotatoRoom.js';
import { makeRoomCode } from './roomCode.js';

const app = express();
const production = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? '').split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || (!production && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) callback(null, true);
    else callback(new Error('Origin is not allowed.'));
  },
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '8kb' }));
app.get('/health', (_request, response) => response.json({ ok: true, service: 'hot-potato-server' }));

const httpServer = createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }), gracefullyShutdown: false });
gameServer.define('hot_potato', HotPotatoRoom);

async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = makeRoomCode();
    if (!(await matchMaker.query()).some((room) => room.metadata?.code === code)) return code;
  }
  throw new Error('Could not allocate room code');
}

app.post('/api/rooms', async (request, response) => {
  try {
    const code = await uniqueCode();
    const room = await matchMaker.createRoom('hot_potato', { code });
    const reservation = await matchMaker.joinById(room.roomId, { nickname: sanitizeNickname(request.body?.nickname) });
    response.status(201).json({ code, reservation });
  } catch (error) { console.error('[api] room creation failed', error); response.status(503).json({ error: 'Could not create room.' }); }
});

app.post('/api/rooms/:code/join', async (request, response) => {
  const code = String(request.params.code).toUpperCase();
  if (!validRoomCode(code)) { response.status(400).json({ error: 'Enter a valid 6-character room code.' }); return; }
  try {
    const room = (await matchMaker.query()).find((candidate) => candidate.metadata?.code === code);
    if (!room) { response.status(404).json({ error: 'Room not found.' }); return; }
    const reservation = await matchMaker.joinById(room.roomId, { nickname: sanitizeNickname(request.body?.nickname) });
    response.json({ code, reservation });
  } catch (error) { console.error('[api] room join failed', { code, error }); response.status(409).json({ error: 'Room is full or the match has started.' }); }
});

const port = Number(process.env.PORT ?? 2567);
await gameServer.listen(port, '0.0.0.0');
console.log(`HOT POTATO server listening on ${port}`);

let shuttingDown = false;
const handleShutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true; console.info(`[server] ${signal} received; draining rooms`);
  const forceExit = setTimeout(() => process.exit(1), 10000); forceExit.unref();
  try { await gameServer.gracefullyShutdown(false); httpServer.close(); process.exitCode = 0; }
  catch (error) { console.error('[server] graceful shutdown failed', error); process.exitCode = 1; }
};
process.once('SIGTERM', () => void handleShutdown('SIGTERM'));
process.once('SIGINT', () => void handleShutdown('SIGINT'));
process.on('uncaughtException', (error) => { console.error('[server] uncaught exception', error); void handleShutdown('uncaughtException'); });
process.on('unhandledRejection', (error) => { console.error('[server] unhandled rejection', error); });
