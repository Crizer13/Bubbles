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
  bgTop: 0x0e0818,
  bgMid: 0x1a0e2a,
  bgBottom: 0x281840,
  chasmGlow: 0x44ddff,
  chasmGlowDark: 0x0a1a2e,
  stoneBody: 0x1a1428,
  stoneLight: 0x2a1e3e,
  stoneDark: 0x0e0a18,
  crystalBlue: 0x44ddff,
  crystalPurple: 0xbb88ff,
  crystalGreen: 0x66ffaa,
  woodColor: 0x1a1210,
  woodHighlight: 0x2a1a14,
  rimColor: 0x44ddff,
  vineColor: 0x0e2818,
  mossColor: 0x1a3a2a,
};

// ── Terrain profile — connected ground with elevation changes ─────────────────
// Designed as a natural progression path from left to right.
// Uses dense waypoints for smooth curves and flat plateaus.
interface TerrainPoint {
  x: number;
  surfaceY: number;
}

const TERRAIN_PROFILE: TerrainPoint[] = [
  // ══════ Starting zone — flat, wide ground for comfort ══════
  { x: 0,    surfaceY: 860 },
  { x: 100,  surfaceY: 860 },
  { x: 200,  surfaceY: 860 },
  { x: 280,  surfaceY: 860 },

  // ══════ Gentle climbing curve — smooth ramp up ══════
  { x: 340,  surfaceY: 845 },
  { x: 400,  surfaceY: 830 },
  { x: 460,  surfaceY: 815 },
  { x: 520,  surfaceY: 805 },
  { x: 580,  surfaceY: 798 },

  // ══════ First plateau — flat, walkable area ══════
  { x: 640,  surfaceY: 793 },
  { x: 720,  surfaceY: 792 },
  { x: 800,  surfaceY: 795 },

  // ══════ Gentle curve down into a valley ══════
  { x: 860,  surfaceY: 808 },
  { x: 920,  surfaceY: 822 },
  { x: 980,  surfaceY: 835 },
  { x: 1040, surfaceY: 845 },

  // ══════ Valley floor — flat bottom ══════
  { x: 1100, surfaceY: 848 },
  { x: 1180, surfaceY: 848 },

  // ══════ Climb back up — smooth curve ══════
  { x: 1240, surfaceY: 838 },
  { x: 1300, surfaceY: 822 },
  { x: 1360, surfaceY: 805 },
  { x: 1420, surfaceY: 793 },

  // ══════ Second plateau ══════
  { x: 1480, surfaceY: 786 },
  { x: 1560, surfaceY: 785 },

  // ══════ Gentle descent ══════
  { x: 1620, surfaceY: 790 },
  { x: 1680, surfaceY: 800 },
  { x: 1740, surfaceY: 810 },
  { x: 1800, surfaceY: 818 },

  // ══════ Rise toward tower ══════
  { x: 1860, surfaceY: 808 },
  { x: 1920, surfaceY: 792 },
  { x: 1980, surfaceY: 778 },
  { x: 2040, surfaceY: 772 },

  // ══════ Tower area — flat under the spire ══════
  { x: 2100, surfaceY: 770 },
  { x: 2180, surfaceY: 770 },

  // ══════ Post-tower: steep drop into a ravine ══════
  { x: 2240, surfaceY: 780 },
  { x: 2300, surfaceY: 796 },
  { x: 2360, surfaceY: 810 },
  { x: 2420, surfaceY: 822 },
  { x: 2480, surfaceY: 830 },
  { x: 2540, surfaceY: 833 },

  // ══════ Ravine bottom ══════
  { x: 2600, surfaceY: 832 },
  { x: 2680, surfaceY: 830 },

  // ══════ Climb out of ravine ══════
  { x: 2740, surfaceY: 818 },
  { x: 2800, surfaceY: 800 },
  { x: 2860, surfaceY: 785 },
  { x: 2920, surfaceY: 776 },

  // ══════ Third plateau ══════
  { x: 2980, surfaceY: 774 },
  { x: 3060, surfaceY: 775 },

  // ══════ Winding path — rolling curves ══════
  { x: 3120, surfaceY: 782 },
  { x: 3180, surfaceY: 792 },
  { x: 3240, surfaceY: 800 },
  { x: 3300, surfaceY: 805 },
  { x: 3360, surfaceY: 798 },
  { x: 3420, surfaceY: 786 },
  { x: 3480, surfaceY: 780 },

  // ══════ Short flat section ══════
  { x: 3540, surfaceY: 778 },
  { x: 3620, surfaceY: 779 },

  // ══════ Final ascent to exit area ══════
  { x: 3680, surfaceY: 785 },
  { x: 3740, surfaceY: 795 },
  { x: 3800, surfaceY: 808 },
  { x: 3860, surfaceY: 815 },
  { x: 3920, surfaceY: 818 },

  // ══════ Flat exit plateau ══════
  { x: 3980, surfaceY: 818 },
  { x: 4060, surfaceY: 817 },
  { x: 4140, surfaceY: 815 },

  // ══════ Elevator drop-off — ground ends here, elevator wall ══════
  { x: 4200, surfaceY: 816 },
  { x: 4280, surfaceY: 820 },
  { x: 4350, surfaceY: 822 },
];

