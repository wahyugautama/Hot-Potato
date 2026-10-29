export interface Point { x: number; y: number }
export interface Obstacle { x: number; y: number; width: number; height: number }
export interface SharedArena { id: string; name: string; obstacles: Obstacle[]; spawns: Point[] }

const spawns: Point[] = [
  { x: 105, y: 120 }, { x: 615, y: 120 }, { x: 105, y: 780 },
  { x: 615, y: 780 }, { x: 105, y: 450 }, { x: 615, y: 450 },
];

export const SHARED_ARENAS: SharedArena[] = [
  { id: 'classic', name: 'CLASSIC', spawns, obstacles: [
    { x: 270, y: 350, width: 92, height: 52 }, { x: 450, y: 350, width: 92, height: 52 },
    { x: 270, y: 570, width: 92, height: 52 }, { x: 450, y: 570, width: 92, height: 52 },
  ] },
  { id: 'crossroads', name: 'CROSSROADS', spawns, obstacles: [
    { x: 360, y: 230, width: 190, height: 42 }, { x: 360, y: 670, width: 190, height: 42 },
    { x: 180, y: 450, width: 44, height: 210 }, { x: 540, y: 450, width: 44, height: 210 },
    { x: 360, y: 450, width: 94, height: 94 },
  ] },
  { id: 'islands', name: 'ISLANDS', spawns, obstacles: [
    { x: 205, y: 285, width: 128, height: 86 }, { x: 515, y: 285, width: 128, height: 86 },
    { x: 205, y: 615, width: 128, height: 86 }, { x: 515, y: 615, width: 128, height: 86 },
    { x: 360, y: 450, width: 82, height: 150 },
  ] },
];
