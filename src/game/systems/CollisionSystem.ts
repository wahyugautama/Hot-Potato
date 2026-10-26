import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ArenaLayout, ObstacleDefinition } from '../arenas/layouts';
import { ARENA_MARGIN, WORLD_HEIGHT, WORLD_WIDTH } from '../config';

export class CollisionSystem {
  public readonly obstacles: Phaser.Physics.Arcade.StaticGroup;

  private readonly definitions: ObstacleDefinition[];

  public constructor(private readonly scene: Phaser.Scene, players: Player[], layout: ArenaLayout) {
    this.obstacles = scene.physics.add.staticGroup();
    this.definitions = layout.obstacles;
    layout.obstacles.forEach((obstacle) => this.createObstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height));
    players.forEach((player) => scene.physics.add.collider(player, this.obstacles));
  }

  private createObstacle(x: number, y: number, width: number, height: number): void {
    const key = `obstacle-${width}-${height}`;
    if (!this.scene.textures.exists(key)) {
      const graphic = this.scene.make.graphics({ x: 0, y: 0 }, false);
      graphic.fillStyle(0x272b50).fillRoundedRect(0, 0, width, height, 18);
      graphic.lineStyle(4, 0x3c426f).strokeRoundedRect(2, 2, width - 4, height - 4, 16);
      graphic.generateTexture(key, width, height); graphic.destroy();
    }
    this.obstacles.create(x, y, key).refreshBody();
  }

  public isPositionClear(x: number, y: number, padding = 34): boolean {
    const arena = new Phaser.Geom.Rectangle(ARENA_MARGIN + padding, ARENA_MARGIN + padding, WORLD_WIDTH - (ARENA_MARGIN + padding) * 2, WORLD_HEIGHT - (ARENA_MARGIN + padding) * 2);
    if (!arena.contains(x, y)) return false;
    return this.obstacles.getChildren().every((child) => {
      const obstacle = child as Phaser.Physics.Arcade.Sprite;
      return !Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(x - padding, y - padding, padding * 2, padding * 2), obstacle.getBounds(),
      );
    });
  }

  public hasLineOfSight(from: Phaser.Math.Vector2, to: Phaser.Math.Vector2, padding = 30): boolean {
    const steps = Math.max(2, Math.ceil(from.distance(to) / 34));
    for (let index = 1; index < steps; index += 1) {
      const ratio = index / steps;
      if (!this.isPositionClear(Phaser.Math.Linear(from.x, to.x, ratio), Phaser.Math.Linear(from.y, to.y, ratio), padding)) return false;
    }
    return true;
  }

  public validateSpawns(layout: ArenaLayout): boolean {
    return layout.spawns.every((spawn) => this.isPositionClear(spawn.x, spawn.y, 32)) && this.definitions.length > 0;
  }
}
