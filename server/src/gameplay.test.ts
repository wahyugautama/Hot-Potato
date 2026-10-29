import { describe, expect, it } from 'vitest';
import { ONLINE_BALANCE } from '../../shared/constants.js';
import { parseInput, sanitizeNickname, validRoomCode } from '../../shared/validation.js';
import { createGameState, createOnlinePlayer, type GameState, type OnlinePlayer } from './state/GameState.js';
import { arePlayersTouching, assignBomb, updateTransfers } from './systems/BombSystem.js';
import { beginMatch, canStart, updateMatch } from './systems/MatchSystem.js';
import { movePlayer, requestDash } from './systems/MovementSystem.js';
import { makeRoomCode } from './roomCode.js';

function player(id: string, x = 100, y = 100): OnlinePlayer { const value = createOnlinePlayer(); value.id = id; value.x = x; value.y = y; return value; }
function stateWith(count: number): GameState { const state = createGameState(); for (let index = 0; index < count; index += 1) state.players.set(String(index), player(String(index), 100 + index * 100)); return state; }

describe('protocol validation', () => {
  it('sanitizes display names', () => expect(sanitizeNickname('<b>Hot!</b>')).toBe('bHotb'));
  it('accepts a valid room code', () => expect(validRoomCode('ABC239')).toBe(true));
  it('rejects ambiguous room code characters', () => expect(validRoomCode('ABC10I')).toBe(false));
  it('normalizes diagonal input', () => expect(parseInput({ seq: 1, x: 9, y: 9 })?.x).toBeCloseTo(Math.SQRT1_2));
  it('rejects malformed input', () => expect(parseInput({ seq: '1', x: 0, y: 0 })).toBeNull());
});

describe('room and lobby rules', () => {
  it('creates six-character non-ambiguous codes', () => expect(makeRoomCode(() => 0)).toBe('AAAAAA'));
  it('requires two players', () => expect(canStart(stateWith(1))).toBe(false));
  it('requires non-host players to be ready', () => { const state = stateWith(2); state.players.get('0')!.host = true; expect(canStart(state)).toBe(false); state.players.get('1')!.ready = true; expect(canStart(state)).toBe(true); });
});

describe('authoritative movement', () => {
  it('enforces dash cooldown', () => { const value = player('a'); expect(requestDash(value, 100)).toBe(false); value.inputX = 1; expect(requestDash(value, 100)).toBe(true); expect(requestDash(value, 101)).toBe(false); });
  it('keeps players inside world bounds', () => { const state = createGameState(); state.serverTime = 1; const value = player('a', 50, 50); value.inputX = -1; value.inputY = -1; movePlayer(value, state, 1); expect(value.x).toBeGreaterThanOrEqual(60); expect(value.y).toBeGreaterThanOrEqual(60); });
  it('does not pass through obstacles', () => { const state = createGameState(); state.arenaId = 'classic'; const value = player('a', 210, 350); value.inputX = 1; movePlayer(value, state, .5); expect(value.x).toBeLessThan(224); });
});

describe('bomb and lifecycle', () => {
  it('counts exact edge contact after collision resolution', () => expect(arePlayersTouching(player('a', 100), player('b', 156))).toBe(true));
  it('assigns the bomb deterministically with injected random', () => { const state = stateWith(2); assignBomb(state, () => .99); expect(state.bombHolderId).toBe('1'); });
  it('transfers only once during continuous contact', () => { const state = stateWith(2); state.phase = 'PLAYING'; state.bombHolderId = '0'; state.players.get('1')!.x = 110; const contacts = new Set<string>(); updateTransfers(state, contacts); expect(state.bombHolderId).toBe('1'); updateTransfers(state, contacts); expect(state.transferEventId).toBe(1); });
  it('honors recipient transfer protection', () => { const state = stateWith(2); state.phase = 'PLAYING'; state.bombHolderId = '0'; state.players.get('1')!.x = 110; state.players.get('1')!.protectedUntil = 1000; updateTransfers(state, new Set()); expect(state.bombHolderId).toBe('0'); });
  it('eliminates the holder once and enters round end', () => { const state = stateWith(3); state.phase = 'PLAYING'; state.bombHolderId = '0'; state.bombEndsAt = 10; state.serverTime = 10; updateMatch(state); expect(state.players.get('0')!.alive).toBe(false); expect(state.phase).toBe('ROUND_END'); });
  it('declares the last survivor winner', () => { const state = stateWith(2); state.phase = 'PLAYING'; state.bombHolderId = '0'; state.bombEndsAt = 10; state.serverTime = 10; updateMatch(state); expect(state.phase).toBe('MATCH_END'); expect(state.winnerId).toBe('1'); });
  it('starts after countdown and sets a live bomb timer', () => { const state = stateWith(2); beginMatch(state); state.serverTime = ONLINE_BALANCE.startCountdownMs; state.phaseEndsAt = state.serverTime; updateMatch(state); expect(state.phase).toBe('PLAYING'); expect(state.bombEndsAt).toBeGreaterThan(state.serverTime); });
});
