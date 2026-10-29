import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { MultiplayerScene } from './scenes/MultiplayerScene';

export const WORLD_WIDTH = 720;
export const WORLD_HEIGHT = 900;
export const ARENA_MARGIN = 34;
export const PLAYER_RADIUS = 26;
export const BALANCE = {
  playerSpeed: 210,
  acceleration: 1800,
  deceleration: 2400,
  dashMultiplier: 2.5,
  dashDurationMs: 180,
  dashCooldownMs: 5000,
  bombDurationMs: 15000,
  transferProtectionMs: 1000,
  botReactionIntervalMs: 180,
  botSpeedMultiplier: 0.98,
  roundTransitionMs: 1500,
} as const;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  backgroundColor: '#101328',
  transparent: false,
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, MultiplayerScene],
  input: { activePointers: 3 },
};
