// ─────────────────────────────────────────────────────────────────────────────
// PlatformLedge.ts — Thin horizontal platform ledges with a high-contrast
// visible rim that renders at full brightness through the Light2D darkness.
// ─────────────────────────────────────────────────────────────────────────────
//
// PROBLEM: The game uses Light2D with near-black ambient (0x0a1218).
// The existing addPlatform() creates thin rectangles with setPipeline('Light2D')
// that are COMPLETELY INVISIBLE in darkness.
//
// SOLUTION: Each platform ledge has THREE layers:
//   1. VISIBLE RIM (no Light2D)  — a thin bright strip along the top edge
//      that always renders at full brightness. This is the "ground line"
//      the player sees to know where to jump.
//   2. GLOW BAR (no Light2D)     — a pulsing cyan light bar on the surface
//   3. FULL BODY (Light2D)       — the stone body that lights up when the
//      player's torch is near (dramatic dark fantasy reveal effect)
//
// USAGE (drop-in replacement for addPlatform):
//   const ledge = new PlatformLedge(scene, x, y, width, height);
//   ledge.addToGroup(platformGroup);

import Phaser from 'phaser';

export interface PlatformLedgeConfig {
  /** Width of the ledge in pixels */
  width: number;
  /** Height of the ledge in pixels */
  height: number;
  /** Color of the visible rim strip (bright, no Light2D) */
  rimColor?: number;
  /** Color of the stone body (uses Light2D) */
  stoneColor?: number;
  /** Scene depth */
  depth?: number;
  /** Whether to show the pulsing glow bar on top */
  showGlow?: boolean;
  /** Whether to show floating particles above */
  showParticles?: boolean;
}

const DEFAULT_CONFIG: Required<PlatformLedgeConfig> = {
  width: 160,
  height: 20,
  rimColor: 0x44ddff,
  stoneColor: 0x2a3a4a,
  depth: 0,
  showGlow: true,
  showParticles: true,
};

export class PlatformLedge {
  /** The stone body (uses Light2D — visible when player's light is near) */
  public body: Phaser.GameObjects.Rectangle;
  /** The visible rim strip (ALWAYS VISIBLE — no Light2D) */
  public rim: Phaser.GameObjects.Rectangle;
  /** The pulsing glow bar */
  public glow: Phaser.GameObjects.Rectangle | null = null;
  /** The physics collider sprite */
  public collider: Phaser.Physics.Arcade.Sprite;
  /** Floating particles */
  public particles: Phaser.GameObjects.Rectangle[] = [];
  /** Tween references for cleanup */
  private tweens: Phaser.Tweens.Tween[] = [];
  private cfg: Required<PlatformLedgeConfig>;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, config?: Partial<PlatformLedgeConfig>) {
    this.scene = scene;
    this.cfg = { ...DEFAULT_CONFIG, ...config };

    const halfH = this.cfg.height / 2;
    const rimThickness = 3;

    // 1. STONE BODY (Light2D — invisible in darkness, dramatic reveal when lit)
    this.body = scene.add.rectangle(x, y, this.cfg.width, this.cfg.height, this.cfg.stoneColor, 1);
    this.body.setDepth(this.cfg.depth);
    this.body.setPipeline('Light2D');

    // 2. VISIBLE RIM (NO Light2D — always visible!)
    // This is a thin bright strip along the top edge that the player can
    // always see, even in complete darkness.
    const rimY = y - halfH + rimThickness / 2;
    this.rim = scene.add.rectangle(x, rimY, this.cfg.width + 4, rimThickness, this.cfg.rimColor, 0.6);
    this.rim.setDepth(this.cfg.depth + 0.3);

    // 3. COLLIDER (invisible physics body)
    this.collider = scene.physics.add.sprite(x, y, 'platform_tex');
    this.collider.setDisplaySize(this.cfg.width, this.cfg.height);
    this.collider.setImmovable(true);
    (this.collider.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.collider.setVisible(false);
    this.collider.setDepth(this.cfg.depth);

    // 4. GLOW BAR
    if (this.cfg.showGlow) {
      this.createGlowBar(x, rimY);
    }

    // 5. FLOATING PARTICLES
    if (this.cfg.showParticles) {
      this.createParticles(x, rimY);
    }
  }

  public addToGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    const staticSprite = group.create(
      this.collider.x,
      this.collider.y,
      this.collider.texture.key,
    ) as Phaser.Physics.Arcade.Sprite;
    staticSprite.setDisplaySize(this.collider.displayWidth, this.collider.displayHeight);
    staticSprite.refreshBody();
    staticSprite.setVisible(false);
    staticSprite.setPipeline('Light2D');
    this.collider.destroy();
    this.collider = staticSprite;
  }

  public setDepth(depth: number): void {
    this.body.setDepth(depth);
    this.rim.setDepth(depth + 0.3);
    if (this.glow) this.glow.setDepth(depth + 0.4);
    this.collider.setDepth(depth);
    this.particles.forEach(p => p.setDepth(depth + 0.5));
  }

  public destroy(): void {
    this.body.destroy();
    this.rim.destroy();
    if (this.glow) this.glow.destroy();
    this.collider.destroy();
    this.particles.forEach(p => p.destroy());
    this.tweens.forEach(t => t.destroy());
  }

  private createGlowBar(x: number, rimY: number): void {
    const glowY = rimY + 2;
    this.glow = this.scene.add.rectangle(
      x, glowY,
      this.cfg.width + 6, 4,
      this.cfg.rimColor, 0.3,
    );
    this.glow.setDepth(this.cfg.depth + 0.4);

    const tween = this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.3, to: 0.6 },
      scaleY: { from: 1, to: 1.5 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(tween);
  }

  private createParticles(x: number, rimY: number): void {
    const halfW = this.cfg.width / 2;
    const count = Phaser.Math.Between(2, 4);

    for (let i = 0; i < count; i++) {
      const px = x + Phaser.Math.Between(-halfW + 6, halfW - 6);
      const py = rimY - Phaser.Math.Between(6, 16);
      const size = Phaser.Math.Between(1, 2);

      const p = this.scene.add.rectangle(px, py, size, size, 0x88ddff, 0.5);
      p.setDepth(this.cfg.depth + 0.5);
      this.particles.push(p);

      const tween = this.scene.tweens.add({
        targets: p,
        y: py - Phaser.Math.Between(10, 20),
        alpha: { from: 0.5, to: 0 },
        scaleX: { from: 1, to: 0.3 },
        scaleY: { from: 1, to: 0.3 },
        duration: Phaser.Math.Between(1500, 2500),
        repeat: -1,
        ease: 'Sine.easeOut',
        delay: i * 300,
      });
      this.tweens.push(tween);
    }
  }
}

// ── Helper function to batch-create ledges from existing platform defs ─────────
export function createPlatformLedges(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.StaticGroup,
  defs: [number, number, number, number][],
): PlatformLedge[] {
  return defs.map(([x, y, w, h]) => {
    const ledge = new PlatformLedge(scene, x + w / 2, y + h / 2, {
      width: w,
      height: h,
    });
    ledge.addToGroup(group);
    return ledge;
  });
}