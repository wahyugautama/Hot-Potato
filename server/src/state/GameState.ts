import { schema, t, type SchemaType } from '@colyseus/schema';

export const OnlinePlayer = schema({
  id: t.string(), name: t.string(), color: t.number(), x: t.number(), y: t.number(), vx: t.number(), vy: t.number(),
  alive: t.boolean(), ready: t.boolean(), host: t.boolean(), connected: t.boolean(), inputX: t.number(), inputY: t.number(),
  inputSeq: t.number(), dashUntil: t.number(), dashCooldownUntil: t.number(), protectedUntil: t.number(), placement: t.number(),
}, 'OnlinePlayer');
export type OnlinePlayer = SchemaType<typeof OnlinePlayer>;

export const GameState = schema({
  players: t.map(OnlinePlayer), phase: t.string(), roomCode: t.string(), arenaId: t.string(), bombHolderId: t.string(),
  winnerId: t.string(), lastTransferFrom: t.string(), lastTransferTo: t.string(), lastEliminatedId: t.string(),
  serverTime: t.number(), bombEndsAt: t.number(), phaseEndsAt: t.number(), round: t.number(), transferEventId: t.number(),
}, 'GameState');
export type GameState = SchemaType<typeof GameState>;

export function createGameState(): GameState {
  return new GameState().assign({ phase: 'WAITING', roomCode: '', arenaId: 'classic', bombHolderId: '', winnerId: '',
    lastTransferFrom: '', lastTransferTo: '', lastEliminatedId: '', serverTime: 0, bombEndsAt: 0, phaseEndsAt: 0, round: 0, transferEventId: 0 });
}

export function createOnlinePlayer(): OnlinePlayer {
  return new OnlinePlayer().assign({ id: '', name: 'Player', color: 0xffffff, x: 0, y: 0, vx: 0, vy: 0,
    alive: true, ready: false, host: false, connected: true, inputX: 0, inputY: 0, inputSeq: -1,
    dashUntil: 0, dashCooldownUntil: 0, protectedUntil: 0, placement: 0 });
}
