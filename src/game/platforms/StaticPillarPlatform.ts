// ─────────────────────────────────────────────────────────────────────────────
// StaticPillarPlatform.ts — Dark fantasy stone pillars with HIGH-VISIBILITY
// glowing indicators that are always visible regardless of Light2D darkness.
// ─────────────────────────────────────────────────────────────────────────────
//
// CRITICAL PROBLEM: The game uses Light2D with near-black ambient (0x0a1218).
// ANY object with setPipeline('Light2D') is INVISIBLE in darkness.
//
// CRITICAL SOLUTION:
//   All landing indicators deliberately IGNORE the Light2D system entirely.
//   They render at full brightness regardless of lighting conditions.
//   They are intentionally LARGE and BRIGHT to be visible across the entire
//   4800px-wide level — not just when standing next to them.
//
// VISIBILITY LAYERS (all bypass Light2D):
//   1. ⬆⬇ LAND HERE ⬇⬆ — Large flashing text (14px, black stroke, bright cyan)
//   2. ████ BEACON ████ — 100px tall bright pillar of light (α=0.3, pulsing fast)
//   3. ═══════ GLOW ═══════ — Wide landing glow bar (α=0.6→0.9, 400ms pulse)
//   4. ─── RUNE TRIM ─── — Bright cyan edge strip (α=0.6, no Light2D)
//   5. ✦ FLOATING RUNES ✦ — Particles floating upward
//   6. Platform stone body — uses Light2D, visible when player's light is near
//
// USAGE:
//   const pillar = new StaticPillarPlatform(scene, x, y, { width: 140, height: 200 });
//   pillar.addToGroup(platformGroup, wallGroup);

import Phaser from 'phaser';

// ── Configuration ──────────────────────────────────────────────────────────────
export interface PillarConfig {
  width: number;
  height: number;
  stoneColor?: number;
  mossColor?: number;
  runeColor?: number;
  generateTexture?: boolean;
  textureKey?: string;
  depth?: number;
  topOnlyCollider?: boolean;
  topColliderThickness?: number;
  showLandingIndicator?: boolean;
  showRuneParticles?: boolean;
  showBeacon?: boolean;
}

const DEFAULT_PILLAR_CONFIG: Required<Omit<PillarConfig, 'textureKey'>> = {
  width: 64,
  height: 128,
  stoneColor: 0x2a3a4a,
  mossColor: 0x2a5040,
  runeColor: 0x44ddff,
  generateTexture: true,
  depth: 0,
  topOnlyCollider: true,
  topColliderThickness: 8,
  showLandingIndicator: true,
  showRuneParticles: true,
  showBeacon: true,
};

const PILLAR_TEX_KEY = 'pillar_tex';

// ── StaticPillarPlatform ───────────────────────────────────────────────────────
export class StaticPillarPlatform {
  public body: Phaser.GameObjects.Rectangle;
  public topCollider: Phaser.Physics.Arcade.Sprite;
  public wallCollider: Phaser.Physics.Arcade.Sprite | null = null;
  public mossDecorations: Phaser.GameObjects.Rectangle[] = [];
  public runeTrim: Phaser.GameObjects.Rectangle[] = [];
  public runeParticles: Phaser.GameObjects.Rectangle[] = [];
  public landingGlow: Phaser.GameObjects.Rectangle | null = null;
  public landingGlowOuter: Phaser.GameObjects.Rectangle | null = null;
  public beaconPillar: Phaser.GameObjects.Rectangle | null = null;
  public indicatorText: Phaser.GameObjects.Text | null = null;
  public indicatorTextSub: Phaser.GameObjects.Text | null = null;

