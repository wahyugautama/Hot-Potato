export const WORLD_WIDTH = 720;
export const WORLD_HEIGHT = 900;
export const PLAYER_RADIUS = 26;

export const ONLINE_BALANCE = {
  minPlayers: 2,
  maxPlayers: 6,
  tickRate: 30,
  patchRate: 50,
  inputRate: 20,
  playerSpeed: 210,
  acceleration: 1800,
  deceleration: 2400,
  dashMultiplier: 2.5,
  dashDurationMs: 180,
  dashCooldownMs: 5000,
  bombDurationMs: 15000,
  transferProtectionMs: 1000,
  startCountdownMs: 3000,
  roundTransitionMs: 1500,
  reconnectGraceSeconds: 15,
} as const;

export const PLAYER_COLORS = [0x45e6ff, 0xff5d8f, 0xffd65a, 0x8cff73, 0xb78cff, 0xff9850] as const;
export const ARENA_IDS = ['classic', 'crossroads', 'islands'] as const;
