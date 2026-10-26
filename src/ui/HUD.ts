import { GAME_EVENTS, type PlayerId } from '../types/game';
import type { BombSystem } from '../game/systems/BombSystem';

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
};

export class HUD {
  private readonly hud = getElement<HTMLElement>('hud');
  private readonly controls = getElement<HTMLElement>('controls');
  private readonly timer = getElement<HTMLElement>('timer');
  private readonly players = getElement<HTMLElement>('players-left');
  private readonly holder = getElement<HTMLElement>('bomb-holder');
  private readonly status = getElement<HTMLElement>('round-status');
  private readonly round = getElement<HTMLElement>('round-number');
  private readonly arena = getElement<HTMLElement>('arena-name');
  private readonly dashButton = getElement<HTMLButtonElement>('dash-button');
  private readonly dashProgress = getElement<HTMLElement>('dash-progress');
  private readonly dashCooldown = getElement<HTMLElement>('dash-cooldown');
  private readonly winner = getElement<HTMLElement>('winner');
  private readonly winnerName = getElement<HTMLElement>('winner-name');
  private readonly toast = getElement<HTMLElement>('toast');
  private toastTimeout = 0;

  public bind(system: BombSystem): void {
    system.on(GAME_EVENTS.TIMER_CHANGED, this.handleTimer);
    system.on(GAME_EVENTS.BOMB_CHANGED, this.handleBombChanged);
    system.on(GAME_EVENTS.PLAYER_ELIMINATED, this.handleElimination);
    system.on(GAME_EVENTS.ROUND_WAITING, this.handleWaiting);
    system.on(GAME_EVENTS.MATCH_FINISHED, this.handleFinished);
    system.on(GAME_EVENTS.ROUND_STARTED, this.handleRoundStarted);
  }

  public show(): void { this.hud.classList.remove('is-hidden'); this.controls.classList.remove('is-hidden'); this.winner.classList.add('is-hidden'); }
  public setPlayers(count: number): void { this.players.textContent = `${count} player${count === 1 ? '' : 's'}`; }
  public setArena(name: string): void { this.arena.textContent = name; }
  public setSpectating(): void { this.status.textContent = "YOU'RE OUT — SPECTATING"; this.controls.classList.add('is-spectating'); }
  public updateDash(ratio: number): void {
    this.dashButton.classList.toggle('is-cooling', ratio > 0);
    this.dashButton.disabled = ratio > 0;
    this.dashProgress.style.setProperty('--cooldown', `${ratio * 360}deg`);
    this.dashCooldown.textContent = ratio > 0 ? `${Math.ceil(ratio * 5)}s` : 'READY';
  }

  private readonly handleTimer = (ms: number): void => {
    this.timer.textContent = (ms / 1000).toFixed(1);
    this.timer.classList.toggle('is-warning', ms <= 10000);
    this.timer.classList.toggle('is-urgent', ms <= 5000);
    if (!this.controls.classList.contains('is-spectating')) this.status.textContent = ms <= 5000 ? 'PASS IT NOW!' : ms <= 10000 ? 'STAY SHARP' : 'Keep moving';
  };
  private readonly handleBombChanged = (_id: PlayerId, name: string): void => { this.holder.textContent = `Bomb: ${name}`; };
  private readonly handleElimination = (_id: PlayerId, name: string): void => {
    this.showToast(`${name} BLEW UP!`); this.status.textContent = 'Next round in 2…';
  };
  private readonly handleWaiting = (): void => { this.holder.textContent = 'Bomb: —'; };
  private readonly handleRoundStarted = (round: number): void => { this.round.textContent = `ROUND ${round}`; };
  private readonly handleFinished = (id: PlayerId | undefined, name: string): void => {
    this.controls.classList.add('is-hidden'); this.controls.classList.remove('is-spectating');
    this.winnerName.textContent = id === 'you' ? 'YOU WIN!' : `${name.toUpperCase()} WINS!`;
    this.winner.classList.remove('is-hidden');
  };

  private showToast(message: string): void {
    window.clearTimeout(this.toastTimeout); this.toast.textContent = message; this.toast.classList.add('is-visible');
    this.toastTimeout = window.setTimeout(() => this.toast.classList.remove('is-visible'), 1500);
  }

  public destroy(system: BombSystem): void { system.removeAllListeners(); window.clearTimeout(this.toastTimeout); }
}
