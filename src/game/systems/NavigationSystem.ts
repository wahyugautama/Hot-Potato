import Phaser from 'phaser';
import type { CollisionSystem } from './CollisionSystem';

interface Node { x: number; y: number; key: string }

export class NavigationSystem {
  private readonly nodes: Node[] = [];
  private readonly step = 72;

  public constructor(private readonly collision: CollisionSystem) {
    for (let y = 90; y <= 810; y += this.step) for (let x = 72; x <= 648; x += this.step) {
      if (collision.isPositionClear(x, y, 31)) this.nodes.push({ x, y, key: `${x}:${y}` });
    }
  }

  public getDirection(from: Phaser.Math.Vector2, to: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    if (this.collision.hasLineOfSight(from, to)) return to.clone().subtract(from).normalize();
    const start = this.nearestNode(from); const goal = this.nearestNode(to);
    if (!start || !goal) return to.clone().subtract(from).normalize();
    const open: Node[] = [start]; const cameFrom = new Map<string, Node>(); const cost = new Map<string, number>([[start.key, 0]]);
    while (open.length > 0) {
      open.sort((a, b) => (cost.get(a.key) ?? Infinity) + this.distance(a, goal) - ((cost.get(b.key) ?? Infinity) + this.distance(b, goal)));
      const current = open.shift()!;
      if (current.key === goal.key) break;
      this.neighbors(current).forEach((next) => {
        const nextCost = (cost.get(current.key) ?? 0) + this.distance(current, next);
        if (nextCost >= (cost.get(next.key) ?? Infinity)) return;
        cost.set(next.key, nextCost); cameFrom.set(next.key, current); if (!open.includes(next)) open.push(next);
      });
    }
    let waypoint = goal; let previous = cameFrom.get(waypoint.key);
    while (previous && previous.key !== start.key) { waypoint = previous; previous = cameFrom.get(waypoint.key); }
    return new Phaser.Math.Vector2(waypoint.x - from.x, waypoint.y - from.y).normalize();
  }

  public getSafePoint(threat: Phaser.Math.Vector2, origin: Phaser.Math.Vector2, crowd: Phaser.Math.Vector2[]): Phaser.Math.Vector2 {
    return this.nodes.reduce((best, node) => {
      const point = new Phaser.Math.Vector2(node.x, node.y);
      const score = point.distance(threat) * 1.3 - point.distance(origin) * 0.35 + Math.min(...crowd.map((other) => point.distance(other)), 260) * 0.45;
      return score > best.score ? { point, score } : best;
    }, { point: origin.clone(), score: -Infinity }).point;
  }

  private nearestNode(point: Phaser.Math.Vector2): Node | undefined { return this.nodes.reduce<Node | undefined>((best, node) => !best || this.distance(node, point) < this.distance(best, point) ? node : best, undefined); }
  private neighbors(node: Node): Node[] { return this.nodes.filter((candidate) => Math.abs(candidate.x - node.x) + Math.abs(candidate.y - node.y) <= this.step + 1 && candidate.key !== node.key && this.collision.hasLineOfSight(new Phaser.Math.Vector2(node.x, node.y), new Phaser.Math.Vector2(candidate.x, candidate.y), 31)); }
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number { return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y); }
}
