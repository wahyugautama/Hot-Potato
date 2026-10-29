import type { NetworkPlayer } from './types';

export interface RenderPoint { x: number; y: number }

export class StateInterpolator {
  private readonly points = new Map<string, RenderPoint>();
  public update(player: NetworkPlayer, alpha: number): RenderPoint {
    const current = this.points.get(player.id) ?? { x: player.x, y: player.y };
    current.x += (player.x - current.x) * alpha; current.y += (player.y - current.y) * alpha;
    this.points.set(player.id, current); return current;
  }
  public remove(id: string): void { this.points.delete(id); }
  public clear(): void { this.points.clear(); }
}