export function buildLevel(scene: Phaser.Scene): LevelData {
  const LEVEL_W = 4800;
  const LEVEL_H = 1080;

  generateTextures(scene);

  const backgroundTiles: Phaser.GameObjects.GameObject[] = [];
  drawScenery(scene, backgroundTiles, LEVEL_W, LEVEL_H);

  const platforms = scene.physics.add.staticGroup();

  // ── Build continuous terrain from profile ──────────────────────────────
  buildConnectedTerrain(scene, platforms, TERRAIN_PROFILE, LEVEL_H);

  // ── Floor spawn area rim (always-visible start platform) ──────────────
  new PlatformLedge(scene, 100, TERRAIN_PROFILE[0].surfaceY, { width: 220, height: 40, rimColor: PALETTE.crystalBlue });
  // A small rim near the goal area too
  new PlatformLedge(scene, LEVEL_W - 140, TERRAIN_PROFILE[TERRAIN_PROFILE.length - 2].surfaceY, { width: 160, height: 30, rimColor: PALETTE.crystalPurple });

  // ── THE TOWER (The Ancient Spire) ── rises from the terrain at x=2000 ──
  buildTower(scene, platforms, backgroundTiles, LEVEL_W, LEVEL_H);

  const towerBeaconLight = scene.lights.addLight(2000, 180, 700, PALETTE.crystalBlue, 2.0);

  // ── Moving platforms — assist crossing wider gaps ─────────────────────
  const movingPlatformDefs: MovingPlatformDef[] = [
    // Valley crossing assist near x=1000 (climb back up from valley)
    { x: 1000, y: 700, w: 90, h: 16, moveX: 0,   moveY: -120, duration: 2600, delay: 0 },
    // Ravine crossing after tower near x=2600
    { x: 2550, y: 680, w: 100, h: 16, moveX: 200, moveY: 0,    duration: 3000, delay: 500 },
    // High shortcut near x=3400
    { x: 3400, y: 640, w: 90,  h: 16, moveX: -180, moveY: 0,   duration: 2800, delay: 800 },
    // Final ascent assist near x=3900
    { x: 3900, y: 660, w: 100, h: 16, moveX: 0,   moveY: -160, duration: 2400, delay: 0 },
    // ══════ ELEVATOR — big vertical lift at the end of the level ══════
    // Starts at exit plateau height (~820), goes all the way down to ~200
    { x: 4450, y: 822, w: 120, h: 24, moveX: 0, moveY: 620, duration: 4000, delay: 500 },
  ];

  const movingPlatforms = scene.physics.add.group({ allowGravity: false, immovable: true });
  for (const mpDef of movingPlatformDefs) {
    createMovingPlatform(scene, movingPlatforms, mpDef);
  }

  // ── Elevator shaft — vertical walls and decoration ────────────────────
  buildElevatorShaft(scene, backgroundTiles, LEVEL_W, LEVEL_H, movingPlatformDefs[4]);

  // ── Hazards ────────────────────────────────────────────────────────────
  const spikeHazards = scene.physics.add.staticGroup();

  // ── Glowing crystals along the terrain ────────────────────────────────
  const glowPositions: [number, number][] = [
    [150,  830], [500,  770], [900,  820], [1200, 750], [1500, 740],
    [1800, 770], [2100, 740], [2400, 800], [2700, 770], [3000, 740],
    [3300, 780], [3600, 750], [3900, 750], [4200, 780],
  ];
  const glowObjects: Phaser.GameObjects.Rectangle[] = [];
  for (const [gx, gy] of glowPositions) {
    addGlowingCrystal(scene, glowObjects, gx, gy);
  }

  // ── Triggers ───────────────────────────────────────────────────────────
  const triggerZone = scene.add.zone(3600, LEVEL_H / 2, 800, LEVEL_H);
  scene.physics.add.existing(triggerZone, true);

  // Goal at the BOTTOM of the elevator shaft
  const goalY = 200;
  const goalZone = scene.add.zone(4450, goalY, 160, 60);
  scene.physics.add.existing(goalZone, true);

  // Goal visual — glowing exit at the bottom of the shaft
  const goalGlow = scene.add.rectangle(4450, goalY, 200, 40, PALETTE.crystalPurple, 0.12);
  goalGlow.setDepth(1);
  goalGlow.setPipeline('Light2D');
  scene.tweens.add({ targets: goalGlow, alpha: 0.04, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const goalLabel = scene.add.text(4450, goalY - 10, '✦ THE DEPTHS ✦\n[Elevator Down]', {
    fontFamily: 'monospace', fontSize: '11px', color: '#bb88ff', align: 'center',
  }).setOrigin(0.5).setDepth(2).setAlpha(0.7);
  scene.tweens.add({ targets: goalLabel, alpha: 0.3, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // Platform at the bottom of the shaft so the player can stand
  const bottomPlat = scene.add.rectangle(4450, goalY + 30, 160, 20, PALETTE.stoneBody, 1);
  bottomPlat.setDepth(-2);
  bottomPlat.setPipeline('Light2D');
  const bottomRim = scene.add.rectangle(4450, goalY + 1, 164, 3, PALETTE.crystalPurple, 0.6);
  bottomRim.setDepth(-1.5);
  const bottomCollider = platforms.create(4450, goalY + 30, 'platform_tex') as Phaser.Physics.Arcade.Sprite;
  bottomCollider.setDisplaySize(160, 20);
  bottomCollider.refreshBody();
  bottomCollider.setVisible(false);
  bottomCollider.setPipeline('Light2D');

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
    playerSpawn: { x: 140, y: TERRAIN_PROFILE[0].surfaceY - 40 },
    goalZone,
  };
}

// ── Build connected terrain with elevation changes ───────────────────────────
function buildConnectedTerrain(
  scene: Phaser.Scene,
  platforms: Phaser.Physics.Arcade.StaticGroup,
  profile: TerrainPoint[],
  levelH: number,
): void {
  const CHUNK_W = 32;  // smaller chunks = smoother terrain
  const CHUNK_H = 200;

  for (let i = 0; i < profile.length - 1; i++) {
    const p0 = profile[i];
    const p1 = profile[i + 1];
    const segmentW = p1.x - p0.x;
    const numChunks = Math.max(1, Math.ceil(segmentW / CHUNK_W));

    for (let c = 0; c < numChunks; c++) {
      const t = c / numChunks;
      const surfaceY = lerp(p0.surfaceY, p1.surfaceY, t);
      const cx = p0.x + c * CHUNK_W + CHUNK_W / 2;
      const centerY = surfaceY + CHUNK_H / 2;

      // Stone body
      const body = scene.add.rectangle(cx, centerY, CHUNK_W + 2, CHUNK_H, PALETTE.stoneBody, 1);
      body.setDepth(-2);
      body.setPipeline('Light2D');

      // Visible rim
      const rim = scene.add.rectangle(cx, surfaceY + 1.5, CHUNK_W + 4, 3, PALETTE.crystalBlue, 0.5);
      rim.setDepth(-1.5);

      // Subtle pulsing glow on rim
      const glow = scene.add.rectangle(cx, surfaceY + 3, CHUNK_W + 6, 4, PALETTE.crystalBlue, 0.15);
      glow.setDepth(-1.4);
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.15, to: 0.3 },
        scaleY: { from: 1, to: 1.4 },
        duration: Phaser.Math.Between(600, 1000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Physics collider (invisible)
      const collider = platforms.create(cx, centerY, 'platform_tex') as Phaser.Physics.Arcade.Sprite;
      collider.setDisplaySize(CHUNK_W + 2, CHUNK_H);
      collider.refreshBody();
      collider.setVisible(false);
      collider.setPipeline('Light2D');
    }
  }

  // ── Fill vertical gaps at slope transitions ──────────────────────────
  for (let i = 0; i < profile.length - 1; i++) {
    const p0 = profile[i];
    const p1 = profile[i + 1];
    const diff = p1.surfaceY - p0.surfaceY;

    if (Math.abs(diff) > 4) {
      const fillerX = p0.x;
      const tallerY = Math.min(p0.surfaceY, p1.surfaceY);
      const lowerY = Math.max(p0.surfaceY, p1.surfaceY);
      const fillerH = lowerY - tallerY + 10;

      if (fillerH > 20) {
        const fillerCenterY = tallerY + fillerH / 2;

        const fillerBody = scene.add.rectangle(fillerX, fillerCenterY, 10, fillerH, PALETTE.stoneBody, 1);
        fillerBody.setDepth(-2);
        fillerBody.setPipeline('Light2D');

        const fillerRim = scene.add.rectangle(fillerX, tallerY + 1.5, 14, 3, PALETTE.crystalBlue, 0.4);
        fillerRim.setDepth(-1.5);

        const collider = platforms.create(fillerX, fillerCenterY, 'platform_tex') as Phaser.Physics.Arcade.Sprite;
        collider.setDisplaySize(14, fillerH);
        collider.refreshBody();
        collider.setVisible(false);
        collider.setPipeline('Light2D');
      }
    }
  }

  // ── Deep underground fill under each terrain point ───────────────────
  for (const pt of profile) {
    const fillW = 60;
    const fillH = 300;
    const fillY = pt.surfaceY + fillH / 2;

    const filler = platforms.create(pt.x, fillY, 'platform_tex') as Phaser.Physics.Arcade.Sprite;
    filler.setDisplaySize(fillW, fillH);
    filler.refreshBody();
    filler.setVisible(false);
    filler.setPipeline('Light2D');
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Terrain Decorations ───────────────────────────────────────────────────────
function addTerrainDecorations(scene: Phaser.Scene, profile: TerrainPoint[]): void {
  for (let i = 1; i < profile.length - 1; i++) {
    const pt = profile[i];
    const prevDiff = pt.surfaceY - profile[i - 1].surfaceY;
    const nextDiff = profile[i + 1].surfaceY - pt.surfaceY;

    // Crystal clusters on peaks
    if (prevDiff < 0 && nextDiff > 0) {
      addCrystalCluster(scene, pt.x - 15, pt.surfaceY - 2, PALETTE.crystalBlue);
      addCrystalCluster(scene, pt.x + 15, pt.surfaceY - 2, PALETTE.crystalPurple);
    }
    // Moss in valleys
    if (prevDiff > 0 && nextDiff < 0) {
      addSmallMoss(scene, pt.x, pt.surfaceY);
    }
  }
}

function addSmallMoss(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const mx = x + Phaser.Math.Between(-20, 20);
    const moss = scene.add.rectangle(mx, y + 2, Phaser.Math.Between(4, 8), 3, PALETTE.mossColor, 0.3);
    moss.setDepth(-1);
    moss.setPipeline('Light2D');
  }
}

// ── Wooden Support Beam ────────────────────────────────────────────────────────
function addWoodenSupport(scene: Phaser.Scene, x: number, y: number, width: number): void {
  const beamHeight = 6;

  const beam = scene.add.rectangle(x, y, width, beamHeight, PALETTE.woodColor, 1);
  beam.setDepth(-1);
  beam.setPipeline('Light2D');

  const highlight = scene.add.rectangle(x, y - beamHeight / 2 + 1, width - 4, 1.5, PALETTE.woodHighlight, 0.5);
  highlight.setDepth(-1);
  highlight.setPipeline('Light2D');

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

  const crystal = scene.add.rectangle(x, y - height / 2, size, height, color, 0.9);
  crystal.setDepth(5);
  crystal.setPipeline('Light2D');

  const glow = scene.add.rectangle(x, y - height / 2, size + 8, height + 6, color, 0.08);
  glow.setDepth(4.5);

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

  const crystalLight = scene.lights.addLight(x, y, 100, glowColor, 1.0);
  scene.tweens.add({
    targets: crystalLight,
    intensity: { from: 1.0, to: 0.4 },
    duration: Phaser.Math.Between(800, 1500),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  const gem = scene.add.rectangle(x, y, 6, 10, glowColor, 0.9);
  gem.setDepth(5);
  gem.setPipeline('Light2D');
  objects.push(gem);

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
  const towerBaseY = 770; // matches terrain surface at tower
  const towerHeight = 550;
  const towerW = 120;

  const towerBody = scene.add.rectangle(towerX, towerBaseY - towerHeight / 2, towerW, towerHeight, 0x0e0a18, 1);
  towerBody.setDepth(-2);
  tiles.push(towerBody);

  for (let row = 0; row < 12; row++) {
    const lineY = towerBaseY - 30 - row * 45;
    const line = scene.add.rectangle(towerX, lineY, towerW - 8, 1, 0x2a1e3e, 0.3);
    line.setDepth(-1);
    tiles.push(line);
  }

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

  const beaconPlat = scene.add.rectangle(towerX, towerBaseY - towerHeight - 8, towerW + 40, 10, 0x0e0a18, 1);
  beaconPlat.setDepth(-1);
  tiles.push(beaconPlat);

  const beaconFixture = scene.add.rectangle(towerX, towerBaseY - towerHeight - 30, 20, 14, 0x1a3050, 0.9);
  beaconFixture.setDepth(2);
  beaconFixture.setPipeline('Light2D');
  tiles.push(beaconFixture);

  const beaconGlow = scene.add.rectangle(towerX, towerBaseY - towerHeight - 30, 40, 40, PALETTE.crystalBlue, 0.15);
  beaconGlow.setDepth(2);
  beaconGlow.setPipeline('Light2D');

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

  // Tower platforms (climbable interior ledges)
  new PlatformLedge(scene, towerX, towerBaseY - towerHeight - 8, { width: towerW + 40, height: 10 });
  new PlatformLedge(scene, towerX - 35, towerBaseY - 140, { width: 70, height: 14 });
  new PlatformLedge(scene, towerX - 35, towerBaseY - 260, { width: 70, height: 14 });
  new PlatformLedge(scene, towerX - 35, towerBaseY - 380, { width: 70, height: 14 });

  const towerPlatDefs: [number, number, number, number][] = [
    [towerX - (towerW + 40) / 2, towerBaseY - towerHeight - 8, towerW + 40, 10],
    [towerX - 35 - 35, towerBaseY - 140, 70, 14],
    [towerX - 35 - 35, towerBaseY - 260, 70, 14],
    [towerX - 35 - 35, towerBaseY - 380, 70, 14],
  ];

  for (const [tx, ty, tw, th] of towerPlatDefs) {
    const p = platforms.create(tx + tw / 2, ty + th / 2, 'platform_tex') as Phaser.Physics.Arcade.Sprite;
    p.setDisplaySize(tw, th);
    p.refreshBody();
    p.setVisible(false);
    p.setPipeline('Light2D');
  }

  // Hanging vines
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

// ── Elevator Shaft — vertical pit with walls + visible elevator car ────────
function buildElevatorShaft(
  scene: Phaser.Scene,
  tiles: Phaser.GameObjects.GameObject[],
  levelW: number,
  levelH: number,
  elevatorDef: MovingPlatformDef,
): void {
  const shaftX = 4450;
  const shaftW = 140;
  const shaftTop = 822;
  const shaftBottom = 230;

  // ── Shaft walls ──────────────────────────────────────────────────────
  // Left wall
  const leftWall = scene.add.rectangle(shaftX - shaftW / 2 - 6, (shaftTop + shaftBottom) / 2, 12, shaftTop - shaftBottom, PALETTE.stoneBody, 1);
  leftWall.setDepth(-2);
  leftWall.setPipeline('Light2D');

  // Right wall
  const rightWall = scene.add.rectangle(shaftX + shaftW / 2 + 6, (shaftTop + shaftBottom) / 2, 12, shaftTop - shaftBottom, PALETTE.stoneBody, 1);
  rightWall.setDepth(-2);
  rightWall.setPipeline('Light2D');

  // Wall rims at entrance
  const leftRim = scene.add.rectangle(shaftX - shaftW / 2 - 6, shaftTop + 1.5, 14, 3, PALETTE.crystalPurple, 0.5);
  leftRim.setDepth(-1.5);
  const rightRim = scene.add.rectangle(shaftX + shaftW / 2 + 6, shaftTop + 1.5, 14, 3, PALETTE.crystalPurple, 0.5);
  rightRim.setDepth(-1.5);

  // ── Vertical guide rails (metal strips on the walls) ────────────────
  for (const side of [-1, 1]) {
    const railX = shaftX + side * (shaftW / 2 - 15);
    const rail = scene.add.rectangle(railX, (shaftTop + shaftBottom) / 2, 2, shaftTop - shaftBottom, 0x2a3a4a, 0.3);
    rail.setDepth(-1.5);
    tiles.push(rail);
  }

  // ── Glowing crystals inside the shaft for atmosphere ────────────────
  for (let i = 0; i < 4; i++) {
    const cY = shaftTop - 60 - i * 130;
    const side = i % 2 === 0 ? -1 : 1;
    const crystal = scene.add.rectangle(shaftX + side * 40, cY, 4, 8, PALETTE.crystalBlue, 0.8);
    crystal.setDepth(5);
    crystal.setPipeline('Light2D');
    const glow = scene.add.rectangle(shaftX + side * 40, cY, 18, 18, PALETTE.crystalBlue, 0.06);
    glow.setDepth(4);
    scene.tweens.add({
      targets: crystal,
      alpha: { from: 0.8, to: 0.4 },
      scaleY: { from: 1, to: 1.3 },
      duration: Phaser.Math.Between(800, 1200),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ── Vertical glow beam ──────────────────────────────────────────────
  const glowLine = scene.add.rectangle(shaftX, (shaftTop + shaftBottom) / 2, 2, shaftTop - shaftBottom - 40, PALETTE.crystalBlue, 0.04);
  glowLine.setDepth(-1);
  scene.tweens.add({
    targets: glowLine,
    alpha: { from: 0.04, to: 0.08 },
    duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // ── Elevator label at top ───────────────────────────────────────────
  const elevLabel = scene.add.text(shaftX, shaftTop - 18, '▼ ELEVATOR ▼', {
    fontFamily: 'monospace', fontSize: '10px', color: '#44ddff', align: 'center',
  }).setOrigin(0.5).setDepth(2).setAlpha(0.6);
  scene.tweens.add({
    targets: elevLabel,
    alpha: { from: 0.6, to: 0.2 },
    duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // ── VISIBLE ELEVATOR CAR ────────────────────────────────────────────
  // A dark stone cabin that rides up and down the shaft.
  const carW = elevatorDef.w + 20;
  const carH = 40;
  const carCX = elevatorDef.x + elevatorDef.w / 2;
  const carCY = elevatorDef.y - carH / 2 + elevatorDef.h; // sits ON TOP of the platform

  // Elevator car body — dark stone box
  const carBody = scene.add.rectangle(carCX, carCY, carW, carH, 0x14101e, 1);
  carBody.setDepth(3);
  carBody.setPipeline('Light2D');

  // Car roof highlight
  const carRoof = scene.add.rectangle(carCX, carCY - carH / 2 + 1, carW, 2, 0x2a1e3e, 0.5);
  carRoof.setDepth(3.5);

  // Car bottom rim (where it meets the platform)
  const carBottomRim = scene.add.rectangle(carCX, carCY + carH / 2 - 1, carW, 2, PALETTE.crystalBlue, 0.4);
  carBottomRim.setDepth(3.5);

  // ── Moving blue lights on the car ───────────────────────────────────
  const lightColors = [0x44ddff, 0x66eeff, 0x33ccff];
  const lightPositions = [
    { x: carCX - carW / 2 + 12, y: carCY - 6 },
    { x: carCX, y: carCY - 8 },
    { x: carCX, y: carCY + 6 },
    { x: carCX + carW / 2 - 12, y: carCY - 6 },
  ];
  const lights: Phaser.GameObjects.Rectangle[] = [];
  for (const lp of lightPositions) {
    const color = Phaser.Utils.Array.GetRandom(lightColors);
    const light = scene.add.rectangle(lp.x, lp.y, 5, 5, color, 0.9);
    light.setDepth(4);
    light.setPipeline('Light2D');
    lights.push(light);

    // Glow around each light
    const glow = scene.add.rectangle(lp.x, lp.y, 14, 14, color, 0.15);
    glow.setDepth(3);
    lights.push(glow);

    // Pulsing tween
    scene.tweens.add({
      targets: light,
      alpha: { from: 0.9, to: 0.3 },
      scaleX: { from: 1, to: 1.4 },
      scaleY: { from: 1, to: 1.4 },
      duration: Phaser.Math.Between(400, 700),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.04 },
      scaleX: { from: 1, to: 1.8 },
      scaleY: { from: 1, to: 1.8 },
      duration: Phaser.Math.Between(600, 1000),
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // Additional blue light strip along the top of the car
  const topStrip = scene.add.rectangle(carCX, carCY - carH / 2 + 3, carW - 20, 3, PALETTE.crystalBlue, 0.6);
  topStrip.setDepth(4);
  topStrip.setPipeline('Light2D');
  scene.tweens.add({
    targets: topStrip,
    alpha: { from: 0.6, to: 0.15 },
    duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // Blue light strip along the bottom
  const bottomStrip = scene.add.rectangle(carCX, carCY + carH / 2 - 2, carW - 20, 2, PALETTE.crystalBlue, 0.5);
  bottomStrip.setDepth(4);
  bottomStrip.setPipeline('Light2D');
  scene.tweens.add({
    targets: bottomStrip,
    alpha: { from: 0.5, to: 0.1 },
    duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  // ── Tween the entire car assembly with the same elevator timing ──
  const carParts = [carBody, carRoof, carBottomRim, topStrip, bottomStrip, ...lights];
  scene.tweens.add({
    targets: carParts,
    y: `+=${elevatorDef.moveY}`,
    duration: elevatorDef.duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: elevatorDef.delay,
  });
}

// ── Moving Platform ────────────────────────────────────────────────────────────
function createMovingPlatform(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  def: MovingPlatformDef,
): void {
  const cx = def.x + def.w / 2;
  const cy = def.y + def.h / 2;

  const rim = scene.add.rectangle(cx, cy - def.h / 2 + 1.5, def.w + 4, 3, PALETTE.crystalBlue, 0.6);
  rim.setDepth(0.3);

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

  const plat = scene.physics.add.sprite(cx, cy, 'platform_tex');
  plat.setDisplaySize(def.w, def.h);
  plat.setImmovable(true);
  (plat.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  plat.setPipeline('Light2D');
  group.add(plat);

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
function drawScenery(
  scene: Phaser.Scene,
  tiles: Phaser.GameObjects.GameObject[],
  w: number,
  h: number,
): void {
  const skyGrad = scene.add.graphics();
  skyGrad.setDepth(-12);
  skyGrad.fillGradientStyle(0x050510, 0x050510, 0x0e0a20, 0x1a0e30, 1);
  skyGrad.fillRect(0, 0, w, h * 0.55);

  const horizonGrad = scene.add.graphics();
  horizonGrad.setDepth(-12);
  horizonGrad.fillGradientStyle(0x1a0e30, 0x1a0e30, 0x0e0a18, 0x0e0a18, 1);
  horizonGrad.fillRect(0, h * 0.55, w, h * 0.15);

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

  const kingdom = scene.add.graphics();
  kingdom.setDepth(-10);
  kingdom.fillStyle(0x0a0818, 0.7);

  const kingdomHorizon = h * 0.6;
  kingdom.beginPath();
  kingdom.moveTo(0, h);

  const c1x = w * 0.25;
  drawCastle(kingdom, c1x, kingdomHorizon, {
    baseW: 160, height: 140, towerH: 60, towerW: 20, hasSpire: true,
  });

  const c2x = w * 0.55;
  drawCastle(kingdom, c2x, kingdomHorizon, {
    baseW: 100, height: 90, towerH: 40, towerW: 16, hasSpire: false,
  });

  const c3x = w * 0.78;
  drawCastle(kingdom, c3x, kingdomHorizon, {
    baseW: 80, height: 70, towerH: 35, towerW: 14, hasSpire: true,
  });

  kingdom.lineTo(w, kingdomHorizon);
  kingdom.lineTo(w, h);
  kingdom.closePath();
  kingdom.fill();

  const forest = scene.add.graphics();
  forest.setDepth(-9);
  forest.fillStyle(0x0a0a14, 0.6);

  forest.beginPath();
  forest.moveTo(0, kingdomHorizon);

  const treePositions: number[] = [];
  for (let t = 0; t < 30; t++) {
    treePositions.push(Phaser.Math.Between(0, w));
  }
  treePositions.sort((a, b) => a - b);

  let prevTx = 0;
  for (const tx of treePositions) {
    if (tx - prevTx < 20) continue;
    prevTx = tx;

    const treeH = Phaser.Math.Between(60, 160);
    const treeW = Phaser.Math.Between(20, 45);
    const trunkH = treeH * 0.3;
    const crownH = treeH * 0.7;

    forest.lineTo(tx, kingdomHorizon - treeH + crownH);
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

function drawCastle(
  g: Phaser.GameObjects.Graphics,
  x: number,
  groundY: number,
  def: { baseW: number; height: number; towerH: number; towerW: number; hasSpire: boolean },
): void {
  const hw = def.baseW / 2;

  g.lineTo(x - hw, groundY - def.height);
  g.lineTo(x - hw, groundY - def.height);
  g.lineTo(x + hw, groundY - def.height);
  g.lineTo(x + hw, groundY);

  const leftTowerX = x - hw + def.towerW / 2;
  g.lineTo(x - hw, groundY);
  g.lineTo(x - hw, groundY - def.height - def.towerH);
  g.lineTo(x - hw + def.towerW, groundY - def.height - def.towerH);
  g.lineTo(x - hw + def.towerW, groundY - def.height);

  g.lineTo(x + hw, groundY - def.height);
  g.lineTo(x + hw, groundY - def.height - def.towerH);
  g.lineTo(x + hw - def.towerW, groundY - def.height - def.towerH);
  g.lineTo(x + hw - def.towerW, groundY - def.height);

  if (def.hasSpire) {
    g.lineTo(x - 8, groundY - def.height);
    g.lineTo(x, groundY - def.height - 40);
    g.lineTo(x + 8, groundY - def.height);
  }
}

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
  if (!scene.textures.exists('platform_tex')) {
    const g = scene.add.graphics();

    g.fillGradientStyle(0x1a1428, 0x1a1428, 0x281840, 0x281840, 1);
    g.fillRect(0, 0, 64, 64);

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

    g.fillStyle(PALETTE.crystalBlue, 0.08);
    for (let n = 0; n < 5; n++) {
      g.fillCircle(Phaser.Math.Between(8, 56), Phaser.Math.Between(8, 56), Phaser.Math.Between(2, 4));
    }

    g.lineStyle(1, 0x0a0810, 0.15);
    for (let c = 0; c < 3; c++) {
      const cy = Phaser.Math.Between(10, 55);
      g.beginPath();
      g.moveTo(Phaser.Math.Between(5, 30), cy);
      g.lineTo(Phaser.Math.Between(30, 60), cy + Phaser.Math.Between(-3, 3));
      g.strokePath();
    }

    g.fillStyle(PALETTE.mossColor, 0.15);
    for (let m = 0; m < 5; m++) {
      g.fillCircle(Phaser.Math.Between(4, 60), Phaser.Math.Between(2, 8), Phaser.Math.Between(3, 6));
    }

    g.fillGradientStyle(PALETTE.crystalBlue, PALETTE.crystalBlue, 0x1a1428, 0x1a1428, 0.15);
    g.fillRect(0, 0, 64, 2);

    g.generateTexture('platform_tex', 64, 64);
    g.destroy();
  }

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