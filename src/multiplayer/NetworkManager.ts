import { Client, type Room, type SeatReservation } from '@colyseus/sdk';
import type { InputMessage, SeatResponse } from '../../shared/protocol';
import type { NetworkState } from './types';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
type Listener = () => void;

const resolveEndpoint = (): string => {
  const configured = (import.meta.env.VITE_GAME_SERVER_URL as string | undefined)?.replace(/\/$/, '');
  if (configured) return configured;
  if (import.meta.env.DEV) return `${location.protocol}//${location.hostname}:2567`;
  throw new Error('VITE_GAME_SERVER_URL is required for production builds.');
};

export class NetworkManager {
  public room: Room<unknown, NetworkState> | null = null;
  public code = '';
  public connectionState: ConnectionState = 'disconnected';
  public latencyMs = 0;
  private readonly client: Client;
  private readonly endpoint = resolveEndpoint();
  private readonly listeners = new Set<Listener>();
  private reconnecting = false;
  private intentionalLeave = false;
  private pingTimer = 0;

  public constructor() { this.client = new Client(this.endpoint); }

  public async create(nickname: string): Promise<void> { await this.reserve('/api/rooms', nickname); }
  public async join(code: string, nickname: string): Promise<void> { await this.reserve(`/api/rooms/${code.toUpperCase()}/join`, nickname); }

  public send(type: string, payload?: unknown): boolean {
    if (this.connectionState !== 'connected' || !this.room) return false;
    this.room.send(type, payload); return true;
  }
  public sendInput(input: InputMessage): void { this.send('input', input); }
  public subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  public notify(): void { for (const listener of this.listeners) listener(); }

  public leave(): void {
    this.intentionalLeave = true; this.stopPing(); this.room?.leave(true); this.room = null; this.code = '';
    this.setConnectionState('disconnected');
  }

  private async reserve(path: string, nickname: string): Promise<void> {
    this.intentionalLeave = false; this.setConnectionState('connecting');
    try {
      const response = await fetch(`${this.endpoint.replace(/^ws/, 'http')}${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nickname }),
      });
      const result = await response.json() as SeatResponse & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not connect to the room.');
      this.attach(await this.client.consumeSeatReservation<NetworkState>(result.reservation as SeatReservation), result.code);
    } catch (error) { this.setConnectionState('disconnected'); throw error; }
  }

  private attach(room: Room<unknown, NetworkState>, code: string): void {
    this.room = room; this.code = code; this.reconnecting = false; this.intentionalLeave = false;
    sessionStorage.setItem(`hot-potato:${code}:token`, room.reconnectionToken);
    room.onStateChange(() => this.notify());
    room.onMessage('pong', (sentAt: number) => { this.latencyMs = Math.max(0, Math.round(performance.now() - sentAt)); this.notify(); });
    room.onLeave(() => { if (room !== this.room || this.intentionalLeave) return; void this.reconnect(room.reconnectionToken, code); });
    room.onError((_code, message) => window.dispatchEvent(new CustomEvent('hotpotato:network-error', { detail: message })));
    this.setConnectionState('connected'); this.startPing();
  }

  private async reconnect(token: string, code: string): Promise<void> {
    if (this.reconnecting) return;
    this.reconnecting = true; this.stopPing(); this.setConnectionState('reconnecting');
    const deadline = Date.now() + 14500;
    while (!this.intentionalLeave && Date.now() < deadline) {
      try { this.attach(await this.client.reconnect<NetworkState>(token), code); return; }
      catch { await new Promise<void>((resolve) => window.setTimeout(resolve, 1000)); }
    }
    this.reconnecting = false; this.room = null; sessionStorage.removeItem(`hot-potato:${code}:token`);
    this.setConnectionState('disconnected');
    window.dispatchEvent(new CustomEvent('hotpotato:network-error', { detail: 'Connection lost. Rejoin the room to continue.' }));
  }

  private startPing(): void {
    this.stopPing();
    const ping = (): void => { if (this.connectionState === 'connected') this.room?.send('ping', performance.now()); };
    ping(); this.pingTimer = window.setInterval(ping, 2500);
  }
  private stopPing(): void { window.clearInterval(this.pingTimer); this.pingTimer = 0; }
  private setConnectionState(state: ConnectionState): void { this.connectionState = state; this.notify(); }
}

export const network = new NetworkManager();
