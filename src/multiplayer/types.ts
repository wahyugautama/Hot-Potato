export interface NetworkPlayer {
  id: string; name: string; color: number; x: number; y: number; vx: number; vy: number;
  alive: boolean; ready: boolean; host: boolean; connected: boolean; dashUntil: number;
  dashCooldownUntil: number; placement: number;
}

export interface NetworkPlayers {
  get(id: string): NetworkPlayer | undefined;
  forEach(callback: (player: NetworkPlayer, key: string) => void): void;
}

export interface NetworkState {
  players: NetworkPlayers; phase: string; roomCode: string; arenaId: string; bombHolderId: string;
  winnerId: string; lastTransferFrom: string; lastTransferTo: string; lastEliminatedId: string;
  serverTime: number; bombEndsAt: number; phaseEndsAt: number; round: number; transferEventId: number;
}
