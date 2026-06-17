// ─────────────────────────────────────────────────────────────────────────────
// PhaserGame.ts — Creates and returns the Phaser.Game instance
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { GameScene } from './GameScene';

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL, // Required for Lights2D + PostFX
    width: 960,
    height: 540,
    parent,
    backgroundColor: '#0a0a14',
    pixelArt: false,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 }, // We handle gravity in the controller
        debug: false,
      },
    },
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return new Phaser.Game(config);
}
