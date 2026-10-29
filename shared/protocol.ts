export type OnlinePhase = 'WAITING' | 'STARTING' | 'PLAYING' | 'ROUND_END' | 'MATCH_END';

export interface InputMessage {
  seq: number;
  x: number;
  y: number;
  dash?: boolean;
}

export const CLIENT_MESSAGES = {
  INPUT: 'input', READY: 'ready', START: 'start', RETURN_LOBBY: 'return_lobby', PING: 'ping',
} as const;

export const SERVER_MESSAGES = {
  ERROR: 'error', NOTICE: 'notice', PONG: 'pong',
} as const;

export interface SeatResponse {
  code: string;
  reservation: unknown;
}
