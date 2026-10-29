import { ONLINE_BALANCE, PLAYER_RADIUS } from '../../../shared/constants.js';
import type { GameState, OnlinePlayer } from '../state/GameState.js';

export function arePlayersTouching(a: OnlinePlayer, b: OnlinePlayer, tolerance = 4): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= PLAYER_RADIUS * 2 + tolerance;
}

export function livingPlayers(state: GameState): OnlinePlayer[] {
  return [...state.players.values()].filter((player) => player.alive);
}

export function assignBomb(state: GameState, random = Math.random): void {
  const alive = livingPlayers(state);
  const holder = alive[Math.floor(random() * alive.length)];
  state.bombHolderId = holder?.id ?? '';
  state.bombEndsAt = state.serverTime + ONLINE_BALANCE.bombDurationMs;
}

export function updateTransfers(state: GameState, contacts: Set<string>): void {
  if (state.phase !== 'PLAYING') { contacts.clear(); return; }
  const holder = state.players.get(state.bombHolderId);
  if (!holder?.alive) return;
  for (const recipient of state.players.values()) {
    if (!recipient.alive || recipient.id === holder.id || state.serverTime < recipient.protectedUntil) continue;
    const pair = [holder.id, recipient.id].sort().join(':');
    const overlap = arePlayersTouching(holder, recipient);
    if (overlap && !contacts.has(pair)) {
      contacts.add(pair);
      holder.protectedUntil = state.serverTime + ONLINE_BALANCE.transferProtectionMs;
      state.lastTransferFrom = holder.id;
      state.lastTransferTo = recipient.id;
      state.bombHolderId = recipient.id;
      state.transferEventId += 1;
      return;
    }
    if (!overlap) contacts.delete(pair);
  }
}
