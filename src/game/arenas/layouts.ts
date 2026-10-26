import type { Vector2Like } from '../../types/game';

export interface ObstacleDefinition { x: number; y: number; width: number; height: number }
export interface ArenaLayout { id: string; name: string; obstacles: ObstacleDefinition[]; spawns: Vector2Like[] }

const CORNER_SPAWNS: Vector2Like[] = [{ x: 120, y: 130 }, { x: 600, y: 130 }, { x: 120, y: 770 }, { x: 600, y: 770 }];

export const ARENA_LAYOUTS: ArenaLayout[] = [
  {
    id: 'classic', name: 'CLASSIC', spawns: CORNER_SPAWNS,
    obstacles: [
      { x: 270, y: 350, width: 92, height: 52 }, { x: 450, y: 350, width: 92, height: 52 },
      { x: 270, y: 570, width: 92, height: 52 }, { x: 450, y: 570, width: 92, height: 52 },
    ],
  },
  {
    id: 'crossroads', name: 'CROSSROADS', spawns: CORNER_SPAWNS,
    obstacles: [
      { x: 360, y: 230, width: 190, height: 42 }, { x: 360, y: 670, width: 190, height: 42 },
      { x: 180, y: 450, width: 44, height: 210 }, { x: 540, y: 450, width: 44, height: 210 },
      { x: 360, y: 450, width: 94, height: 94 },
    ],
  },
  {
    id: 'islands', name: 'ISLANDS', spawns: CORNER_SPAWNS,
    obstacles: [
      { x: 205, y: 285, width: 128, height: 86 }, { x: 515, y: 285, width: 128, height: 86 },
      { x: 205, y: 615, width: 128, height: 86 }, { x: 515, y: 615, width: 128, height: 86 },
      { x: 360, y: 450, width: 82, height: 150 },
    ],
  },
];

export const getRandomArena = (): ArenaLayout => ARENA_LAYOUTS[Math.floor(Math.random() * ARENA_LAYOUTS.length)] ?? ARENA_LAYOUTS[0]!;
