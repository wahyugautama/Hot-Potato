import { Client, Room } from 'colyseus';
import { ONLINE_BALANCE, PLAYER_COLORS } from '../../../shared/constants.js';
import { CLIENT_MESSAGES } from '../../../shared/protocol.js';
import { parseInput, sanitizeNickname } from '../../../shared/validation.js';
import { SHARED_ARENAS } from '../../../shared/arenas.js';
import { createGameState, createOnlinePlayer, type GameState } from '../state/GameState.js';
import { updateTransfers } from '../systems/BombSystem.js';
import { beginMatch, canStart, updateMatch } from '../systems/MatchSystem.js';
import { movePlayer, requestDash } from '../systems/MovementSystem.js';

interface JoinOptions { nickname?: string; code?: string }

export class HotPotatoRoom extends Room<{ state: GameState }> {
  public maxClients = ONLINE_BALANCE.maxPlayers;
  private readonly contacts = new Set<string>();

  public onCreate(options: JoinOptions): void {
    this.setState(createGameState());
    this.state.roomCode = options.code ?? '';
    this.patchRate = ONLINE_BALANCE.patchRate;
    this.setMetadata({ code: this.state.roomCode });
    console.info(`[room:${this.state.roomCode}] created`);
    this.setSimulationInterval((delta) => this.simulate(delta), 1000 / ONLINE_BALANCE.tickRate);
    this.onMessage(CLIENT_MESSAGES.INPUT, (client, payload: unknown) => {
      const input = parseInput(payload); const player = this.state.players.get(client.sessionId);
      if (!input || !player || input.seq <= player.inputSeq || this.state.phase === 'MATCH_END') return;
      player.inputSeq = input.seq; player.inputX = input.x; player.inputY = input.y;
      if (input.dash) requestDash(player, this.state.serverTime);
    });
    this.onMessage(CLIENT_MESSAGES.READY, (client, value: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (player && this.state.phase === 'WAITING' && !player.host) player.ready = value === true;
    });
    this.onMessage(CLIENT_MESSAGES.START, (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player?.host && this.state.phase === 'WAITING' && canStart(this.state)) this.startGame();
      else client.send('error', 'Everyone must be ready before starting.');
    });
    this.onMessage(CLIENT_MESSAGES.RETURN_LOBBY, (client) => {
      if (this.state.phase === 'MATCH_END' && this.state.players.get(client.sessionId)?.host) this.resetLobby();
    });
    this.onMessage(CLIENT_MESSAGES.PING, (client, sentAt: unknown) => {
      if (typeof sentAt === 'number' && Number.isFinite(sentAt)) client.send('pong', sentAt);
    });
  }

  public onAuth(_client: Client, _options: JoinOptions): boolean {
    return this.state.phase === 'WAITING' && this.state.players.size < this.maxClients;
  }

  public onJoin(client: Client, options: JoinOptions): void {
    const player = createOnlinePlayer();
    player.id = client.sessionId; player.name = sanitizeNickname(options.nickname);
    player.color = PLAYER_COLORS[this.state.players.size % PLAYER_COLORS.length]!;
    player.host = this.state.players.size === 0;
    const spawn = SHARED_ARENAS[0]!.spawns[this.state.players.size]!;
    player.x = spawn.x; player.y = spawn.y;
    this.state.players.set(client.sessionId, player);
    console.info(`[room:${this.state.roomCode}] player joined`, { sessionId: client.sessionId, players: this.state.players.size });
  }

  public onDrop(client: Client): void {
    const player = this.state.players.get(client.sessionId); if (!player) return;
    player.connected = false; player.inputX = 0; player.inputY = 0;
    console.warn(`[room:${this.state.roomCode}] player reconnecting`, { sessionId: client.sessionId });
    this.allowReconnection(client, ONLINE_BALANCE.reconnectGraceSeconds);
  }

  public onReconnect(client: Client): void {
    const player = this.state.players.get(client.sessionId); if (player) player.connected = true;
    console.info(`[room:${this.state.roomCode}] player reconnected`, { sessionId: client.sessionId });
  }

  public onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId); if (!player) return;
    const wasHost = player.host;
    if (this.state.phase === 'WAITING') this.state.players.delete(client.sessionId);
    else player.alive = false;
    if (wasHost) this.assignHost();
    console.info(`[room:${this.state.roomCode}] player left`, { sessionId: client.sessionId, players: this.state.players.size });
  }

  private simulate(deltaMs: number): void {
    const previousPhase = this.state.phase;
    this.state.serverTime += Math.min(deltaMs, 100);
    if (this.state.phase === 'PLAYING') {
      for (const player of this.state.players.values()) movePlayer(player, this.state, Math.min(deltaMs, 100) / 1000);
      updateTransfers(this.state, this.contacts);
    }
    updateMatch(this.state);
    if (previousPhase !== 'MATCH_END' && this.state.phase === 'MATCH_END') {
      console.info(`[room:${this.state.roomCode}] match ended`, { winnerId: this.state.winnerId, round: this.state.round });
    }
  }

  private startGame(): void {
    const arena = SHARED_ARENAS[Math.floor(Math.random() * SHARED_ARENAS.length)]!;
    beginMatch(this.state); this.state.arenaId = arena.id;
    let index = 0;
    for (const player of this.state.players.values()) {
      const spawn = arena.spawns[index++]!;
      player.x = spawn.x; player.y = spawn.y; player.vx = 0; player.vy = 0; player.alive = true;
      player.protectedUntil = 0; player.dashCooldownUntil = 0; player.placement = 0;
    }
    this.lock();
    console.info(`[room:${this.state.roomCode}] match starting`, { players: this.state.players.size, arena: arena.id });
  }

  private resetLobby(): void {
    this.unlock(); this.state.phase = 'WAITING'; this.state.round = 0; this.state.winnerId = '';
    this.state.bombHolderId = ''; this.state.lastEliminatedId = ''; this.contacts.clear();
    for (const player of this.state.players.values()) { player.alive = true; player.ready = false; player.placement = 0; }
  }

  private assignHost(): void {
    const next = [...this.state.players.values()].find((candidate) => candidate.connected);
    if (next) next.host = true;
  }
}
