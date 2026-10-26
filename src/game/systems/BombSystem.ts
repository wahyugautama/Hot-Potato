import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { GAME_EVENTS, type MatchPhase, type PlayerId } from '../../types/game';
import { BALANCE } from '../config';
import { isTransferEligible, shouldStartNextRound } from '../logic/rules';

export class BombSystem extends Phaser.Events.EventEmitter {
  public readonly roundDurationMs = BALANCE.bombDurationMs;
  public remainingMs: number = this.roundDurationMs;
  public phase: MatchPhase = 'playing';
  private holder: Player | null = null;
  private transitionAt = 0;
  private readonly consumedContacts = new Set<string>();
  private round = 1;

  public constructor(private readonly players: Player[]) { super(); }

  public start(now: number): void {
    this.assignRandomHolder(now);
  }

  public update(now: number, delta: number): void {
    if (this.phase === 'intermission') {
      if (shouldStartNextRound(this.phase, now, this.transitionAt)) { this.phase = 'playing'; this.remainingMs = this.roundDurationMs; this.round += 1; this.emit(GAME_EVENTS.ROUND_STARTED, this.round); this.assignRandomHolder(now); }
      return;
    }
    if (this.phase !== 'playing' || !this.holder) return;
    this.remainingMs = Math.max(0, this.remainingMs - delta);
    this.emit(GAME_EVENTS.TIMER_CHANGED, this.remainingMs);
    if (this.remainingMs <= 0) this.eliminateHolder(now);
  }

  public tryTransfer(a: Player, b: Player, now: number): void {
    if (this.phase !== 'playing' || !a.playerState.alive || !b.playerState.alive || !this.holder) return;
    const holder = a === this.holder ? a : b === this.holder ? b : null;
    const recipient = holder === a ? b : holder === b ? a : null;
    if (!holder || !recipient) return;
    const pair = [a.playerState.id, b.playerState.id].sort().join(':');
    if (!isTransferEligible(this.phase, holder.playerState.alive, recipient.playerState.alive, recipient.playerState.protectedUntil, now, this.consumedContacts.has(pair))) return;
    holder.setBombState(false);
    recipient.setBombState(true);
    holder.playerState.protectedUntil = now + BALANCE.transferProtectionMs;
    recipient.playerState.protectedUntil = now + BALANCE.transferProtectionMs;
    this.holder = recipient;
    this.consumedContacts.add(pair);
    this.emit(GAME_EVENTS.BOMB_CHANGED, recipient.playerState.id, recipient.playerState.name);
    this.emit(GAME_EVENTS.BOMB_TRANSFERRED, holder, recipient);
  }

  public setContactState(pair: string, touching: boolean): void { if (!touching) this.consumedContacts.delete(pair); }
  public getHolder(): Player | null { return this.holder; }

  private assignRandomHolder(now: number): void {
    const alive = this.players.filter((player) => player.playerState.alive);
    if (alive.length <= 1) { this.finish(alive[0]); return; }
    const next = Phaser.Utils.Array.GetRandom(alive);
    next.setBombState(true); next.playerState.protectedUntil = now + BALANCE.transferProtectionMs;
    this.holder = next;
    this.emit(GAME_EVENTS.BOMB_CHANGED, next.playerState.id, next.playerState.name);
    this.emit(GAME_EVENTS.TIMER_CHANGED, this.remainingMs);
  }

  private eliminateHolder(now: number): void {
    if (!this.holder || this.phase !== 'playing') return;
    const eliminated = this.holder;
    this.holder = null; this.phase = 'intermission';
    eliminated.eliminate();
    this.emit(GAME_EVENTS.PLAYER_ELIMINATED, eliminated.playerState.id, eliminated.playerState.name, eliminated.x, eliminated.y);
    const alive = this.players.filter((player) => player.playerState.alive);
    if (alive.length <= 1) { this.finish(alive[0]); return; }
    this.transitionAt = now + BALANCE.roundTransitionMs;
    this.emit(GAME_EVENTS.ROUND_WAITING, BALANCE.roundTransitionMs / 1000);
  }

  private finish(winner?: Player): void {
    this.phase = 'finished'; this.holder = null;
    this.emit(GAME_EVENTS.MATCH_FINISHED, winner?.playerState.id as PlayerId | undefined, winner?.playerState.name ?? 'Nobody');
  }
}
