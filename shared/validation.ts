import type { InputMessage } from './protocol.js';

export function sanitizeNickname(value: unknown): string {
  if (typeof value !== 'string') return 'Player';
  const clean = value.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 14);
  return clean || 'Player';
}

export function validRoomCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z2-9]{6}$/.test(value);
}

export function parseInput(value: unknown): InputMessage | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<InputMessage>;
  if (!Number.isSafeInteger(data.seq) || typeof data.x !== 'number' || typeof data.y !== 'number') return null;
  if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return null;
  const length = Math.hypot(data.x, data.y);
  const scale = length > 1 ? 1 / length : 1;
  return { seq: data.seq!, x: data.x * scale, y: data.y * scale, dash: data.dash === true };
}
