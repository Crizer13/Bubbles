// ─────────────────────────────────────────────────────────────────────────────
// LevelBuilder.ts — Deep Indigo Cavern: dark purple/indigo background layers,
// rocky platforms with glowing crystals & wooden supports, cyan chasm glow,
// floating dust motes, and hanging vines.
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { createPlatformLedges, PlatformLedge } from './platforms/PlatformLedge';

export interface LevelData {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  movingPlatforms: Phaser.Physics.Arcade.Group;
  spikeHazards: Phaser.Physics.Arcade.StaticGroup;
  glowObjects: Phaser.GameObjects.Rectangle[];
  backgroundTiles: Phaser.GameObjects.GameObject[];
  musicTriggerZone: Phaser.GameObjects.Zone;
  towerBeacon: Phaser.GameObjects.Light;
  levelWidth: number;
  levelHeight: number;
  playerSpawn: { x: number; y: number };
  goalZone: Phaser.GameObjects.Zone;
}

interface MovingPlatformDef {
  x: number;
  y: number;
  w: number;
  h: number;
  moveX: number;
  moveY: number;
  duration: number;
  delay: number;
}

const PALETTE = {
  // Background — deep purple/indigo cavern
  bgTop: 0x0e0818,
  bgMid: 0x1a0e2a,
  bgBottom: 0x281840,
  // Chasm glow
  chasmGlow: 0x44ddff,
  chasmGlowDark: 0x0a1a2e,
  // Platform colors
  stoneBody: 0x1a1428,
  stoneLight: 0x2a1e3e,
  stoneDark: 0x0e0a18,
  // Crystal colors
  crystalBlue: 0x44ddff,
  crystalPurple: 0xbb88ff,
  crystalGreen: 0x66ffaa,
  // Wood
  woodColor: 0x1a1210,
  woodHighlight: 0x2a1a14,
  // Rims and glow
  rimColor: 0x44ddff,
  vineColor: 0x0e2818,
  mossColor: 0x1a3a2a,
};

