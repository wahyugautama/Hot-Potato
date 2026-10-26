import Phaser from 'phaser';
import { ARENA_MARGIN, WORLD_HEIGHT, WORLD_WIDTH } from '../config';
import { Player } from '../entities/Player';
import { VirtualJoystick } from '../controls/VirtualJoystick';
import { CollisionSystem } from '../systems/CollisionSystem';
import { BotSystem } from '../systems/BotSystem';
import { BombSystem } from '../systems/BombSystem';
import { HUD } from '../../ui/HUD';
import { GAME_EVENTS, type PlayerState } from '../../types/game';
import { getRandomArena } from '../arenas/layouts';
import { sound } from '../systems/SoundSystem';

export class GameScene extends Phaser.Scene {
  private players: Player[] = [];
  private human!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private joystick!: VirtualJoystick;
  private collision!: CollisionSystem;
  private bots!: BotSystem;
  private bomb!: BombSystem;
  private hud!: HUD;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private dashButton!: HTMLButtonElement;
  private dangerVignette!: Phaser.GameObjects.Graphics;
  private lastTickSecond = 16;

  public constructor() { super('GameScene'); }

  public create(): void {
    this.physics.world.setBounds(ARENA_MARGIN, ARENA_MARGIN, WORLD_WIDTH - ARENA_MARGIN * 2, WORLD_HEIGHT - ARENA_MARGIN * 2);
    const layout = getRandomArena(); this.drawArena();
    const states: PlayerState[] = [
      { id: 'you', name: 'YOU', color: 0x55e6a5, spawn: layout.spawns[0]!, alive: true, hasBomb: false, protectedUntil: 0 },
      { id: 'nova', name: 'NOVA', color: 0xff668c, spawn: layout.spawns[1]!, alive: true, hasBomb: false, protectedUntil: 0, personality: 'aggressive' },
      { id: 'zip', name: 'ZIP', color: 0x64a8ff, spawn: layout.spawns[2]!, alive: true, hasBomb: false, protectedUntil: 0, personality: 'cautious' },
      { id: 'mox', name: 'MOX', color: 0xffc857, spawn: layout.spawns[3]!, alive: true, hasBomb: false, protectedUntil: 0, personality: 'unpredictable' },
    ];
    this.players = states.map((state) => new Player(this, state)); this.human = this.players[0];
    this.collision = new CollisionSystem(this, this.players, layout);
    if (!this.collision.validateSpawns(layout)) throw new Error(`Invalid arena spawns: ${layout.id}`);
    this.players.forEach((player, index) => this.players.slice(index + 1).forEach((other) => this.physics.add.collider(player, other)));
    this.bots = new BotSystem(this.collision, (player) => this.createDashEffect(player)); this.bomb = new BombSystem(this.players); this.hud = new HUD(); this.hud.bind(this.bomb); this.hud.show(); this.hud.setPlayers(4); this.hud.setArena(layout.name);
    this.bomb.on(GAME_EVENTS.PLAYER_ELIMINATED, (id: string, _name: string, x: number, y: number) => { sound.play('explosion'); this.createExplosion(x, y); this.hud.setPlayers(this.players.filter((p) => p.playerState.alive).length); if (id === 'you') this.hud.setSpectating(); });
    this.bomb.on(GAME_EVENTS.BOMB_TRANSFERRED, (from: Player, to: Player) => this.createTransferEffect(from, to));
    this.bomb.on(GAME_EVENTS.ROUND_STARTED, () => { this.lastTickSecond = 16; });
    this.bomb.on(GAME_EVENTS.MATCH_FINISHED, () => { sound.play('victory'); this.createCelebration(); });
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable');
    this.cursors = keyboard.createCursorKeys();
    this.wasd = { up: keyboard.addKey('W'), down: keyboard.addKey('S'), left: keyboard.addKey('A'), right: keyboard.addKey('D') };
    this.dashKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const joystickRoot = document.getElementById('joystick'); const ring = document.getElementById('joystick-ring'); const knob = document.getElementById('joystick-knob'); const dashButton = document.getElementById('dash-button');
    if (!joystickRoot || !ring || !knob || !(dashButton instanceof HTMLButtonElement)) throw new Error('Control elements missing');
    this.joystick = new VirtualJoystick(joystickRoot, ring, knob); this.dashButton = dashButton; this.dashButton.addEventListener('pointerdown', this.handleDashButton, { passive: false });
    this.dangerVignette = this.add.graphics().setDepth(30).setScrollFactor(0).setVisible(false);
    this.dangerVignette.lineStyle(18, 0xff465e, 0.36).strokeRoundedRect(12, 12, WORLD_WIDTH - 24, WORLD_HEIGHT - 24, 28);
    this.bomb.start(this.time.now);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  public update(time: number, delta: number): void {
    if (!this.bomb || this.bomb.phase === 'finished') return;
    if (this.bomb.phase === 'intermission') { this.players.forEach((player) => { player.setMovement({ x: 0, y: 0 }); player.updateMovement(time); }); this.bomb.update(time, Math.min(delta, 100)); return; }
    const joystick = this.joystick.getDirection();
    const keyboardX = Number(this.cursors.right.isDown || this.wasd.right.isDown) - Number(this.cursors.left.isDown || this.wasd.left.isDown);
    const keyboardY = Number(this.cursors.down.isDown || this.wasd.down.isDown) - Number(this.cursors.up.isDown || this.wasd.up.isDown);
    this.human.setMovement(keyboardX || keyboardY ? { x: keyboardX, y: keyboardY } : joystick);
    this.human.updateMovement(time);
    if (Phaser.Input.Keyboard.JustDown(this.dashKey)) this.tryHumanDash();
    this.bots.update(time, this.players.slice(1), this.players, this.bomb.getHolder());
    this.bomb.update(time, Math.min(delta, 100));
    this.checkTransfers(time);
    const ratio = this.bomb.remainingMs / this.bomb.roundDurationMs;
    this.players.forEach((player) => player.updateVisuals(delta, ratio, time));
    this.hud.updateDash(this.human.getDashCooldownRatio(time));
    this.updateTension();
  }

  private checkTransfers(time: number): void {
    this.players.forEach((player, index) => this.players.slice(index + 1).forEach((other) => {
      if (!player.playerState.alive || !other.playerState.alive) return;
      const touching = this.physics.overlap(player, other);
      const pair = [player.playerState.id, other.playerState.id].sort().join(':');
      this.bomb.setContactState(pair, touching);
      if (touching) this.bomb.tryTransfer(player, other, time);
    }));
  }

  private readonly handleDashButton = (event: PointerEvent): void => { event.preventDefault(); event.stopPropagation(); this.tryHumanDash(); };
  private tryHumanDash(): void { if (this.human.tryDash(this.time.now)) this.createDashEffect(this.human); }

  private createDashEffect(player: Player): void {
    sound.play('dash');
    for (let index = 1; index <= 4; index += 1) {
      const ghost = this.add.circle(player.x - player.lastDirection.x * index * 14, player.y - player.lastDirection.y * index * 14, 22 - index * 2, player.playerState.color, 0.28 / index).setDepth(2);
      this.tweens.add({ targets: ghost, alpha: 0, scale: 0.45, duration: 210 + index * 25, onComplete: () => ghost.destroy() });
    }
    const burst = this.add.circle(player.x, player.y, 30).setStrokeStyle(4, player.playerState.color, 0.8).setDepth(8);
    this.tweens.add({ targets: burst, scale: 2, alpha: 0, duration: 230, onComplete: () => burst.destroy() });
  }

  private createTransferEffect(from: Player, to: Player): void {
    sound.play('transfer'); this.cameras.main.shake(90, 0.004);
    [from, to].forEach((player) => this.tweens.add({ targets: player, alpha: 0.25, yoyo: true, repeat: 1, duration: 65 }));
    const line = this.add.line(0, 0, from.x, from.y, to.x, to.y, 0xffe56b, 0.9).setOrigin(0).setLineWidth(7).setDepth(12);
    const text = this.add.text((from.x + to.x) / 2, (from.y + to.y) / 2 - 18, 'PASS!', { fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: '#11142b', strokeThickness: 5 }).setOrigin(0.5).setDepth(13);
    this.tweens.add({ targets: [line, text], alpha: 0, y: '-=22', duration: 430, onComplete: () => { line.destroy(); text.destroy(); } });
  }

  private updateTension(): void {
    const seconds = Math.ceil(this.bomb.remainingMs / 1000); const finalFive = this.bomb.remainingMs <= 5000;
    this.dangerVignette.setVisible(finalFive).setAlpha(0.2 + (1 - this.bomb.remainingMs / 5000) * 0.55);
    if (seconds < this.lastTickSecond && seconds <= 10) { sound.play('tick'); this.lastTickSecond = seconds; }
    if (this.bomb.remainingMs <= 1000) this.cameras.main.shake(45, 0.0025, false);
  }

  private drawArena(): void {
    this.add.graphics().setDepth(0).fillStyle(0x101328).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
      .fillStyle(0x181c38).fillRoundedRect(ARENA_MARGIN, ARENA_MARGIN, WORLD_WIDTH - ARENA_MARGIN * 2, WORLD_HEIGHT - ARENA_MARGIN * 2, 34)
      .lineStyle(5, 0x343a67).strokeRoundedRect(ARENA_MARGIN, ARENA_MARGIN, WORLD_WIDTH - ARENA_MARGIN * 2, WORLD_HEIGHT - ARENA_MARGIN * 2, 34);
    const grid = this.add.graphics().setAlpha(0.16).lineStyle(2, 0x7880b8);
    for (let x = 90; x < WORLD_WIDTH; x += 72) grid.lineBetween(x, 50, x, 850);
    for (let y = 90; y < WORLD_HEIGHT; y += 72) grid.lineBetween(50, y, 670, y);
  }

  private createExplosion(x: number, y: number): void {
    const rings = [0xffd95a, 0xff795d, 0xffffff].map((color, i) => this.add.circle(x, y, 18 + i * 7, color, 0.9 - i * 0.2).setDepth(20));
    this.tweens.add({ targets: rings, scale: 5, alpha: 0, duration: 620, ease: 'Cubic.easeOut', onComplete: () => rings.forEach((ring) => ring.destroy()) });
    this.cameras.main.shake(280, 0.018);
  }

  private createCelebration(): void {
    const colors = [0x55e6a5, 0xff668c, 0x64a8ff, 0xffc857];
    for (let index = 0; index < 24; index += 1) {
      const particle = this.add.rectangle(Phaser.Math.Between(80, 640), -20, 8, 16, colors[index % colors.length]).setDepth(25).setAngle(Phaser.Math.Between(0, 180));
      this.tweens.add({ targets: particle, y: WORLD_HEIGHT + 30, x: `+=${Phaser.Math.Between(-90, 90)}`, angle: '+=360', duration: Phaser.Math.Between(1200, 2200), delay: Phaser.Math.Between(0, 500), onComplete: () => particle.destroy() });
    }
  }

  private handleShutdown(): void { this.joystick?.destroy(); this.dashButton?.removeEventListener('pointerdown', this.handleDashButton); this.hud?.destroy(this.bomb); }
}
