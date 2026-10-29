const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeRoomCode(random = Math.random): string {
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
}
