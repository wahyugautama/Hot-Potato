import { ONLINE_BALANCE } from '../../../shared/constants.js';
import { assignBomb, livingPlayers } from './BombSystem.js';
import type { GameState } from '../state/GameState.js';

export function canStart(state: GameState): boolean {
  const players = [...state.players.values()];
  return players.length >= ONLINE_BALANCE.minPlayers && players.every((player) => player.host || player.ready);
}

export function beginMatch(state: GameState): void {
  state.phase = 'STARTING'; state.phaseEndsAt = state.serverTime + ONLINE_BALANCE.startCountdownMs;
  state.arenaId = ['classic', 'crossroads', 'islands'][Math.floor(Math.random() * 3)]!;
  state.round = 0; state.winnerId = ''; state.lastEliminatedId = ''; state.bombHolderId = '';
}

export function updateMatch(state: GameState): void {
  if (state.phase === 'STARTING' && state.serverTime >= state.phaseEndsAt) {
    state.round = 1; state.phase = 'PLAYING'; assignBomb(state); return;
  }
  if (state.phase === 'PLAYING' && state.serverTime >= state.bombEndsAt) {
    const holder = state.players.get(state.bombHolderId);
    if (holder?.alive) { holder.alive = false; holder.placement = livingPlayers(state).length; state.lastEliminatedId = holder.id; }
    state.bombHolderId = '';
    const alive = livingPlayers(state);
    if (alive.length <= 1) {
      state.phase = 'MATCH_END'; state.winnerId = alive[0]?.id ?? ''; if (alive[0]) alive[0].placement = 1;
    } else { state.phase = 'ROUND_END'; state.phaseEndsAt = state.serverTime + ONLINE_BALANCE.roundTransitionMs; }
    return;
  }
  if (state.phase === 'ROUND_END' && state.serverTime >= state.phaseEndsAt) {
    state.round += 1; state.phase = 'PLAYING'; assignBomb(state);
  }
}
