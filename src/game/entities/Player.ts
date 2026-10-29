import Phaser from 'phaser';
import { BALANCE, PLAYER_RADIUS } from '../config';
import { isDashReady } from '../logic/rules';
import type { PlayerState, Vector2Like } from '../../types/game';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public readonly playerState: PlayerState;
  public desiredDirection: Vector2Like = { x: 0, y: 0 };
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly bombIcon: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Arc;
  private readonly directionDot: Phaser.GameObjects.Arc;
  public readonly lastDirection = new Phaser.Math.Vector2(0, 1);
  private readonly inputDirection = new Phaser.Math.Vector2();
  private dashUntil = 0;
  private dashCooldownUntil = 0;
  private dashDirection = new Phaser.Math.Vector2();
  private elapsed = 0;

  public constructor(scene: Phaser.Scene, state: PlayerState) {
    const textureKey = `player-${state.id}`;
    if (!scene.textures.exists(textureKey)) {
      const graphic = scene.make.graphics({ x: 0, y: 0 }, false);
      graphic.fillStyle(state.color).fillCircle(PLAYER_RADIUS + 4, PLAYER_RADIUS + 4, PLAYER_RADIUS);
      graphic.fillStyle(0xffffff, 0.16).fillCircle(PLAYER_RADIUS - 4, PLAYER_RADIUS - 5, PLAYER_RADIUS * 0.45);
      graphic.generateTexture(textureKey, (PLAYER_RADIUS + 4) * 2, (PLAYER_RADIUS + 4) * 2);
      graphic.destroy();
    }
    super(scene, state.spawn.x, state.spawn.y, textureKey);
    this.playerState = state;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(PLAYER_RADIUS, 4, 4).setCollideWorldBounds(true).setDepth(4);
    this.setMaxVelocity(BALANCE.playerSpeed, BALANCE.playerSpeed);
    this.setDrag(BALANCE.deceleration, BALANCE.deceleration);

    this.glow = scene.add.circle(this.x, this.y, PLAYER_RADIUS + 9).setStrokeStyle(5, 0xffd95a, 1).setDepth(3).setVisible(false);
    this.directionDot = scene.add.circle(this.x, this.y, 5, 0xffffff, 0.9).setDepth(5);
    this.nameLabel = scene.add.text(this.x, this.y + (state.id === 'you' || state.isLocal ? -42 : 40), state.id === 'you' || state.isLocal ? '▼ YOU' : state.name, {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ffffff', stroke: '#090b18', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(6);

    const bombBody = scene.add.circle(0, 0, 12, 0x161725).setStrokeStyle(3, 0xffd95a);
    const fuse = scene.add.line(0, 0, 6, -10, 12, -18, 0xff795d, 1).setLineWidth(3);
    const spark = scene.add.circle(12, -18, 4, 0xffd95a);
    this.bombIcon = scene.add.container(this.x, this.y - 52, [bombBody, fuse, spark]).setDepth(8).setVisible(false);
  }

  public setMovement(direction: Vector2Like): void {
    if (!this.playerState.alive) return;
    this.inputDirection.set(direction.x, direction.y);
    if (this.inputDirection.lengthSq() > 1) this.inputDirection.normalize();
    this.desiredDirection = { x: this.inputDirection.x, y: this.inputDirection.y };
    if (this.inputDirection.lengthSq() > 0.02) this.lastDirection.copy(this.inputDirection).normalize();
  }

  public updateMovement(time: number): void {
    if (!this.playerState.alive) return;
    if (time < this.dashUntil) {
      const speed = BALANCE.playerSpeed * BALANCE.dashMultiplier;
      this.setAcceleration(0).setDrag(0).setMaxVelocity(speed).setVelocity(this.dashDirection.x * speed, this.dashDirection.y * speed);
      return;
    }
    this.setMaxVelocity(BALANCE.playerSpeed).setDrag(BALANCE.deceleration);
    if (this.inputDirection.lengthSq() > 0.01) {
      this.setDrag(0).setAcceleration(this.inputDirection.x * BALANCE.acceleration, this.inputDirection.y * BALANCE.acceleration);
    } else this.setAcceleration(0);
  }

  public tryDash(time: number): boolean {
    if (!this.playerState.alive || !isDashReady(time, this.dashCooldownUntil) || time < this.dashUntil) return false;
    this.dashDirection.copy(this.inputDirection.lengthSq() > 0.02 ? this.inputDirection : this.lastDirection).normalize();
    this.dashUntil = time + BALANCE.dashDurationMs; this.dashCooldownUntil = time + BALANCE.dashCooldownMs;
    return true;
  }

  public getDashCooldownRatio(time: number): number { return Phaser.Math.Clamp((this.dashCooldownUntil - time) / BALANCE.dashCooldownMs, 0, 1); }
  public isDashing(time: number): boolean { return time < this.dashUntil; }

  public setBombState(hasBomb: boolean): void {
    this.playerState.hasBomb = hasBomb;
    this.glow.setVisible(hasBomb && this.playerState.alive);
    this.bombIcon.setVisible(hasBomb && this.playerState.alive);
  }

  public eliminate(): void {
    this.playerState.alive = false;
    this.playerState.hasBomb = false;
    this.setVelocity(0, 0).setAcceleration(0).disableBody(true, true);
    this.nameLabel.setVisible(false);
    this.glow.setVisible(false);
    this.bombIcon.setVisible(false);
    this.directionDot.setVisible(false);
  }

  public updateVisuals(delta: number, bombRatio: number, time = 0): void {
    if (!this.playerState.alive) return;
    this.elapsed += delta;
    const moving = Boolean(this.body && this.body.velocity.lengthSq() > 80);
    const bob = Math.sin(this.elapsed * (moving ? 0.013 : 0.005)) * (moving ? 1.8 : 1);
    const dashStretch = this.isDashing(time) ? 0.2 : 0;
    this.setScale(1 + bob * 0.008 + dashStretch, 1 - bob * 0.006 - dashStretch * 0.45);
    this.setRotation(this.isDashing(time) ? this.lastDirection.angle() : 0);
    this.nameLabel.setPosition(this.x, this.y + (this.playerState.id === 'you' || this.playerState.isLocal ? -42 : 40));
    this.directionDot.setPosition(this.x + this.lastDirection.x * 17, this.y + this.lastDirection.y * 17);
    this.glow.setPosition(this.x, this.y);
    this.bombIcon.setPosition(this.x, this.y - 51 + bob);
    if (this.playerState.hasBomb) {
      const speed = Phaser.Math.Linear(0.005, 0.018, 1 - bombRatio);
      const pulse = 1 + Math.sin(this.elapsed * speed) * 0.14;
      this.glow.setScale(pulse).setAlpha(0.75 + Math.sin(this.elapsed * speed) * 0.2);
      this.bombIcon.setScale(pulse);
    }
  }

  public destroy(fromScene?: boolean): void {
    this.nameLabel.destroy(); this.glow.destroy(); this.bombIcon.destroy(); this.directionDot.destroy();
    super.destroy(fromScene);
  }
}