  private scene: Phaser.Scene;
  private cfg: Required<Omit<PillarConfig, 'textureKey'>>;
  private tweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, config?: Partial<PillarConfig>) {
    this.scene = scene;
    this.cfg = { ...DEFAULT_PILLAR_CONFIG, ...config };

    if (this.cfg.generateTexture) {
      generatePillarTexture(scene, this.cfg.stoneColor, this.cfg.mossColor, this.cfg.runeColor);
    }

    const texKey = config?.textureKey || PILLAR_TEX_KEY;
    const topY = y - this.cfg.height / 2 + this.cfg.topColliderThickness / 2;

    // ── Pillar body (uses Light2D — visible only near player light) ─────
    this.body = scene.add.rectangle(x, y, this.cfg.width, this.cfg.height, this.cfg.stoneColor, 1);
    this.body.setDepth(this.cfg.depth);
    this.body.setPipeline('Light2D');

    // ── Top collider ─────────────────────────────────────────────────────
    this.topCollider = scene.physics.add.sprite(x, topY, texKey);
    this.topCollider.setDisplaySize(this.cfg.width + 4, this.cfg.topColliderThickness);
    this.topCollider.setImmovable(true);
    (this.topCollider.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.topCollider.setVisible(false);
    this.topCollider.setDepth(this.cfg.depth);

    // ── Wall collider ────────────────────────────────────────────────────
    if (!this.cfg.topOnlyCollider) {
      this.wallCollider = scene.physics.add.sprite(x, y, texKey);
      this.wallCollider.setDisplaySize(this.cfg.width, this.cfg.height);
      this.wallCollider.setImmovable(true);
      (this.wallCollider.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.wallCollider.setVisible(false);
      this.wallCollider.setDepth(this.cfg.depth);
    }

    // ── PLATFORM SILHOUETTE (always visible, no Light2D) ────────────────
    // A thin outline around the platform body so the stone is always at
    // least dimly visible even in complete darkness. The body itself uses
    // Light2D for when the player's light is near.
    this.createSilhouetteOutline(x, y, this.cfg.width, this.cfg.height);

    // ── HIGH-VISIBILITY INDICATORS ───────────────────────────────────────
    // NONE of these use setPipeline('Light2D') — they are self-illuminated
    // and visible at full brightness across the entire level.
    this.createBeaconLight(x, topY);
    this.createLandingText(x, topY);
    this.createLandingGlow(x, topY);
    this.createGlowingRuneTrim(x, topY);
    this.createPhosphorescentMoss(x, topY);
    this.createRuneParticles(x, topY);
  }

  public addToGroup(
    platformGroup: Phaser.Physics.Arcade.StaticGroup,
    wallGroup?: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    const topStatic = platformGroup.create(
      this.topCollider.x,
      this.topCollider.y,
      this.topCollider.texture.key,
    ) as Phaser.Physics.Arcade.Sprite;
    topStatic.setDisplaySize(this.topCollider.displayWidth, this.topCollider.displayHeight);
    topStatic.refreshBody();
    topStatic.setVisible(false);
    topStatic.setPipeline('Light2D');
    this.topCollider.destroy();
    this.topCollider = topStatic;

    if (this.wallCollider && wallGroup) {
      const wallStatic = wallGroup.create(
        this.wallCollider.x,
        this.wallCollider.y,
        this.wallCollider.texture.key,
      ) as Phaser.Physics.Arcade.Sprite;
      wallStatic.setDisplaySize(this.wallCollider.displayWidth, this.wallCollider.displayHeight);
      wallStatic.refreshBody();
      wallStatic.setVisible(false);
      wallStatic.setPipeline('Light2D');
      this.wallCollider.destroy();
      this.wallCollider = wallStatic;
    }
  }

  public setVisible(visible: boolean): void {
    this.body.setVisible(visible);
  }

  public setDepth(depth: number): void {
    this.body.setDepth(depth);
    this.topCollider.setDepth(depth);
    if (this.wallCollider) this.wallCollider.setDepth(depth);
    this.runeTrim.forEach(r => r.setDepth(depth + 0.3));
    this.mossDecorations.forEach(m => m.setDepth(depth + 0.2));
    if (this.landingGlow) this.landingGlow.setDepth(depth + 0.6);
    if (this.landingGlowOuter) this.landingGlowOuter.setDepth(depth + 0.55);
    if (this.beaconPillar) this.beaconPillar.setDepth(depth + 0.7);
    if (this.indicatorText) this.indicatorText.setDepth(depth + 0.8);
    if (this.indicatorTextSub) this.indicatorTextSub.setDepth(depth + 0.75);
    this.runeParticles.forEach(p => p.setDepth(depth + 0.5));
  }

  public destroy(): void {
    this.body.destroy();
    this.topCollider.destroy();
    if (this.wallCollider) this.wallCollider.destroy();
    this.mossDecorations.forEach(d => d.destroy());
    this.runeTrim.forEach(r => r.destroy());
    this.runeParticles.forEach(p => p.destroy());
    if (this.landingGlow) this.landingGlow.destroy();
    if (this.landingGlowOuter) this.landingGlowOuter.destroy();
    if (this.beaconPillar) this.beaconPillar.destroy();
    if (this.indicatorText) this.indicatorText.destroy();
    if (this.indicatorTextSub) this.indicatorTextSub.destroy();
    this.tweens.forEach(t => t.destroy());
  }

// ═══════════════════════════════════════════════════════════════════════════
// 0. SILHOUETTE OUTLINE — dimly visible platform outline in complete darkness
// ═══════════════════════════════════════════════════════════════════════════
  private createSilhouetteOutline(x: number, y: number, w: number, h: number): void {
    const halfW = w / 2;
    const halfH = h / 2;

    // Two thin vertical lines on the sides — always visible
    const leftLine = this.scene.add.rectangle(x - halfW + 1, y, 2, h, 0x4a6a8a, 0.15);
    leftLine.setDepth(this.cfg.depth + 0.05);
    this.runeTrim.push(leftLine);

    const rightLine = this.scene.add.rectangle(x + halfW - 1, y, 2, h, 0x4a6a8a, 0.15);
    rightLine.setDepth(this.cfg.depth + 0.05);
    this.runeTrim.push(rightLine);
  }

// ═══════════════════════════════════════════════════════════════════════════
// 1. GIANT BEACON PILLAR — 150px tall, fast pulsing, visible from across
//    the entire 4800px level. Cannot be missed.
// ═══════════════════════════════════════════════════════════════════════════
  private createBeaconLight(x: number, topY: number): void {
    if (!this.cfg.showBeacon) return;

    const beaconHeight = 150;
    const beaconY = topY - this.cfg.topColliderThickness / 2 - beaconHeight / 2;
    const runeColor = this.cfg.runeColor;

    // Core beam — tall, bright cyan
    this.beaconPillar = this.scene.add.rectangle(x, beaconY, 8, beaconHeight, 0x88ddff, 0.25);
    this.beaconPillar.setDepth(this.cfg.depth + 0.7);

    // Mid glow — wider
    const midBeacon = this.scene.add.rectangle(x, beaconY, 24, beaconHeight, runeColor, 0.1);
    midBeacon.setDepth(this.cfg.depth + 0.65);
    this.runeTrim.push(midBeacon);

    // Outer glow — very wide
    const outerBeacon = this.scene.add.rectangle(x, beaconY, 50, beaconHeight, 0x44ddff, 0.04);
    outerBeacon.setDepth(this.cfg.depth + 0.6);
    this.runeTrim.push(outerBeacon);

    // Bright tip — large glowing diamond at top
    const tip = this.scene.add.rectangle(x, beaconY - beaconHeight / 2, 14, 14, 0xaaffff, 0.6);
    tip.setDepth(this.cfg.depth + 0.75);
    this.runeTrim.push(tip);

    // Ultra-bright center point
    const core = this.scene.add.rectangle(x, beaconY - beaconHeight / 2, 4, 4, 0xffffff, 0.9);
    core.setDepth(this.cfg.depth + 0.8);
    this.runeTrim.push(core);

    // Fast pulsing — 400ms cycle
    const tween = this.scene.tweens.add({
      targets: this.beaconPillar,
      alpha: { from: 0.25, to: 0.45 },
      scaleY: { from: 1, to: 1.05 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(tween);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. GIANT FLASHING "⬇⬇ LAND HERE ⬇⬇" TEXT — 18px bold, black stroke,
  //    fast blink. VISIBLE FROM ANY DISTANCE.
  // ═══════════════════════════════════════════════════════════════════════════
  private createLandingText(x: number, topY: number): void {
    if (!this.cfg.showLandingIndicator) return;

    const textY = topY - this.cfg.topColliderThickness / 2 - 110;

    // MAIN TEXT — large, bold, impossible to miss
    this.indicatorText = this.scene.add.text(x, textY, '⬇⬇ LAND ⬇⬇', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#44ddff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.indicatorText.setDepth(this.cfg.depth + 0.8);

    // SUB TEXT — "HERE" below
    this.indicatorTextSub = this.scene.add.text(x, textY + 22, '══ HERE ══', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#88ddff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.indicatorTextSub.setDepth(this.cfg.depth + 0.78);

    // Rapid blink — 350ms cycle
    const tween = this.scene.tweens.add({
      targets: this.indicatorText,
      alpha: { from: 1, to: 0.2 },
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(tween);

    const tween2 = this.scene.tweens.add({
      targets: this.indicatorTextSub,
      alpha: { from: 0.9, to: 0.15 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 150,
    });
    this.tweens.push(tween2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MASSIVE LANDING GLOW — wide blazing bar on the surface, fast pulse
  // ═══════════════════════════════════════════════════════════════════════════
  private createLandingGlow(x: number, topY: number): void {
    if (!this.cfg.showLandingIndicator) return;

    const glowY = topY - this.cfg.topColliderThickness / 2 + 2;
    const runeColor = this.cfg.runeColor;

    // INNER GLOW — bright, thick, pulses wildly
    this.landingGlow = this.scene.add.rectangle(
      x, glowY,
      this.cfg.width + 20, 8,
      runeColor, 0.7,
    );
    this.landingGlow.setDepth(this.cfg.depth + 0.6);

    const tween = this.scene.tweens.add({
      targets: this.landingGlow,
      alpha: { from: 0.7, to: 1.0 },
      scaleY: { from: 1, to: 1.6 },
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(tween);

    // MIDDLE GLOW — wider, still bright
    this.landingGlowOuter = this.scene.add.rectangle(
      x, glowY,
      this.cfg.width + 40, 12,
      0x88ddff, 0.25,
    );
    this.landingGlowOuter.setDepth(this.cfg.depth + 0.55);

    const tween2 = this.scene.tweens.add({
      targets: this.landingGlowOuter,
      alpha: { from: 0.25, to: 0.5 },
      scaleY: { from: 1, to: 1.8 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(tween2);

    // OUTER GLOW — massive, subtle
    const outerMost = this.scene.add.rectangle(
      x, glowY,
      this.cfg.width + 60, 16,
      0x44ddff, 0.1,
    );
    outerMost.setDepth(this.cfg.depth + 0.5);

    const tween3 = this.scene.tweens.add({
      targets: outerMost,
      alpha: { from: 0.1, to: 0.2 },
      scaleY: { from: 1, to: 2.0 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(tween3);
    this.runeTrim.push(outerMost);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GLOWING RUNE TRIM — bright cyan edge trim along the top
  // ═══════════════════════════════════════════════════════════════════════════
  private createGlowingRuneTrim(x: number, topY: number): void {
    const halfW = this.cfg.width / 2;
    const trimY = topY - this.cfg.topColliderThickness / 2 + 1;
    const runeColor = this.cfg.runeColor;

    // Main glowing bar
    const glowBar = this.scene.add.rectangle(x, trimY, this.cfg.width + 12, 3, runeColor, 0.6);
    glowBar.setDepth(this.cfg.depth + 0.3);
    this.runeTrim.push(glowBar);

    const outerGlow = this.scene.add.rectangle(x, trimY, this.cfg.width + 20, 5, runeColor, 0.15);
    outerGlow.setDepth(this.cfg.depth + 0.25);
    this.runeTrim.push(outerGlow);

    // Rune symbols
    const runeCount = Math.max(3, Math.floor(this.cfg.width / 20));
    for (let i = 0; i < runeCount; i++) {
      const rx = x - halfW + 4 + (this.cfg.width / runeCount) * i;
      const rune = this.scene.add.rectangle(rx, trimY, 3, 2.5, 0xaaffff, 1);
      rune.setDepth(this.cfg.depth + 0.35);
      this.runeTrim.push(rune);

      const tween = this.scene.tweens.add({
        targets: rune,
        alpha: { from: 1, to: 0.2 },
        scaleY: { from: 1, to: 3 },
        duration: Phaser.Math.Between(600, 1200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 80,
      });
      this.tweens.push(tween);
    }

    // Corner runes
    for (const side of [-1, 1]) {
      const cornerRune = this.scene.add.rectangle(x + side * (halfW - 2), trimY, 5, 5, 0xaaffff, 0.9);
      cornerRune.setDepth(this.cfg.depth + 0.4);
      this.runeTrim.push(cornerRune);

      const tween = this.scene.tweens.add({
        targets: cornerRune,
        alpha: { from: 0.9, to: 0.1 },
        scale: { from: 1, to: 2 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: side > 0 ? 150 : 0,
      });
      this.tweens.push(tween);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PHOSPHORESCENT MOSS — bright teal-green, visible in darkness
  // ═══════════════════════════════════════════════════════════════════════════
  private createPhosphorescentMoss(x: number, topY: number): void {
    const halfW = this.cfg.width / 2;
    const mossY = topY - this.cfg.topColliderThickness / 2 - 1;

    const brightMossColor = 0x4a8a6a;
    const mossCount = Phaser.Math.Between(3, 6);
    for (let i = 0; i < mossCount; i++) {
      const mx = x + Phaser.Math.Between(-halfW + 4, halfW - 4);
      const my = mossY - Phaser.Math.Between(1, 5);
      const mw = Phaser.Math.Between(8, 18);
      const mh = Phaser.Math.Between(3, 7);

      const moss = this.scene.add.rectangle(mx, my, mw, mh, brightMossColor, 0.7);
      moss.setDepth(this.cfg.depth + 0.2);
      moss.setAngle(Phaser.Math.Between(-10, 10));
      this.mossDecorations.push(moss);

      const glow = this.scene.add.rectangle(mx, my, mw + 8, mh + 6, 0x66ffaa, 0.15);
      glow.setDepth(this.cfg.depth + 0.15);
      this.mossDecorations.push(glow);

      const tween = this.scene.tweens.add({
        targets: moss,
        alpha: { from: 0.7, to: 0.4 },
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 200,
      });
      this.tweens.push(tween);
    }

    const grassCount = Phaser.Math.Between(2, 5);
    for (let i = 0; i < grassCount; i++) {
      const gx = x + Phaser.Math.Between(-halfW + 4, halfW - 4);
      const gy = mossY - 1;
      const gh = Phaser.Math.Between(6, 14);

      const grass = this.scene.add.rectangle(gx, gy - gh / 2, 1.5, gh, 0x88ddcc, 0.5);
      grass.setDepth(this.cfg.depth + 0.25);
      grass.setAngle(Phaser.Math.Between(-20, 20));
      this.mossDecorations.push(grass);

      const tween = this.scene.tweens.add({
        targets: grass,
        angle: grass.angle + Phaser.Math.Between(-5, 5),
        duration: Phaser.Math.Between(1500, 2500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 150,
      });
      this.tweens.push(tween);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. FLOATING RUNE PARTICLES — visible in darkness, float upward
  // ═══════════════════════════════════════════════════════════════════════════
  private createRuneParticles(x: number, topY: number): void {
    if (!this.cfg.showRuneParticles) return;

    const halfW = this.cfg.width / 2;
    const particleCount = Phaser.Math.Between(4, 8);

    for (let i = 0; i < particleCount; i++) {
      const px = x + Phaser.Math.Between(-halfW + 8, halfW - 8);
      const py = topY - this.cfg.topColliderThickness / 2 - Phaser.Math.Between(10, 30);
      const size = Phaser.Math.Between(2, 4);

      const particle = this.scene.add.rectangle(px, py, size, size, 0x88ddff, 0.7);
      particle.setDepth(this.cfg.depth + 0.5);
      this.runeParticles.push(particle);

      const tween = this.scene.tweens.add({
        targets: particle,
        y: py - Phaser.Math.Between(20, 40),
        x: px + Phaser.Math.Between(-10, 10),
        alpha: { from: 0.7, to: 0 },
        scaleX: { from: 1, to: 0.2 },
        scaleY: { from: 1, to: 0.2 },
        duration: Phaser.Math.Between(1500, 3000),
        repeat: -1,
        ease: 'Sine.easeOut',
        delay: i * 300,
      });
      this.tweens.push(tween);
    }
  }
}

// ── Procedural texture generation ──────────────────────────────────────────────
function generatePillarTexture(
  scene: Phaser.Scene,
  stoneColor: number,
  mossColor: number,
  runeColor: number,
): void {
  if (scene.textures.exists(PILLAR_TEX_KEY)) return;

  const g = scene.add.graphics();
  const size = 64;

  g.fillStyle(stoneColor, 1);
  g.fillRect(0, 0, size, size);

  const darkBand = Phaser.Display.Color.IntegerToColor(stoneColor).darken(10).color;
  const lightBand = Phaser.Display.Color.IntegerToColor(stoneColor).lighten(12).color;
  for (let row = 0; row < 10; row++) {
    const ry = row * 6 + Phaser.Math.Between(0, 3);
    const bandColor = row % 3 === 0 ? darkBand : lightBand;
    g.fillStyle(bandColor, 0.25);
    g.fillRect(Phaser.Math.Between(0, 4), ry, size - Phaser.Math.Between(0, 8), Phaser.Math.Between(2, 5));
  }

  g.lineStyle(1.5, runeColor, 0.15);
  for (let v = 0; v < 3; v++) {
    const startX = Phaser.Math.Between(5, size - 5);
    const startY = Phaser.Math.Between(10, size - 10);
    g.beginPath();
    g.moveTo(startX, startY);
    let cx = startX;
    let cy = startY;
    for (let seg = 0; seg < 4; seg++) {
      cx += Phaser.Math.Between(-10, 10);
      cy += Phaser.Math.Between(8, 18);
      g.lineTo(cx, cy);
    }
    g.strokePath();
    g.fillStyle(runeColor, 0.1);
    g.fillCircle(startX, startY, Phaser.Math.Between(2, 4));
  }

  g.lineStyle(2, 0x000000, 0.3);
  for (let c = 0; c < 5; c++) {
    const startX = Phaser.Math.Between(5, size - 5);
    const startY = Phaser.Math.Between(8, size - 8);
    g.beginPath();
    g.moveTo(startX, startY);
    let cx = startX;
    let cy = startY;
    for (let seg = 0; seg < 3; seg++) {
      cx += Phaser.Math.Between(-12, 12);
      cy += Phaser.Math.Between(6, 20);
      g.lineTo(cx, cy);
    }
    g.strokePath();
  }

  const brightMoss = Phaser.Display.Color.IntegerToColor(mossColor).lighten(20).color;
  g.fillStyle(brightMoss, 0.7);
  g.beginPath();
  g.moveTo(0, 0);
  for (let i = 0; i <= 10; i++) {
    const mx = (i / 10) * size;
    const my = Phaser.Math.Between(0, 6);
    g.lineTo(mx, my);
  }
  g.lineTo(size, 0);
  g.closePath();
  g.fill();

  g.fillStyle(0x66ffaa, 0.25);
  for (let m = 0; m < 10; m++) {
    g.fillCircle(Phaser.Math.Between(4, size - 4), Phaser.Math.Between(1, 8), Phaser.Math.Between(2, 6));
  }

  g.fillStyle(runeColor, 0.12);
  for (let r = 0; r < 3; r++) {
    const rx = Phaser.Math.Between(8, size - 8);
    const ry = Phaser.Math.Between(12, size - 12);
    g.fillTriangle(rx, ry - 3, rx - 2, ry, rx + 2, ry);
    g.fillTriangle(rx, ry + 3, rx - 2, ry, rx + 2, ry);
  }

  g.fillStyle(runeColor, 0.15);
  g.fillRect(0, 0, size, 2);

  g.fillStyle(0x000000, 0.3);
  g.fillRect(0, size - 4, size, 4);

  g.generateTexture(PILLAR_TEX_KEY, size, size);
  g.destroy();
}