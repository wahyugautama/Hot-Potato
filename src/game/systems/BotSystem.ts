import Phaser from 'phaser';
import { BALANCE } from '../config';
import type { Player } from '../entities/Player';
import type { BotPersonality } from '../../types/game';
import type { CollisionSystem } from './CollisionSystem';
import { NavigationSystem } from './NavigationSystem';

interface BotMemory { direction: Phaser.Math.Vector2; nextThinkAt: number; stuckAt: number; lastPosition: Phaser.Math.Vector2 }

const PROFILES: Record<BotPersonality, { dashRange: number; dangerRange: number; randomness: number }> = {
  aggressive: { dashRange: 230, dangerRange: 270, randomness: 0.03 },
  cautious: { dashRange: 120, dangerRange: 390, randomness: 0.01 },
  unpredictable: { dashRange: 185, dangerRange: 330, randomness: 0.16 },
};

export class BotSystem {
  private readonly memories = new Map<string, BotMemory>();
  private readonly navigation: NavigationSystem;

  public constructor(private readonly collision: CollisionSystem, private readonly onDash: (player: Player) => void) { this.navigation = new NavigationSystem(collision); }

  public update(time: number, bots: Player[], allPlayers: Player[], holder: Player | null): void {
    const alivePositions = allPlayers.filter((player) => player.playerState.alive).map((player) => new Phaser.Math.Vector2(player.x, player.y));
    bots.filter((bot) => bot.playerState.alive).forEach((bot) => {
      const memory = this.getMemory(bot, time);
      if (time >= memory.nextThinkAt) {
        this.think(bot, allPlayers, holder, memory, alivePositions, time);
        memory.nextThinkAt = time + BALANCE.botReactionIntervalMs + Phaser.Math.Between(-25, 45);
      }
      bot.setMovement({ x: memory.direction.x * BALANCE.botSpeedMultiplier, y: memory.direction.y * BALANCE.botSpeedMultiplier });
      bot.updateMovement(time);
    });
  }

  private think(bot: Player, allPlayers: Player[], holder: Player | null, memory: BotMemory, crowd: Phaser.Math.Vector2[], time: number): void {
    const origin = new Phaser.Math.Vector2(bot.x, bot.y); const personality = bot.playerState.personality ?? 'unpredictable'; const profile = PROFILES[personality];
    let destination = origin.clone(); let dash = false;
    if (bot.playerState.hasBomb) {
      const eligible = allPlayers.filter((player) => player !== bot && player.playerState.alive && time >= player.playerState.protectedUntil);
      const target = this.getNearest(bot, eligible);
      if (target) { destination.set(target.x, target.y); const distance = Phaser.Math.Distance.Between(bot.x, bot.y, target.x, target.y); dash = distance < profile.dashRange && (personality === 'aggressive' || distance < 145); }
    } else if (holder?.playerState.alive) {
      const threat = new Phaser.Math.Vector2(holder.x, holder.y); const distance = origin.distance(threat);
      destination = this.navigation.getSafePoint(threat, origin, crowd.filter((point) => point.distance(origin) > 8));
      dash = distance < profile.dangerRange * (personality === 'cautious' ? 0.72 : 0.55);
    }
    memory.direction.copy(this.navigation.getDirection(origin, destination));
    if (Math.random() < profile.randomness) memory.direction.rotate(Phaser.Math.FloatBetween(-0.8, 0.8));
    const moved = origin.distance(memory.lastPosition);
    if (moved < 7 && time >= memory.stuckAt) { memory.direction.rotate(Math.PI * 0.65); memory.stuckAt = time + 500; }
    memory.lastPosition.copy(origin);
    const ahead = origin.clone().add(memory.direction.clone().scale(54));
    if (!this.collision.isPositionClear(ahead.x, ahead.y, 30)) memory.direction.rotate(personality === 'unpredictable' ? -Math.PI / 2 : Math.PI / 2);
    if (dash && bot.tryDash(time)) this.onDash(bot);
  }

  private getMemory(bot: Player, time: number): BotMemory {
    let memory = this.memories.get(bot.playerState.id);
    if (!memory) { memory = { direction: new Phaser.Math.Vector2(1, 0), nextThinkAt: time, stuckAt: time + 700, lastPosition: new Phaser.Math.Vector2(bot.x, bot.y) }; this.memories.set(bot.playerState.id, memory); }
    return memory;
  }

  private getNearest(origin: Player, targets: Player[]): Player | null {
    return targets.reduce<Player | null>((nearest, player) => !nearest || Phaser.Math.Distance.Squared(origin.x, origin.y, player.x, player.y) < Phaser.Math.Distance.Squared(origin.x, origin.y, nearest.x, nearest.y) ? player : nearest, null);
  }
}
