import { ONLINE_BALANCE, PLAYER_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from '../../../shared/constants.js';
import { SHARED_ARENAS } from '../../../shared/arenas.js';
import type { GameState, OnlinePlayer } from '../state/GameState.js';

function blocked(x: number, y: number, arenaId: string): boolean {
  const arena = SHARED_ARENAS.find((candidate) => candidate.id === arenaId) ?? SHARED_ARENAS[0]!;
  return arena.obstacles.some((wall) =>
    x + PLAYER_RADIUS > wall.x - wall.width / 2 && x - PLAYER_RADIUS < wall.x + wall.width / 2 &&
    y + PLAYER_RADIUS > wall.y - wall.height / 2 && y - PLAYER_RADIUS < wall.y + wall.height / 2);
}

function approach(current: number, target: number, amount: number): number {
  return current < target ? Math.min(current + amount, target) : Math.max(current - amount, target);
}

export function movePlayer(player: OnlinePlayer, state: GameState, dtSeconds: number): void {
  if (!player.alive || !player.connected) { player.vx = 0; player.vy = 0; return; }
  const now = state.serverTime;
  const dash = now < player.dashUntil;
  const speed = ONLINE_BALANCE.playerSpeed * (dash ? ONLINE_BALANCE.dashMultiplier : 1);
  const targetX = player.inputX * speed;
  const targetY = player.inputY * speed;
  const rate = (Math.hypot(targetX, targetY) > 0 ? ONLINE_BALANCE.acceleration : ONLINE_BALANCE.deceleration) * dtSeconds;
  player.vx = approach(player.vx, targetX, rate);
  player.vy = approach(player.vy, targetY, rate);
  const minX = PLAYER_RADIUS + 34; const maxX = WORLD_WIDTH - PLAYER_RADIUS - 34;
  const minY = PLAYER_RADIUS + 34; const maxY = WORLD_HEIGHT - PLAYER_RADIUS - 34;
  const nextX = Math.max(minX, Math.min(maxX, player.x + player.vx * dtSeconds));
  if (!blocked(nextX, player.y, state.arenaId)) player.x = nextX; else player.vx = 0;
  const nextY = Math.max(minY, Math.min(maxY, player.y + player.vy * dtSeconds));
  if (!blocked(player.x, nextY, state.arenaId)) player.y = nextY; else player.vy = 0;
}

export function requestDash(player: OnlinePlayer, now: number): boolean {
  if (!player.alive || now < player.dashCooldownUntil || now < player.dashUntil) return false;
  if (Math.hypot(player.inputX, player.inputY) < 0.1) return false;
  player.dashUntil = now + ONLINE_BALANCE.dashDurationMs;
  player.dashCooldownUntil = now + ONLINE_BALANCE.dashCooldownMs;
  return true;
}
