import Phaser from 'phaser';
import { SHARED_ARENAS } from '../../../shared/arenas';
import { ONLINE_BALANCE } from '../../../shared/constants';
import { network } from '../../multiplayer/NetworkManager';
import { StateInterpolator } from '../../multiplayer/StateInterpolator';
import type { NetworkPlayer } from '../../multiplayer/types';
import { VirtualJoystick } from '../controls/VirtualJoystick';
import { Player } from '../entities/Player';
import { sound } from '../systems/SoundSystem';

export class MultiplayerScene extends Phaser.Scene {
  private readonly avatars = new Map<string, Player>();
  private readonly interpolator = new StateInterpolator();
  private joystick?: VirtualJoystick;
  private keys?: Phaser.Types.Input.Keyboard.CursorKeys; private space?: Phaser.Input.Keyboard.Key;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private sequence = 0; private sendAccumulator = 0; private dashQueued = false; private transferEvent = 0; private eliminatedId = '';

  public constructor() { super('MultiplayerScene'); }
  public create(): void {
    const arena = SHARED_ARENAS.find((item) => item.id === network.room?.state.arenaId) ?? SHARED_ARENAS[0]!;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x101328).fillRoundedRect(34, 34, 652, 832, 24).lineStyle(5, 0x353b68).strokeRoundedRect(34, 34, 652, 832, 24);
    for (const wall of arena.obstacles) graphics.fillStyle(0x353b68).fillRoundedRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height, 14);
    const root = document.getElementById('joystick'); const ring = document.getElementById('joystick-ring'); const knob = document.getElementById('joystick-knob');
    if (root && ring && knob) this.joystick = new VirtualJoystick(root, ring, knob);
    this.keys = this.input.keyboard?.createCursorKeys();
    this.space = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    document.getElementById('dash-button')?.addEventListener('pointerdown', this.queueDash);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.joystick?.destroy(); document.getElementById('dash-button')?.removeEventListener('pointerdown', this.queueDash); this.clearPlayers(); });
  }

  public update(_time: number, delta: number): void {
    const room = network.room; if (!room) return;
    const state = room.state; const local = state.players.get(room.sessionId);
    const seen = new Set<string>();
    state.players.forEach((player) => { seen.add(player.id); this.syncPlayer(player, player.id === room.sessionId, delta); });
    for (const [id, avatar] of this.avatars) if (!seen.has(id)) { avatar.destroy(); this.avatars.delete(id); this.interpolator.remove(id); }
    if (local?.alive && state.phase === 'PLAYING') this.sendControls(delta, local);
    this.updateHud(state, local);
    if (state.transferEventId !== this.transferEvent) { this.transferEvent = state.transferEventId; sound.play('transfer'); this.cameras.main.shake(80, 0.002); this.toast('PASS!'); }
    if (state.lastEliminatedId && state.lastEliminatedId !== this.eliminatedId) { this.eliminatedId = state.lastEliminatedId; sound.play('explosion'); this.toast(`${state.players.get(this.eliminatedId)?.name ?? 'PLAYER'} BLEW UP!`); }
  }

  private syncPlayer(player: NetworkPlayer, isLocal: boolean, delta: number): void {
    let avatar = this.avatars.get(player.id);
    if (!avatar) {
      avatar = new Player(this, { id: player.id, name: player.name, color: player.color, spawn: { x: player.x, y: player.y }, alive: true, hasBomb: false, protectedUntil: 0, isLocal });
      avatar.body!.enable = false; this.avatars.set(player.id, avatar);
    }
    if (!player.alive) { if (avatar.playerState.alive) avatar.eliminate(); return; }
    const point = this.interpolator.update(player, isLocal ? 0.48 : 0.28);
    avatar.setPosition(point.x, point.y); avatar.setBombState(network.room?.state.bombHolderId === player.id);
    const velocityLength = Math.hypot(player.vx, player.vy);
    if (velocityLength > 1) avatar.lastDirection.set(player.vx / velocityLength, player.vy / velocityLength);
    avatar.updateVisuals(delta, Math.max(0, (network.room!.state.bombEndsAt - network.room!.state.serverTime) / ONLINE_BALANCE.bombDurationMs), network.room!.state.serverTime);
  }

  private sendControls(delta: number, local: NetworkPlayer): void {
    let direction = this.joystick?.getDirection() ?? { x: 0, y: 0 };
    const keyX = Number(this.keys?.right.isDown || this.wasd?.D?.isDown) - Number(this.keys?.left.isDown || this.wasd?.A?.isDown);
    const keyY = Number(this.keys?.down.isDown || this.wasd?.S?.isDown) - Number(this.keys?.up.isDown || this.wasd?.W?.isDown);
    if (keyX || keyY) { const length = Math.hypot(keyX, keyY); direction = { x: keyX / length, y: keyY / length }; }
    if (this.space && Phaser.Input.Keyboard.JustDown(this.space)) this.dashQueued = true;
    this.sendAccumulator += delta;
    if (this.sendAccumulator >= 1000 / ONLINE_BALANCE.inputRate) {
      network.sendInput({ seq: ++this.sequence, x: direction.x, y: direction.y, dash: this.dashQueued });
      this.sendAccumulator = 0; this.dashQueued = false;
    }
    const ratio = Phaser.Math.Clamp((local.dashCooldownUntil - network.room!.state.serverTime) / ONLINE_BALANCE.dashCooldownMs, 0, 1);
    const button = document.getElementById('dash-button') as HTMLButtonElement | null;
    button?.classList.toggle('is-cooling', ratio > 0); if (button) button.disabled = ratio > 0;
    document.getElementById('dash-progress')?.style.setProperty('--cooldown', `${ratio * 360}deg`);
    const text = document.getElementById('dash-cooldown'); if (text) text.textContent = ratio ? `${Math.ceil(ratio * 5)}s` : 'READY';
  }

  private updateHud(state: NonNullable<typeof network.room>['state'], local?: NetworkPlayer): void {
    const alive: NetworkPlayer[] = []; state.players.forEach((player) => { if (player.alive) alive.push(player); });
    const remaining = Math.max(0, state.bombEndsAt - state.serverTime);
    const timer = document.getElementById('timer'); if (timer) { timer.textContent = state.phase === 'STARTING' ? `${Math.ceil((state.phaseEndsAt - state.serverTime) / 1000)}` : (remaining / 1000).toFixed(1); timer.classList.toggle('is-urgent', remaining <= 5000 && state.phase === 'PLAYING'); }
    const players = document.getElementById('players-left'); if (players) players.textContent = `${alive.length} players`;
    const holder = state.players.get(state.bombHolderId); const holderEl = document.getElementById('bomb-holder'); if (holderEl) holderEl.textContent = `Bomb: ${holder?.name ?? '—'}`;
    const round = document.getElementById('round-number'); if (round) round.textContent = `ROUND ${state.round}`;
    const status = document.getElementById('round-status'); if (status) status.textContent = !local?.alive ? "YOU'RE OUT — SPECTATING" : state.phase.replace('_', ' ');
    if (state.phase === 'MATCH_END') window.dispatchEvent(new CustomEvent('hotpotato:online-finished', { detail: { winner: state.players.get(state.winnerId), isHost: local?.host } }));
  }

  private readonly queueDash = (event: Event): void => { event.preventDefault(); this.dashQueued = true; sound.play('dash'); };
  private toast(message: string): void { const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = message; toast.classList.add('is-visible'); this.time.delayedCall(900, () => toast.classList.remove('is-visible')); }
  private clearPlayers(): void { for (const avatar of this.avatars.values()) avatar.destroy(); this.avatars.clear(); this.interpolator.clear(); }
}
