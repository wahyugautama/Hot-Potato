export type PlayerId = 'you' | 'nova' | 'zip' | 'mox';
export type BotPersonality = 'aggressive' | 'cautious' | 'unpredictable';

export interface Vector2Like { x: number; y: number }

export interface PlayerState {
  id: PlayerId;
  name: string;
  color: number;
  spawn: Vector2Like;
  alive: boolean;
  hasBomb: boolean;
  protectedUntil: number;
  personality?: BotPersonality;
}

export type MatchPhase = 'playing' | 'intermission' | 'finished';

export interface BombSnapshot {
  holderId: PlayerId | null;
  remainingMs: number;
  phase: MatchPhase;
}

export const GAME_EVENTS = {
  BOMB_CHANGED: 'bomb:changed',
  TIMER_CHANGED: 'timer:changed',
  PLAYER_ELIMINATED: 'player:eliminated',
  ROUND_WAITING: 'round:waiting',
  MATCH_FINISHED: 'match:finished',
  BOMB_TRANSFERRED: 'bomb:transferred',
  ROUND_STARTED: 'round:started',
} as const;
