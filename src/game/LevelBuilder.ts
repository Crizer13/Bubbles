// ─────────────────────────────────────────────────────────────────────────────
// LevelBuilder.ts — Procedural level geometry for the demo
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';

export interface LevelData {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  glowObjects: Phaser.GameObjects.Rectangle[];
  backgroundTiles: Phaser.GameObjects.Rectangle[];
  musicTriggerZone: Phaser.GameObjects.Zone;
  levelWidth: number;
  levelHeight: number;
  playerSpawn: { x: number; y: number };
}

/**
 * Creates all the platform rectangles, glow orbs, and the music-trigger zone.
 * Everything is built from Graphics → textures so we don't need external assets.
 */
export function buildLevel(scene: Phaser.Scene): LevelData {
  const LEVEL_W = 3200;
  const LEVEL_H = 900;

  // ── Generate textures procedurally ─────────────────────────────────────
  generateTextures(scene);

  // ── Background scenery ─────────────────────────────────────────────────
  const backgroundTiles: Phaser.GameObjects.Rectangle[] = [];
  drawScenery(scene, backgroundTiles, LEVEL_W, LEVEL_H);

  // ── Platforms ──────────────────────────────────────────────────────────
  const platforms = scene.physics.add.staticGroup();

  // Ground spans the whole level
  addPlatform(platforms, 0, LEVEL_H - 32, LEVEL_W, 64, 'platform_tex');

  // Left wall
  addPlatform(platforms, -16, 0, 32, LEVEL_H, 'platform_tex');
  // Right wall
  addPlatform(platforms, LEVEL_W - 16, 0, 32, LEVEL_H, 'platform_tex');

  // Floating platforms – hand-placed for a nice flow
  const defs: [number, number, number, number][] = [
    [200,  680, 260, 20],
    [520,  560, 200, 20],
    [800,  640, 300, 20],
    [1050, 500, 200, 20],
    [1300, 600, 260, 20],
    [1550, 460, 200, 20],
    [1750, 570, 180, 20],
    [1950, 400, 240, 20],
    [2200, 530, 200, 20],
    [2450, 650, 320, 20],
    [2750, 480, 200, 20],
    [3000, 580, 180, 20],
    // Upper route
    [350,  400, 160, 16],
    [650,  320, 180, 16],
    [1000, 280, 200, 16],
    [1400, 330, 160, 16],
    [1700, 260, 200, 16],
    [2050, 220, 180, 16],
    [2400, 310, 220, 16],
    [2700, 260, 160, 16],
  ];

  for (const [x, y, w, h] of defs) {
    addPlatform(platforms, x, y, w, h, 'platform_tex');
  }

  // ── Glow objects (decorative orbs with light) ──────────────────────────
  const glowPositions: [number, number][] = [
    [300,  650],
    [840,  610],
    [1320, 570],
    [1750, 540],
    [2220, 500],
    [2760, 450],
    // Upper route orbs
    [660,  290],
    [1400, 300],
    [2060, 190],
  ];

  const glowObjects: Phaser.GameObjects.Rectangle[] = [];
  for (const [gx, gy] of glowPositions) {
    const orb = scene.add.rectangle(gx, gy, 14, 14, 0x88ccff, 0.9);
    orb.setDepth(5);
    orb.setPipeline('Light2D');
    glowObjects.push(orb);

    // Outer glow ring
    const glowRing = scene.add.rectangle(gx, gy, 28, 28, 0x88ccff, 0.15);
    glowRing.setDepth(4);
    glowRing.setPipeline('Light2D');
    scene.tweens.add({
      targets: [glowRing],
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── Music trigger zone (the "intense" area, towards the right) ────────
  const triggerZone = scene.add.zone(2400, LEVEL_H / 2, 800, LEVEL_H);
  scene.physics.add.existing(triggerZone, true); // static body

  return {
    platforms,
    glowObjects,
    backgroundTiles,
    musicTriggerZone: triggerZone,
    levelWidth: LEVEL_W,
    levelHeight: LEVEL_H,
    playerSpawn: { x: 120, y: LEVEL_H - 100 },
  };
}

// ── Scenery ───────────────────────────────────────────────────────────────────

function drawScenery(
  scene: Phaser.Scene,
  tiles: Phaser.GameObjects.Rectangle[],
  w: number,
  h: number,
): void {
  // Distant mountain silhouettes
  const mountainLayers = [
    { y: h - 120, height: 100, color: 0x19192e, alpha: 0.5, segments: 20 },
    { y: h - 90, height: 70, color: 0x12121e, alpha: 0.6, segments: 30 },
  ];

  for (const layer of mountainLayers) {
    const step = w / layer.segments;
    for (let i = 0; i < layer.segments; i++) {
      const x = i * step;
      const segW = step + 4;
      const variation = Phaser.Math.Between(-20, 20);
      const mtn = scene.add.rectangle(x, layer.y + variation, segW, layer.height, layer.color, layer.alpha);
      mtn.setDepth(-8);
      mtn.setOrigin(0, 0);
      tiles.push(mtn);
    }
  }

  // Ground decoration — subtle highlights
  for (let i = 0; i < 40; i++) {
    const gx = Phaser.Math.Between(0, w);
    const gy = h - Phaser.Math.Between(8, 20);
    const gw = Phaser.Math.Between(4, 16);
    const gh = Phaser.Math.Between(2, 4);
    const deco = scene.add.rectangle(gx, gy, gw, gh, 0x3a3a5a, Phaser.Math.FloatBetween(0.1, 0.3));
    deco.setDepth(-7);
    tiles.push(deco);
  }

  // Floating particles / fireflies
  for (let i = 0; i < 30; i++) {
    const px = Phaser.Math.Between(0, w);
    const py = Phaser.Math.Between(100, h - 100);
    const size = Phaser.Math.Between(2, 4);
    const colors = [0x4fc3f7, 0xb388ff, 0xff80ab, 0x69f0ae];
    const color = Phaser.Utils.Array.GetRandom(colors);
    const particle = scene.add.rectangle(px, py, size, size, color, Phaser.Math.FloatBetween(0.15, 0.35));
    particle.setDepth(-6);
    particle.setPipeline('Light2D');
    tiles.push(particle);

    scene.tweens.add({
      targets: particle,
      y: py - Phaser.Math.Between(30, 80),
      x: px + Phaser.Math.Between(-40, 40),
      alpha: 0,
      duration: Phaser.Math.Between(3000, 6000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 3000),
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addPlatform(
  group: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  y: number,
  w: number,
  h: number,
  texture: string,
): void {
  const plat = group.create(x + w / 2, y + h / 2, texture) as Phaser.Physics.Arcade.Sprite;
  plat.setDisplaySize(w, h);
  plat.refreshBody();
  // Enable Lights2D pipeline on platforms
  plat.setPipeline('Light2D');
}

function generateTextures(scene: Phaser.Scene): void {
  // Platform texture — glossy stone-like slab with gradient
  if (!scene.textures.exists('platform_tex')) {
    const g = scene.add.graphics();

    // Base fill — dark slate
    g.fillGradientStyle(0x2a2a3e, 0x2a2a3e, 0x3a3a52, 0x3a3a52, 1);
    g.fillRect(0, 0, 64, 64);

    // Top highlight (glossy edge)
    g.fillGradientStyle(0x4a4a6a, 0x4a4a6a, 0x2a2a3e, 0x2a2a3e, 0.4);
    g.fillRect(0, 0, 64, 3);

    // Subtle grid lines
    g.lineStyle(1, 0x555577, 0.1);
    g.strokeRect(0.5, 0.5, 63, 63);

    // Edge bevel highlights
    g.fillStyle(0x5a5a7a, 0.2);
    g.fillRect(0, 0, 64, 1);
    g.fillRect(0, 0, 1, 64);

    g.generateTexture('platform_tex', 64, 64);
    g.destroy();
  }

  // Player texture — glossy character sprite with detail
  if (!scene.textures.exists('player_tex')) {
    const g = scene.add.graphics();

    // Body gradient — cyan/blue
    g.fillGradientStyle(0x4fc3f7, 0x4fc3f7, 0x0288d1, 0x0288d1, 1);
    g.fillRoundedRect(0, 0, 24, 32, 4);

    // Glossy highlight on top
    g.fillGradientStyle(0xffffff, 0xffffff, 0x4fc3f7, 0x4fc3f7, 0.3);
    g.fillRoundedRect(2, 1, 20, 10, 3);

    // Eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 12, 3);
    g.fillCircle(21, 12, 3);
    g.fillStyle(0x1a1a3a, 1);
    g.fillCircle(16, 12, 1.5);
    g.fillCircle(21, 12, 1.5);

    // Mouth / visor detail
    g.lineStyle(1, 0x81d4fa, 0.6);
    g.beginPath();
    g.moveTo(7, 22);
    g.lineTo(17, 22);
    g.strokePath();

    // Feet
    g.fillStyle(0x01579b, 1);
    g.fillRect(2, 28, 8, 4);
    g.fillRect(14, 28, 8, 4);

    g.generateTexture('player_tex', 24, 32);
    g.destroy();
  }
}