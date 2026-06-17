// ─────────────────────────────────────────────────────────────────────────────
// LevelBuilder.ts — Sunken Aqueduct: deep blues, teals, mossy stone pillars,
// hanging vines, jagged ceilings, abandoned subterranean facility
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';

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
  /** Zone that the player must reach to complete the level */
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

export function buildLevel(scene: Phaser.Scene): LevelData {
  const LEVEL_W = 4800;
  const LEVEL_H = 1080;

  generateTextures(scene);

  const backgroundTiles: Phaser.GameObjects.GameObject[] = [];
  drawScenery(scene, backgroundTiles, LEVEL_W, LEVEL_H);

  const platforms = scene.physics.add.staticGroup();

  // Deep aqueduct bottom — no solid ground floor, just deadly water
  // Instead of ground, we have scattered pillar platforms rising from the depths

  // Floor at very bottom (only at safe landing zones)
  addPlatform(platforms, 0, LEVEL_H - 20, 200, 40, 'platform_tex');
  addPlatform(platforms, LEVEL_W - 200, LEVEL_H - 20, 200, 40, 'platform_tex');

  // Left wall
  addPlatform(platforms, -20, 0, 40, LEVEL_H, 'platform_tex');
  // Right wall
  addPlatform(platforms, LEVEL_W - 20, 0, 40, LEVEL_H, 'platform_tex');

  // ── THE TOWER (The Ancient Spire) ── A tall structure at x=2000 ────────
  buildTower(scene, platforms, backgroundTiles, LEVEL_W, LEVEL_H);

  const towerBeaconLight = scene.lights.addLight(2000, 180, 700, 0x88ddff, 2.0);

  // ── Pillar Platforms — mossy stone pillars rising from the abyss ──────
  const defs: [number, number, number, number][] = [
    // Starting area — safe intro (spawn platform at x=80, y=840 ensures player lands immediately)
    [60,  840, 160, 20],
    [120,  860, 200, 20],
    [380,  800, 160, 20],
    [600,  860, 180, 20],
    [850,  760, 160, 20],
    [1050, 820, 180, 20],
    // Mid section — narrowing pillars
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
    // Right section — challenging gaps
    [3100, 860, 130, 20],
    [3300, 780, 140, 20],
    [3500, 840, 160, 20],
    [3700, 760, 120, 20],
    [3900, 820, 140, 20],
    [4100, 860, 160, 20],
    [4400, 800, 180, 20],
    // Upper route — precarious high ledges
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
    // Very high — risky shortcuts
    [500,  300, 100, 14],
    [1000, 260, 110, 14],
    [1500, 320, 100, 14],
    [2200, 280, 110, 14],
    [3000, 320, 100, 14],
    [3600, 280, 110, 14],
    [4300, 300, 100, 14],
  ];

  for (const [x, y, w, h] of defs) {
    addPlatform(platforms, x, y, w, h, 'platform_tex');
  }

  // ── Moving platforms ───────────────────────────────────────────────────
  const movingPlatformDefs: MovingPlatformDef[] = [
    { x: 450,  y: 650, w: 100, h: 16, moveX: 0,   moveY: -180, duration: 2800, delay: 0 },
    { x: 1400, y: 600, w: 90,  h: 16, moveX: 200, moveY: 0,    duration: 3200, delay: 800 },
    { x: 2600, y: 580, w: 100, h: 16, moveX: 0,   moveY: -150, duration: 2400, delay: 0 },
    { x: 3400, y: 620, w: 90,  h: 16, moveX: -180, moveY: 0,   duration: 3000, delay: 1200 },
    { x: 4000, y: 600, w: 100, h: 16, moveX: 0,   moveY: -200, duration: 2600, delay: 500 },
  ];

  const movingPlatforms = scene.physics.add.group({
    allowGravity: false,
    immovable: true,
  });

  for (const mpDef of movingPlatformDefs) {
    createMovingPlatform(scene, movingPlatforms, mpDef);
  }

  // ── Hazards ────────────────────────────────────────────────────────────
  // Jagged ceiling stalactites (limit jump space) + platform edge spikes
  const spikeHazards = scene.physics.add.staticGroup();

  // 1. Ceiling stalactites — overhanging hazards that limit vertical space
  const ceilingHazardPositions: [number, number, number, number][] = [
    [350,  300, 80,  60],
    [700,  280, 100, 80],
    [1100, 320, 80,  60],
    [1450, 260, 90,  70],
    [1800, 300, 70,  50],
    [2200, 280, 100, 60],
    [2600, 320, 80,  50],
    [3000, 280, 90,  60],
    [3400, 300, 80,  50],
    [3800, 280, 100, 70],
    [4200, 300, 80,  60],
  ];

  for (const [sx, sy, sw, sh] of ceilingHazardPositions) {
    addSpike(scene, spikeHazards, sx, sy, sw, sh);
  }

  // 2. Platform edge spikes — dangerous tips on certain pillar edges
  // Fixed positions: spike at x = platformX - spikeWidth (left edge) or platformX + platformW (right edge)
  const edgeSpikePositions: [number, number, number, number][] = [
    // Left edge of platform at 380,800 (platform starts at x=380, spike sits at x=380-40=340)
    [340,  795, 40, 16],
    // Right edge at 450,650 (vertical moving plat) - spike at x=450+100=550
    [550,  695, 40, 16],
    // Right edge at 1050,820 - spike at x=1050+180=1230
    [1230, 815, 40, 16],
    // Right edge at 1500,780 - spike at x=1500+160=1660
    [1660, 775, 40, 16],
    // Left edge at 1900,800 - spike at x=1900-40=1860
    [1860, 715, 40, 16],
    // Right edge at 2100,740 - spike at x=2100+160=2260
    [2260, 735, 40, 16],
    // Right edge at 2900,800 - spike at x=2900+160=3060
    [3060, 795, 40, 16],
    // Right edge at 3300,780 - spike at x=3300+140=3440
    [3440, 775, 40, 16],
    // Right edge at 3700,760 - spike at x=3700+120=3820
    [3820, 755, 40, 16],
  ];

  for (const [sx, sy, sw, sh] of edgeSpikePositions) {
    addSpike(scene, spikeHazards, sx, sy, sw, sh);
  }

  // ── Glowing crystals / bioluminescent flora ────────────────────────────
  const glowPositions: [number, number][] = [
    [150,  830],
    [600,  830],
    [900,  730],
    [1200, 790],
    [1500, 750],
    [1800, 690],
    [2100, 710],
    [2400, 650],
    [2700, 750],
    [3000, 770],
    [3300, 750],
    [3600, 810],
    [3900, 790],
    [4200, 830],
    // Upper route crystals
    [650,  430],
    [1250, 450],
    [1850, 470],
    [2500, 490],
    [3150, 470],
    [3850, 490],
  ];

  const glowObjects: Phaser.GameObjects.Rectangle[] = [];
  for (const [gx, gy] of glowPositions) {
    const colorChoice = Phaser.Math.Between(0, 2);
    const colors = [0x44ddff, 0x88ffaa, 0xbb88ff];
    const glowColor = colors[colorChoice];

    // Crystal light
    const crystalLight = scene.lights.addLight(gx, gy, 100, glowColor, 1.0);
    scene.tweens.add({
      targets: crystalLight,
      intensity: { from: 1.0, to: 0.4 },
      duration: Phaser.Math.Between(800, 1500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Crystal body — small glowing gem
    const gem = scene.add.rectangle(gx, gy, 6, 10, glowColor, 0.9);
    gem.setDepth(5);
    gem.setPipeline('Light2D');
    glowObjects.push(gem);

    // Outer glow
    const halo = scene.add.rectangle(gx, gy, 24, 24, glowColor, 0.1);
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

  // ── Music trigger zone ─────────────────────────────────────────────────
  const triggerZone = scene.add.zone(3600, LEVEL_H / 2, 800, LEVEL_H);
  scene.physics.add.existing(triggerZone, true);

  // ── Goal zone — at the right end of the level ──────────────────────────
  // Player must reach this area to complete the level
  const goalZone = scene.add.zone(LEVEL_W - 100, LEVEL_H / 2, 200, LEVEL_H);
  scene.physics.add.existing(goalZone, true);

  // Visual indicator for goal zone
  const goalMarker = scene.add.rectangle(LEVEL_W - 100, LEVEL_H - 60, 180, 40, 0x88ddff, 0.08);
  goalMarker.setDepth(1);
  goalMarker.setPipeline('Light2D');
  scene.tweens.add({
    targets: goalMarker,
    alpha: 0.02,
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  const goalLabel = scene.add.text(LEVEL_W - 100, LEVEL_H - 65, '✦ EXIT ✦', {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#88ddff',
    align: 'center',
  }).setOrigin(0.5).setDepth(2).setAlpha(0.6);
  scene.tweens.add({
    targets: goalLabel,
    alpha: 0.2,
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

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
    playerSpawn: { x: 140, y: 830 }, // Spawn directly on the first platform (60,840,160,20)
    goalZone,
  };
}

// ── Tower Builder (Ancient Spire) ─────────────────────────────────────────────

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

  // Main structure — aged stone
  const towerBody = scene.add.rectangle(towerX, towerBaseY - towerHeight / 2, towerW, towerHeight, 0x0a0e14, 1);
  towerBody.setDepth(-2);
  tiles.push(towerBody);

  // Weathered stone lines
  for (let row = 0; row < 12; row++) {
    const lineY = towerBaseY - 30 - row * 45;
    const line = scene.add.rectangle(towerX, lineY, towerW - 8, 1, 0x1a2430, 0.3);
    line.setDepth(-1);
    tiles.push(line);
  }

  // Bioluminescent windows — teal glow
  for (let winRow = 0; winRow < 5; winRow++) {
    const winY = towerBaseY - 70 - winRow * 90;
    for (let side = -1; side <= 1; side += 2) {
      const win = scene.add.rectangle(towerX + side * 25, winY, 12, 18, 0x0a2030, 0.7);
      win.setDepth(-1);
      tiles.push(win);
      const winGlow = scene.add.rectangle(towerX + side * 25, winY, 35, 35, 0x44ddff, 0.04);
      winGlow.setDepth(-1);
      tiles.push(winGlow);
    }
  }

  // Tower top — beacon platform
  const beaconPlat = scene.add.rectangle(towerX, towerBaseY - towerHeight - 8, towerW + 40, 10, 0x0a0e14, 1);
  beaconPlat.setDepth(-1);
  tiles.push(beaconPlat);

  // Beacon fixture
  const beaconFixture = scene.add.rectangle(towerX, towerBaseY - towerHeight - 30, 20, 14, 0x1a3050, 0.9);
  beaconFixture.setDepth(2);
  beaconFixture.setPipeline('Light2D');
  tiles.push(beaconFixture);

  const beaconGlow = scene.add.rectangle(towerX, towerBaseY - towerHeight - 30, 40, 40, 0x88ddff, 0.15);
  beaconGlow.setDepth(2);
  beaconGlow.setPipeline('Light2D');

  // Beam cone
  const beamCone = scene.add.triangle(
    towerX, towerBaseY - towerHeight - 30,
    0, 0,
    500, -25,
    500, 25,
    0x88ddff, 0.05,
  );
  beamCone.setOrigin(0, 0.5);
  beamCone.setDepth(1);
  beamCone.setPipeline('Light2D');
  tiles.push(beamCone);

  scene.tweens.add({
    targets: beamCone,
    angle: { from: -25, to: 25 },
    duration: 5000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Beacon platform (standable)
  addPlatform(platforms, towerX - (towerW + 40) / 2, towerBaseY - towerHeight - 8, towerW + 40, 10, 'platform_tex');

  // Inner tower platforms
  addPlatform(platforms, towerX - 35, towerBaseY - 140, 70, 14, 'platform_tex');
  addPlatform(platforms, towerX - 35, towerBaseY - 260, 70, 14, 'platform_tex');
  addPlatform(platforms, towerX - 35, towerBaseY - 380, 70, 14, 'platform_tex');

  // Hanging vines from tower
  for (let v = -1; v <= 1; v += 2) {
    const vineX = towerX + v * 55;
    for (let segment = 0; segment < 8; segment++) {
      const segY = towerBaseY - towerHeight + 30 + segment * 16;
      const vineSeg = scene.add.rectangle(vineX, segY, 2, 10, 0x0a2018, Phaser.Math.FloatBetween(0.2, 0.4));
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

// ── Moving Platform ───────────────────────────────────────────────────────────

function createMovingPlatform(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group,
  def: MovingPlatformDef,
): void {
  const plat = scene.physics.add.sprite(def.x + def.w / 2, def.y + def.h / 2, 'platform_tex');
  plat.setDisplaySize(def.w, def.h);
  plat.setImmovable(true);
  (plat.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  plat.setPipeline('Light2D');
  group.add(plat);

  scene.tweens.add({
    targets: plat,
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

// ── Scenery — Sunken Aqueduct ────────────────────────────────────────────────

function drawScenery(
  scene: Phaser.Scene,
  tiles: Phaser.GameObjects.GameObject[],
  w: number,
  h: number,
): void {
  // 1. Deep background gradient — dark teal to deep blue
  const skyGrad = scene.add.graphics();
  skyGrad.setDepth(-12);
  skyGrad.fillGradientStyle(0x040a0e, 0x0a1620, 0x0e1a2a, 0x1a2a3e, 1);
  skyGrad.fillRect(0, 0, w, h * 0.5);

  const lowerGrad = scene.add.graphics();
  lowerGrad.setDepth(-12);
  lowerGrad.fillGradientStyle(0x1a2a3e, 0x1a2a3e, 0x0a1218, 0x0a1218, 1);
  lowerGrad.fillRect(0, h * 0.5, w, h * 0.5);

  // 2. Distant cavern walls — silhouettes fading into mist
  const backWall = scene.add.graphics();
  backWall.setDepth(-11);

  // Far wall — jagged cavern edge
  backWall.fillStyle(0x0a1620, 0.6);
  backWall.beginPath();
  backWall.moveTo(0, h * 0.4);
  const farPts = [0, 0.05, 0.15, 0.08, 0.25, 0.12, 0.35, 0.07, 0.5, 0.15, 0.6, 0.1, 0.7, 0.18, 0.8, 0.12, 0.9, 0.2, 1];
  for (let i = 0; i < farPts.length; i++) {
    const px = (i / (farPts.length - 1)) * w;
    const py = h * 0.4 + farPts[i] * h * 0.3;
    backWall.lineTo(px, py);
  }
  backWall.lineTo(w, h);
  backWall.lineTo(0, h);
  backWall.closePath();
  backWall.fill();

  // Mid wall — closer
  const midWall = scene.add.graphics();
  midWall.setDepth(-10);
  midWall.fillStyle(0x0e1a2a, 0.5);
  midWall.beginPath();
  midWall.moveTo(0, h * 0.55);
  const midPts = [0, 0.03, 0.12, 0.06, 0.2, 0.1, 0.3, 0.05, 0.4, 0.12, 0.55, 0.08, 0.65, 0.14, 0.75, 0.09, 0.88, 0.15, 1];
  for (let i = 0; i < midPts.length; i++) {
    const px = (i / (midPts.length - 1)) * w;
    const py = h * 0.55 + midPts[i] * h * 0.25;
    midWall.lineTo(px, py);
  }
  midWall.lineTo(w, h);
  midWall.lineTo(0, h);
  midWall.closePath();
  midWall.fill();

  // 3. Hanging vines/roots from ceiling
  const vineGraphics = scene.add.graphics();
  vineGraphics.setDepth(-8);

  for (let v = 0; v < 30; v++) {
    const vx = Phaser.Math.Between(0, w);
    const vineLen = Phaser.Math.Between(40, 200);
    const vineCurve = Phaser.Math.Between(-3, 3);
    vineGraphics.lineStyle(2, 0x0a2018, Phaser.Math.FloatBetween(0.2, 0.4));
    vineGraphics.beginPath();
    vineGraphics.moveTo(vx, 0);
    vineGraphics.lineTo(vx + vineCurve, vineLen * 0.3);
    vineGraphics.lineTo(vx + vineCurve * 0.5, vineLen * 0.6);
    vineGraphics.lineTo(vx + vineCurve * 0.2, vineLen);
    vineGraphics.strokePath();

    // Small leaf/bud at end
    vineGraphics.fillStyle(0x0a2418, Phaser.Math.FloatBetween(0.1, 0.3));
    vineGraphics.fillCircle(vx + vineCurve * 0.2, vineLen, Phaser.Math.Between(2, 4));
  }

  // 4. Mossy stone column silhouettes in background
  const columnGraphics = scene.add.graphics();
  columnGraphics.setDepth(-9);

  for (let c = 0; c < 8; c++) {
    const cx = Phaser.Math.Between(100, w - 100);
    const colH = Phaser.Math.Between(300, 600);
    const colW = Phaser.Math.Between(30, 60);
    columnGraphics.fillStyle(0x0a1218, Phaser.Math.FloatBetween(0.3, 0.5));
    columnGraphics.fillRect(cx, h - colH, colW, colH);

    // Moss on top
    columnGraphics.fillStyle(0x0a1a14, Phaser.Math.FloatBetween(0.2, 0.4));
    columnGraphics.fillEllipse(cx + colW / 2, h - colH, colW + 10, 12);
  }

  // 5. Mist / fog layers (floating in the abyss)
  const fogGraphics = scene.add.graphics();
  fogGraphics.setDepth(-6);

  for (let f = 0; f < 12; f++) {
    const fogX = Phaser.Math.Between(0, w);
    const fogY = h - Phaser.Math.Between(100, h - 200);
    const fogW = Phaser.Math.Between(250, 700);
    const fogH = Phaser.Math.Between(40, 100);
    fogGraphics.fillStyle(0x1a2a3e, Phaser.Math.FloatBetween(0.03, 0.08));
    fogGraphics.fillEllipse(fogX, fogY, fogW, fogH);
  }

  // 6. Falling water droplets / particles
  const dropColors = [0x44ddff, 0x88ddff, 0xaaeaff];
  for (let i = 0; i < 35; i++) {
    const px = Phaser.Math.Between(0, w);
    const py = Phaser.Math.Between(20, h - 50);
    const size = Phaser.Math.Between(1, 3);
    const color = Phaser.Utils.Array.GetRandom(dropColors);
    const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
    const particle = scene.add.rectangle(px, py, size, size, color, alpha);
    particle.setDepth(-4);
    particle.setPipeline('Light2D');
    tiles.push(particle);

    scene.tweens.add({
      targets: particle,
      y: py + Phaser.Math.Between(30, 100),
      x: px + Phaser.Math.Between(-10, 10),
      alpha: 0,
      duration: Phaser.Math.Between(2000, 5000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 2500),
    });
  }

  // 7. Floating bioluminescent spores
  const sporeColors = [0x44ffaa, 0x88ffdd, 0xaaffcc];
  for (let i = 0; i < 20; i++) {
    const px = Phaser.Math.Between(0, w);
    const py = Phaser.Math.Between(h * 0.3, h - 100);
    const size = Phaser.Math.Between(1, 2);
    const color = Phaser.Utils.Array.GetRandom(sporeColors);
    const alpha = Phaser.Math.FloatBetween(0.05, 0.15);
    const spore = scene.add.rectangle(px, py, size, size, color, alpha);
    spore.setDepth(-4);
    spore.setPipeline('Light2D');
    tiles.push(spore);

    scene.tweens.add({
      targets: spore,
      y: py - Phaser.Math.Between(30, 80),
      x: px + Phaser.Math.Between(-20, 20),
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
  plat.setPipeline('Light2D');
}

function generateTextures(scene: Phaser.Scene): void {
  // ── Platform texture — mossy stone pillar ──────────────────────────────
  if (!scene.textures.exists('platform_tex')) {
    const g = scene.add.graphics();

    // Base — dark stone
    g.fillGradientStyle(0x141e28, 0x141e28, 0x1a2836, 0x1a2836, 1);
    g.fillRect(0, 0, 64, 64);

    // Mossy top
    g.fillGradientStyle(0x1a3028, 0x1a3028, 0x243a30, 0x243a30, 0.6);
    g.fillRect(0, 0, 64, 6);

    // Stone cracks
    g.lineStyle(1, 0x0e1820, 0.15);
    for (let c = 0; c < 3; c++) {
      const cy = Phaser.Math.Between(10, 55);
      g.beginPath();
      g.moveTo(Phaser.Math.Between(5, 30), cy);
      g.lineTo(Phaser.Math.Between(30, 60), cy + Phaser.Math.Between(-3, 3));
      g.strokePath();
    }

    // Moss spots
    g.fillStyle(0x2a4a38, 0.2);
    for (let m = 0; m < 6; m++) {
      g.fillCircle(Phaser.Math.Between(4, 60), Phaser.Math.Between(4, 10), Phaser.Math.Between(2, 5));
    }

    // Edge highlight
    g.fillGradientStyle(0x2a3a4a, 0x2a3a4a, 0x141e28, 0x141e28, 0.2);
    g.fillRect(0, 0, 64, 2);

    g.generateTexture('platform_tex', 64, 64);
    g.destroy();
  }

  // ── Player texture — Glowing Plush Sheep (Sheepy) ──────────────────────
  if (!scene.textures.exists('player_tex')) {
    const g = scene.add.graphics();
    const s = 28; // size

    // Outer glow aura
    g.fillStyle(0x88ddff, 0.08);
    g.fillCircle(s / 2, s / 2, s / 2 + 4);

    // Body — fluffy white wool
    g.fillStyle(0xeeeee8, 1);
    g.fillRoundedRect(3, 8, 22, 18, 7);

    // Wool texture bumps
    g.fillStyle(0xddd8d0, 0.6);
    g.fillCircle(7, 12, 4);
    g.fillCircle(14, 11, 5);
    g.fillCircle(20, 12, 4);
    g.fillCircle(8, 17, 3);
    g.fillCircle(16, 18, 4);
    g.fillCircle(22, 16, 3);

    // Head — pale cream
    g.fillStyle(0xf0ece0, 1);
    g.fillCircle(14, 7, 7);

    // Eyes — big cute dots
    g.fillStyle(0x222230, 1);
    g.fillCircle(11, 6, 1.8);
    g.fillCircle(17, 6, 1.8);

    // Eye shine
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 5.5, 0.8);
    g.fillCircle(16, 5.5, 0.8);

    // Little ears
    g.fillStyle(0xe8d8c0, 1);
    g.fillEllipse(6, 2, 4, 3);
    g.fillEllipse(22, 2, 4, 3);

    // Legs — tiny stubby
    g.fillStyle(0xddd0c0, 1);
    g.fillRect(5, 24, 5, 5);
    g.fillRect(18, 24, 5, 5);

    // Internal glow (magical core)
    g.fillStyle(0x88ddff, 0.15);
    g.fillCircle(14, 16, 6);

    g.generateTexture('player_tex', s, s + 1);
    g.destroy();
  }

  // ── Spike texture — jagged debris / stalactites ────────────────────────
  if (!scene.textures.exists('spike_tex')) {
    const g = scene.add.graphics();
    const size = 48;
    const spikeCount = 5;
    const spacing = size / spikeCount;

    g.fillStyle(0x0a1218, 1);
    g.fillRect(0, size - 6, size, 6);

    g.fillStyle(0x141e28, 1);
    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spacing + spacing / 2;
      g.fillTriangle(sx - 5, size - 6, sx + 5, size - 6, sx, size - 6 - 18);
    }

    g.fillStyle(0x1a2a36, 0.4);
    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spacing + spacing / 2;
      g.fillTriangle(sx - 2, size - 6, sx + 2, size - 6, sx, size - 6 - 14);
    }

    g.generateTexture('spike_tex', size, size);
    g.destroy();
  }
}