export function buildLevel(scene: Phaser.Scene): LevelData {
  const LEVEL_W = 4800;
  const LEVEL_H = 1080;

  generateTextures(scene);

  const backgroundTiles: Phaser.GameObjects.GameObject[] = [];
  drawScenery(scene, backgroundTiles, LEVEL_W, LEVEL_H);

  const platforms = scene.physics.add.staticGroup();

  // ── Floor spawn areas (using PlatformLedge for always-visible rim) ───────
  new PlatformLedge(scene, 100, LEVEL_H - 20, { width: 200, height: 40, rimColor: PALETTE.crystalBlue });
  new PlatformLedge(scene, LEVEL_W - 100, LEVEL_H - 20, { width: 200, height: 40, rimColor: PALETTE.crystalBlue });

  // Add all ledges to the physics group individually (PlatformLedge handles its own collider)
  // Left wall
  new PlatformLedge(scene, -20 + 20, LEVEL_H / 2, { width: 40, height: LEVEL_H, rimColor: PALETTE.crystalPurple });
  new PlatformLedge(scene, LEVEL_W + 20 - 20, LEVEL_H / 2, { width: 40, height: LEVEL_H, rimColor: PALETTE.crystalPurple });

  // ── THE TOWER (The Ancient Spire) ── A tall structure at x=2000 ────────
  buildTower(scene, platforms, backgroundTiles, LEVEL_W, LEVEL_H);

  const towerBeaconLight = scene.lights.addLight(2000, 180, 700, PALETTE.crystalBlue, 2.0);

  // ── Platform definitions ────────────────────────────────────────────────
  const defs: [number, number, number, number][] = [
    // Starting area
    [60,  840, 160, 20],
    [120,  860, 200, 20],
    [380,  800, 160, 20],
    [600,  860, 180, 20],
    [850,  760, 160, 20],
    [1050, 820, 180, 20],
    // Mid section
    [1300, 860, 140, 20],
    [1500, 780, 160, 20],
    [1700, 720, 140, 20],
    [1900, 800, 120, 20],
    // Around the tower
    [2100, 740, 160, 20],
    [2300, 680, 140, 20],
    [2500, 780, 180, 20],
    [2700, 720, 140, 20],
    [2900, 800, 160, 20],
    // Right section
    [3100, 860, 130, 20],
    [3300, 780, 140, 20],
    [3500, 840, 160, 20],
    [3700, 760, 120, 20],
    [3900, 820, 140, 20],
    [4100, 860, 160, 20],
    [4400, 800, 180, 20],
    // Upper route
    [350,  520, 140, 16],
    [650,  460, 130, 16],
    [950,  520, 150, 16],
    [1250, 480, 120, 16],
    [1550, 440, 140, 16],
    [1850, 500, 120, 16],
    [2150, 460, 130, 16],
    [2500, 520, 150, 16],
    [2850, 460, 120, 16],
    [3150, 500, 140, 16],
    [3500, 460, 130, 16],
    [3850, 520, 140, 16],
    [4200, 480, 130, 16],
    // Very high shortcuts
    [500,  300, 100, 14],
    [1000, 260, 110, 14],
    [1500, 320, 100, 14],
    [2200, 280, 110, 14],
    [3000, 320, 100, 14],
    [3600, 280, 110, 14],
    [4300, 300, 100, 14],
  ];

  // ── Create visible platforms ──────────────────────────────────────────
  const ledges = createPlatformLedges(scene, platforms, defs);

  // ── Add wooden supports and crystals to key platforms ────────────────────
  const keyPlatformIndices = [0, 2, 4, 6, 9, 12, 16, 20, 22, 25, 29, 35];
  for (const idx of keyPlatformIndices) {
    if (idx < defs.length) {
      const [px, py, pw] = defs[idx];
      const centerX = px + pw / 2;
      const centerY = py + 10; // bottom of platform

      // Wooden support beam under platform
      addWoodenSupport(scene, centerX, centerY + 8, pw * 0.7);

      // Small crystal cluster on platform edge
      addCrystalCluster(scene, centerX - pw / 2 + 8, py - 2, PALETTE.crystalBlue);
      addCrystalCluster(scene, centerX + pw / 2 - 8, py - 2, PALETTE.crystalPurple);
    }
  }

  // ── Moving platforms ───────────────────────────────────────────────────
  const movingPlatformDefs: MovingPlatformDef[] = [
    { x: 450,  y: 650, w: 100, h: 16, moveX: 0,   moveY: -180, duration: 2800, delay: 0 },
    { x: 1400, y: 600, w: 90,  h: 16, moveX: 200, moveY: 0,    duration: 3200, delay: 800 },
    { x: 2600, y: 580, w: 100, h: 16, moveX: 0,   moveY: -150, duration: 2400, delay: 0 },
    { x: 3400, y: 620, w: 90,  h: 16, moveX: -180, moveY: 0,   duration: 3000, delay: 1200 },
    { x: 4000, y: 600, w: 100, h: 16, moveX: 0,   moveY: -200, duration: 2600, delay: 500 },
  ];

  const movingPlatforms = scene.physics.add.group({ allowGravity: false, immovable: true });
  for (const mpDef of movingPlatformDefs) {
    createMovingPlatform(scene, movingPlatforms, mpDef);
  }

  // ── Hazards ────────────────────────────────────────────────────────────
  // No hazards/traps — clean platforming experience
  const spikeHazards = scene.physics.add.staticGroup();

  // ── Glowing crystals ──────────────────────────────────────────────────
  const glowPositions: [number, number][] = [
    [150,  830], [600,  830], [900,  730], [1200, 790], [1500, 750],
    [1800, 690], [2100, 710], [2400, 650], [2700, 750], [3000, 770],
    [3300, 750], [3600, 810], [3900, 790], [4200, 830],
    [650,  430], [1250, 450], [1850, 470], [2500, 490], [3150, 470], [3850, 490],
  ];
  const glowObjects: Phaser.GameObjects.Rectangle[] = [];
  for (const [gx, gy] of glowPositions) {
    addGlowingCrystal(scene, glowObjects, gx, gy);
  }

  // ── Triggers ───────────────────────────────────────────────────────────
  const triggerZone = scene.add.zone(3600, LEVEL_H / 2, 800, LEVEL_H);
  scene.physics.add.existing(triggerZone, true);

  const goalZone = scene.add.zone(LEVEL_W - 100, LEVEL_H / 2, 200, LEVEL_H);
  scene.physics.add.existing(goalZone, true);

  // Goal visual — purple crystal cluster
  const goalGlow = scene.add.rectangle(LEVEL_W - 100, LEVEL_H - 60, 180, 40, PALETTE.crystalPurple, 0.08);
  goalGlow.setDepth(1);
  goalGlow.setPipeline('Light2D');
  scene.tweens.add({ targets: goalGlow, alpha: 0.02, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const goalLabel = scene.add.text(LEVEL_W - 100, LEVEL_H - 65, '✦ EXIT ✦', {
    fontFamily: 'monospace', fontSize: '12px', color: '#bb88ff', align: 'center',
  }).setOrigin(0.5).setDepth(2).setAlpha(0.6);
  scene.tweens.add({ targets: goalLabel, alpha: 0.2, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  return {
    platforms,
    movingPlatforms,
    spikeHazards,
    glowObjects,
    backgroundTiles,
    musicTriggerZone: triggerZone,
    towerBeacon: towerBeaconLight,
    levelWidth: LEVEL_W,
    levelHeight: LEVEL_H,
    playerSpawn: { x: 140, y: 830 },
    goalZone,
  };
}

// ── Wooden Support Beam ────────────────────────────────────────────────────────
function addWoodenSupport(scene: Phaser.Scene, x: number, y: number, width: number): void {
  const beamHeight = 6;

  // Main beam body
  const beam = scene.add.rectangle(x, y, width, beamHeight, PALETTE.woodColor, 1);
  beam.setDepth(-1);
  beam.setPipeline('Light2D');

  // Beam highlight (top edge)
  const highlight = scene.add.rectangle(x, y - beamHeight / 2 + 1, width - 4, 1.5, PALETTE.woodHighlight, 0.5);
  highlight.setDepth(-1);
  highlight.setPipeline('Light2D');

  // Vertical supports at ends
  const supportH = 12;
  for (const side of [-1, 1]) {
    const sx = x + side * (width / 2 - 4);
    const support = scene.add.rectangle(sx, y + beamHeight / 2 + supportH / 2, 4, supportH, PALETTE.woodColor, 1);
    support.setDepth(-1);
    support.setPipeline('Light2D');
  }
}

// ── Crystal Cluster ────────────────────────────────────────────────────────────
function addCrystalCluster(scene: Phaser.Scene, x: number, y: number, color: number): void {
  const size = Phaser.Math.Between(3, 6);
  const height = Phaser.Math.Between(6, 12);

  // Crystal body
  const crystal = scene.add.rectangle(x, y - height / 2, size, height, color, 0.9);
  crystal.setDepth(5);
  crystal.setPipeline('Light2D');

  // Glow aura (no Light2D — always visible!)
  const glow = scene.add.rectangle(x, y - height / 2, size + 8, height + 6, color, 0.08);
  glow.setDepth(4.5);

  // Pulse
  scene.tweens.add({
    targets: crystal,
    scaleX: { from: 1, to: 0.8 },
    scaleY: { from: 1, to: 1.2 },
    alpha: { from: 0.9, to: 0.5 },
    duration: Phaser.Math.Between(800, 1500),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

// ── Glowing Crystal (full sized) ───────────────────────────────────────────────
function addGlowingCrystal(
  scene: Phaser.Scene,
  objects: Phaser.GameObjects.Rectangle[],
  x: number,
  y: number,
): void {
  const colors = [PALETTE.crystalBlue, PALETTE.crystalPurple, PALETTE.crystalGreen];
  const glowColor = Phaser.Utils.Array.GetRandom(colors);

  // Light for Light2D system
  const crystalLight = scene.lights.addLight(x, y, 100, glowColor, 1.0);
  scene.tweens.add({
    targets: crystalLight,
    intensity: { from: 1.0, to: 0.4 },
    duration: Phaser.Math.Between(800, 1500),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Crystal body
  const gem = scene.add.rectangle(x, y, 6, 10, glowColor, 0.9);
  gem.setDepth(5);
  gem.setPipeline('Light2D');
  objects.push(gem);

  // Halo glow
  const halo = scene.add.rectangle(x, y, 24, 24, glowColor, 0.1);
  halo.setDepth(4);
  halo.setPipeline('Light2D');
  scene.tweens.add({
    targets: halo,
    scaleX: 1.8,
    scaleY: 1.8,
    alpha: 0.02,
    duration: Phaser.Math.Between(1500, 2500),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

// ── Tower Builder ──────────────────────────────────────────────────────────────
function buildTower(
  scene: Phaser.Scene,
  platforms: Phaser.Physics.Arcade.StaticGroup,
  tiles: Phaser.GameObjects.GameObject[],
  w: number,
  h: number,
): void {
  const towerX = 2000;
  const towerBaseY = h - 10;
  const towerHeight = 600;
  const towerW = 120;

  // Main structure — dark indigo stone
  const towerBody = scene.add.rectangle(towerX, towerBaseY - towerHeight / 2, towerW, towerHeight, 0x0e0a18, 1);
  towerBody.setDepth(-2);
  tiles.push(towerBody);

  // Stone lines
  for (let row = 0; row < 12; row++) {
    const lineY = towerBaseY - 30 - row * 45;
    const line = scene.add.rectangle(towerX, lineY, towerW - 8, 1, 0x2a1e3e, 0.3);
    line.setDepth(-1);
    tiles.push(line);
  }

  // Glowing purple windows
  for (let winRow = 0; winRow < 5; winRow++) {
    const winY = towerBaseY - 70 - winRow * 90;
    for (let side = -1; side <= 1; side += 2) {
      const win = scene.add.rectangle(towerX + side * 25, winY, 12, 18, 0x1a0e2a, 0.7);
      win.setDepth(-1);
      tiles.push(win);
      const winGlow = scene.add.rectangle(towerX + side * 25, winY, 35, 35, PALETTE.crystalPurple, 0.04);
      winGlow.setDepth(-1);
      tiles.push(winGlow);
    }
  }

  // Tower top beacon platform
  const beaconPlat = scene.add.rectangle(towerX, towerBaseY - towerHeight - 8, towerW + 40, 10, 0x0e0a18, 1);
  beaconPlat.setDepth(-1);
  tiles.push(beaconPlat);

  // Beacon fixture — cyan glow
  const beaconFixture = scene.add.rectangle(towerX, towerBaseY - towerHeight - 30, 20, 14, 0x1a3050, 0.9);
  beaconFixture.setDepth(2);
  beaconFixture.setPipeline('Light2D');
  tiles.push(beaconFixture);

  const beaconGlow = scene.add.rectangle(towerX, towerBaseY - towerHeight - 30, 40, 40, PALETTE.crystalBlue, 0.15);
  beaconGlow.setDepth(2);
  beaconGlow.setPipeline('Light2D');

  // Beam cone
  const beamCone = scene.add.triangle(
    towerX, towerBaseY - towerHeight - 30,
    0, 0, 500, -25, 500, 25,
    PALETTE.crystalBlue, 0.05,
  );
  beamCone.setOrigin(0, 0.5);
  beamCone.setDepth(1);
  beamCone.setPipeline('Light2D');
  tiles.push(beamCone);
  scene.tweens.add({ targets: beamCone, angle: { from: -25, to: 25 }, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // Tower platforms (with visible rim via PlatformLedge)
  new PlatformLedge(scene, towerX, towerBaseY - towerHeight - 8, { width: towerW + 40, height: 10 });
  new PlatformLedge(scene, towerX - 35, towerBaseY - 140, { width: 70, height: 14 });
  new PlatformLedge(scene, towerX - 35, towerBaseY - 260, { width: 70, height: 14 });
  new PlatformLedge(scene, towerX - 35, towerBaseY - 380, { width: 70, height: 14 });

  // Add tower platforms to physics group
  const towerPlatDefs: [number, number, number, number][] = [
    [towerX - (towerW + 40) / 2, towerBaseY - towerHeight - 8, towerW + 40, 10],
    [towerX - 35 - 35, towerBaseY - 140, 70, 14],
    [towerX - 35 - 35, towerBaseY - 260, 70, 14],
    [towerX - 35 - 35, towerBaseY - 380, 70, 14],
  ];
  // We add colliders manually for these since PlatformLedge creates its own
  for (const [tx, ty, tw, th] of towerPlatDefs) {
    const p = platforms.create(tx + tw / 2, ty + th / 2, 'platform_tex') as Phaser.Physics.Arcade.Sprite;
    p.setDisplaySize(tw, th);
    p.refreshBody();
    p.setVisible(false);
    p.setPipeline('Light2D');
  }

  // Hanging vines from tower
  for (let v = -1; v <= 1; v += 2) {
    const vineX = towerX + v * 55;
    for (let segment = 0; segment < 8; segment++) {
      const segY = towerBaseY - towerHeight + 30 + segment * 16;
      const vineSeg = scene.add.rectangle(vineX, segY, 2, 10, PALETTE.vineColor, Phaser.Math.FloatBetween(0.2, 0.4));
      vineSeg.setDepth(-1);
      tiles.push(vineSeg);
      scene.tweens.add({
        targets: vineSeg,
        x: vineX + Phaser.Math.Between(-4, 4),
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}

// ── Moving Platform ────────────────────────────────────────────────────────────
function createMovingPlatform(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  def: MovingPlatformDef,
): void {
  const cx = def.x + def.w / 2;
  const cy = def.y + def.h / 2;

  // Visible rim strip (no Light2D — always visible!)
  const rim = scene.add.rectangle(cx, cy - def.h / 2 + 1.5, def.w + 4, 3, PALETTE.crystalBlue, 0.6);
  rim.setDepth(0.3);

  // Glow bar
  const glow = scene.add.rectangle(cx, cy - def.h / 2 + 3, def.w + 6, 4, PALETTE.crystalBlue, 0.3);
  glow.setDepth(0.4);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.3, to: 0.6 },
    scaleY: { from: 1, to: 1.5 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Physics body
  const plat = scene.physics.add.sprite(cx, cy, 'platform_tex');
  plat.setDisplaySize(def.w, def.h);
  plat.setImmovable(true);
  (plat.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  plat.setPipeline('Light2D');
  group.add(plat);

  // Tween the physics body AND the rim/glow together
  scene.tweens.add({
    targets: [plat, rim, glow],
    x: def.x + def.moveX + def.w / 2,
    y: def.y + def.moveY + def.h / 2,
    duration: def.duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: def.delay,
  });
}

// ── Spikes ────────────────────────────────────────────────────────────────────
function addSpike(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const spike = group.create(x + w / 2, y + h / 2, 'spike_tex') as Phaser.Physics.Arcade.Sprite;
  spike.setDisplaySize(w, h);
  spike.refreshBody();
  spike.setPipeline('Light2D');
  spike.setDepth(8);
}

// ── Scenery — Dark Fantasy Night ─────────────────────────────────────────────
// Open night sky with stars, a distant kingdom silhouette, and a dark forest.
function drawScenery(
  scene: Phaser.Scene,
  tiles: Phaser.GameObjects.GameObject[],
  w: number,
  h: number,
): void {
  // ══════════════════════════════════════════════════════════════════════
  // 1. NIGHT SKY GRADIENT — deep dark blue → purple horizon
  // ══════════════════════════════════════════════════════════════════════
  const skyGrad = scene.add.graphics();
  skyGrad.setDepth(-12);
  skyGrad.fillGradientStyle(0x050510, 0x050510, 0x0e0a20, 0x1a0e30, 1);
  skyGrad.fillRect(0, 0, w, h * 0.55);

  const horizonGrad = scene.add.graphics();
  horizonGrad.setDepth(-12);
  horizonGrad.fillGradientStyle(0x1a0e30, 0x1a0e30, 0x0e0a18, 0x0e0a18, 1);
  horizonGrad.fillRect(0, h * 0.55, w, h * 0.15);

  // ══════════════════════════════════════════════════════════════════════
  // 2. STARS — scattered across the sky
  // ══════════════════════════════════════════════════════════════════════
  const starColors = [0xffffff, 0xaaccff, 0xddddff, 0xffeedd];
  for (let i = 0; i < 80; i++) {
    const sx = Phaser.Math.Between(0, w);
    const sy = Phaser.Math.Between(5, h * 0.4);
    const size = Phaser.Math.FloatBetween(0.5, 2);
    const color = Phaser.Utils.Array.GetRandom(starColors);
    const alpha = Phaser.Math.FloatBetween(0.3, 0.9);

    const star = scene.add.rectangle(sx, sy, size, size, color, alpha);
    star.setDepth(-11);
    tiles.push(star);

    // Twinkle effect for some stars
    if (i % 3 === 0) {
      scene.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.3 },
        scaleX: { from: 1, to: 1.5 },
        scaleY: { from: 1, to: 1.5 },
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. MOON — pale crescent in the sky
  // ══════════════════════════════════════════════════════════════════════
  const moonX = Phaser.Math.Between(400, w - 400);
  const moonY = Phaser.Math.Between(60, 180);
  const moonGlow = scene.add.rectangle(moonX, moonY, 18, 18, 0xeeddcc, 0.08);
  moonGlow.setDepth(-11);
  tiles.push(moonGlow);
  scene.tweens.add({
    targets: moonGlow,
    alpha: { from: 0.06, to: 0.12 },
    scaleX: { from: 1, to: 1.4 },
    scaleY: { from: 1, to: 1.4 },
    duration: 3000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // ══════════════════════════════════════════════════════════════════════
  // 4. DISTANT KINGDOM SILHOUETTE — castles & towers on the horizon
  // ══════════════════════════════════════════════════════════════════════
  const kingdom = scene.add.graphics();
  kingdom.setDepth(-10);
  kingdom.fillStyle(0x0a0818, 0.7);

  // Draw castle silhouettes across the horizon
  const kingdomHorizon = h * 0.6;
  kingdom.beginPath();
  kingdom.moveTo(0, h);

  // Castle 1 — large main keep
  const c1x = w * 0.25;
  drawCastle(kingdom, c1x, kingdomHorizon, {
    baseW: 160, height: 140, towerH: 60, towerW: 20, hasSpire: true,
  });

  // Castle 2 — smaller tower
  const c2x = w * 0.55;
  drawCastle(kingdom, c2x, kingdomHorizon, {
    baseW: 100, height: 90, towerH: 40, towerW: 16, hasSpire: false,
  });

  // Castle 3 — distant ruins
  const c3x = w * 0.78;
  drawCastle(kingdom, c3x, kingdomHorizon, {
    baseW: 80, height: 70, towerH: 35, towerW: 14, hasSpire: true,
  });

  // Fill the rest of the silhouette
  kingdom.lineTo(w, kingdomHorizon);
  kingdom.lineTo(w, h);
  kingdom.closePath();
  kingdom.fill();

  // ══════════════════════════════════════════════════════════════════════
  // 5. DARK FOREST — silhouetted trees along the horizon
  // ══════════════════════════════════════════════════════════════════════
  const forest = scene.add.graphics();
  forest.setDepth(-9);
  forest.fillStyle(0x0a0a14, 0.6);

  forest.beginPath();
  forest.moveTo(0, kingdomHorizon);

  // Draw tree silhouettes
  const treePositions: number[] = [];
  for (let t = 0; t < 30; t++) {
    treePositions.push(Phaser.Math.Between(0, w));
  }
  treePositions.sort((a, b) => a - b);

  let prevTx = 0;
  for (const tx of treePositions) {
    if (tx - prevTx < 20) continue; // don't overlap
    prevTx = tx;

    const treeH = Phaser.Math.Between(60, 160);
    const treeW = Phaser.Math.Between(20, 45);
    const trunkH = treeH * 0.3;
    const crownH = treeH * 0.7;

    // Trunk
    forest.lineTo(tx, kingdomHorizon - treeH + crownH);
    // Crown — jagged pine shape
    const crownPoints = 4;
    for (let c = 0; c < crownPoints; c++) {
      const cx = tx - treeW / 2 + (treeW / crownPoints) * c + treeW / (crownPoints * 2);
      const cy = kingdomHorizon - treeH + (c / (crownPoints - 1)) * crownH;
      forest.lineTo(cx, cy);
    }
    forest.lineTo(tx + treeW / 2, kingdomHorizon - treeH + crownH);
    forest.lineTo(tx + treeW / 2, kingdomHorizon);
  }

  forest.lineTo(w, kingdomHorizon);
  forest.lineTo(w, h);
  forest.closePath();
  forest.fill();

  // ══════════════════════════════════════════════════════════════════════
  // 6. FOREGROUND TREES — larger, closer, darker
  // ══════════════════════════════════════════════════════════════════════
  const nearForest = scene.add.graphics();
  nearForest.setDepth(-8);
  nearForest.fillStyle(0x060610, 0.5);

  nearForest.beginPath();
  nearForest.moveTo(0, h);

  for (let t = 0; t < 8; t++) {
    const tx = Phaser.Math.Between(0, w);
    const treeH = Phaser.Math.Between(200, 350);
    const treeW = Phaser.Math.Between(50, 90);
    const crownH = treeH * 0.75;

    nearForest.lineTo(tx - treeW / 2, h - treeH + crownH);
    // Larger jagged crown
    const cPts = 5;
    for (let c = 0; c < cPts; c++) {
      const cx = tx - treeW / 2 + (treeW / cPts) * c + treeW / (cPts * 2) + Phaser.Math.Between(-5, 5);
      const cy = h - treeH + (c / (cPts - 1)) * crownH + Phaser.Math.Between(-8, 8);
      nearForest.lineTo(cx, cy);
    }
    nearForest.lineTo(tx + treeW / 2, h - treeH + crownH);
  }

  nearForest.lineTo(w, h);
  nearForest.closePath();
  nearForest.fill();

  // ══════════════════════════════════════════════════════════════════════
  // 7. TWINKLING FIREFLIES — tiny yellow/green lights in the forest
  // ══════════════════════════════════════════════════════════════════════
  for (let i = 0; i < 15; i++) {
    const fx = Phaser.Math.Between(0, w);
    const fy = Phaser.Math.Between(h * 0.5, h - 100);
    const firefly = scene.add.rectangle(fx, fy, 2, 2, 0xeeff88, 0.5);
    firefly.setDepth(-7);
    tiles.push(firefly);

    scene.tweens.add({
      targets: firefly,
      y: fy + Phaser.Math.Between(-40, 40),
      x: fx + Phaser.Math.Between(-30, 30),
      alpha: { from: 0.5, to: 0 },
      duration: Phaser.Math.Between(2000, 4000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 2000),
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // 8. BOTTOM CHASM GLOW — soft cyan rising from below
  // ══════════════════════════════════════════════════════════════════════
  const chasmGlow = scene.add.graphics();
  chasmGlow.setDepth(-6);

  for (let g = 0; g < 6; g++) {
    const gx = (g / 6) * w + Phaser.Math.Between(-30, 30);
    const gw = Phaser.Math.Between(120, 250);
    const gh = Phaser.Math.Between(150, 300);

    chasmGlow.fillStyle(PALETTE.crystalBlue, 0.06);
    chasmGlow.fillEllipse(gx, h, gw, gh);
  }

  chasmGlow.fillStyle(PALETTE.crystalBlue, 0.03);
  chasmGlow.fillRect(0, h - 40, w, 40);
}

// ── Helper: Draw a castle silhouette ─────────────────────────────────────────
function drawCastle(
  g: Phaser.GameObjects.Graphics,
  x: number,
  groundY: number,
  def: { baseW: number; height: number; towerH: number; towerW: number; hasSpire: boolean },
): void {
  const hw = def.baseW / 2;

  // Main keep body
  g.lineTo(x - hw, groundY - def.height);
  g.lineTo(x - hw, groundY - def.height);
  g.lineTo(x + hw, groundY - def.height);
  g.lineTo(x + hw, groundY);

  // Tower on left
  const leftTowerX = x - hw + def.towerW / 2;
  g.lineTo(x - hw, groundY);
  g.lineTo(x - hw, groundY - def.height - def.towerH);
  g.lineTo(x - hw + def.towerW, groundY - def.height - def.towerH);
  g.lineTo(x - hw + def.towerW, groundY - def.height);

  // Tower on right
  g.lineTo(x + hw, groundY - def.height);
  g.lineTo(x + hw, groundY - def.height - def.towerH);
  g.lineTo(x + hw - def.towerW, groundY - def.height - def.towerH);
  g.lineTo(x + hw - def.towerW, groundY - def.height);

  // Spire on main keep
  if (def.hasSpire) {
    g.lineTo(x - 8, groundY - def.height);
    g.lineTo(x, groundY - def.height - 40);
    g.lineTo(x + 8, groundY - def.height);
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
  plat.setPipeline('Light2D');
}

function generateTextures(scene: Phaser.Scene): void {
  // ── Platform texture — dark indigo rock with crystal veins ──────────────
  if (!scene.textures.exists('platform_tex')) {
    const g = scene.add.graphics();

    // Base — dark indigo stone
    g.fillGradientStyle(0x1a1428, 0x1a1428, 0x281840, 0x281840, 1);
    g.fillRect(0, 0, 64, 64);

    // Crystal vein patterns
    g.lineStyle(1.5, PALETTE.crystalBlue, 0.12);
    for (let v = 0; v < 3; v++) {
      const startX = Phaser.Math.Between(5, 55);
      const startY = Phaser.Math.Between(5, 55);
      g.beginPath();
      g.moveTo(startX, startY);
      g.lineTo(startX + Phaser.Math.Between(-8, 8), startY + Phaser.Math.Between(8, 16));
      g.lineTo(startX + Phaser.Math.Between(-12, 12), startY + Phaser.Math.Between(16, 28));
      g.strokePath();
    }

    // Small crystal nodes
    g.fillStyle(PALETTE.crystalBlue, 0.08);
    for (let n = 0; n < 5; n++) {
      g.fillCircle(Phaser.Math.Between(8, 56), Phaser.Math.Between(8, 56), Phaser.Math.Between(2, 4));
    }

    // Stone cracks
    g.lineStyle(1, 0x0a0810, 0.15);
    for (let c = 0; c < 3; c++) {
      const cy = Phaser.Math.Between(10, 55);
      g.beginPath();
      g.moveTo(Phaser.Math.Between(5, 30), cy);
      g.lineTo(Phaser.Math.Between(30, 60), cy + Phaser.Math.Between(-3, 3));
      g.strokePath();
    }

    // Dark purple moss patches
    g.fillStyle(PALETTE.mossColor, 0.15);
    for (let m = 0; m < 5; m++) {
      g.fillCircle(Phaser.Math.Between(4, 60), Phaser.Math.Between(2, 8), Phaser.Math.Between(3, 6));
    }

    // Edge highlight — blue/purple rim
    g.fillGradientStyle(PALETTE.crystalBlue, PALETTE.crystalBlue, 0x1a1428, 0x1a1428, 0.15);
    g.fillRect(0, 0, 64, 2);

    g.generateTexture('platform_tex', 64, 64);
    g.destroy();
  }

  // ── Player texture — Glowing Plush Sheep ──────────────────────────────
  if (!scene.textures.exists('player_tex')) {
    const g = scene.add.graphics();
    const s = 28;

    g.fillStyle(0x88ddff, 0.08);
    g.fillCircle(s / 2, s / 2, s / 2 + 4);

    g.fillStyle(0xeeeee8, 1);
    g.fillRoundedRect(3, 8, 22, 18, 7);

    g.fillStyle(0xddd8d0, 0.6);
    g.fillCircle(7, 12, 4); g.fillCircle(14, 11, 5); g.fillCircle(20, 12, 4);
    g.fillCircle(8, 17, 3); g.fillCircle(16, 18, 4); g.fillCircle(22, 16, 3);

    g.fillStyle(0xf0ece0, 1); g.fillCircle(14, 7, 7);
    g.fillStyle(0x222230, 1); g.fillCircle(11, 6, 1.8); g.fillCircle(17, 6, 1.8);
    g.fillStyle(0xffffff, 1); g.fillCircle(10, 5.5, 0.8); g.fillCircle(16, 5.5, 0.8);
    g.fillStyle(0xe8d8c0, 1); g.fillEllipse(6, 2, 4, 3); g.fillEllipse(22, 2, 4, 3);
    g.fillStyle(0xddd0c0, 1); g.fillRect(5, 24, 5, 5); g.fillRect(18, 24, 5, 5);
    g.fillStyle(0x88ddff, 0.15); g.fillCircle(14, 16, 6);

    g.generateTexture('player_tex', s, s + 1);
    g.destroy();
  }

  // ── Spike texture — jagged debris ──────────────────────────────────────
  if (!scene.textures.exists('spike_tex')) {
    const g = scene.add.graphics();
    const size = 48;
    const spikeCount = 5;
    const spacing = size / spikeCount;

    g.fillStyle(0x0a0810, 1); g.fillRect(0, size - 6, size, 6);
    g.fillStyle(0x1a1428, 1);
    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spacing + spacing / 2;
      g.fillTriangle(sx - 5, size - 6, sx + 5, size - 6, sx, size - 6 - 18);
    }
    g.fillStyle(0x281840, 0.4);
    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spacing + spacing / 2;
      g.fillTriangle(sx - 2, size - 6, sx + 2, size - 6, sx, size - 6 - 14);
    }
    g.generateTexture('spike_tex', size, size);
    g.destroy();
  }
}