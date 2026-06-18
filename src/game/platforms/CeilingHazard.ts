// ─────────────────────────────────────────────────────────────────────────────
// CeilingHazard.ts — Jagged, massive dark ceilings with decorative hanging
// elements (vines, chains, stalactites) that create hazard zones.
// ─────────────────────────────────────────────────────────────────────────────
//
// USAGE:
//   // Single ceiling chunk
//   const ceiling = new CeilingHazard(scene, x, y, width, height);
//   ceiling.addToGroup(hazardGroup);
//
//   // With hanging vines
//   ceiling.addHangingVines(5);
//
//   // With chains
//   ceiling.addRustedChains(3);

import Phaser from 'phaser';

// ── Configuration ──────────────────────────────────────────────────────────────
export interface CeilingHazardConfig {
  /** Width of the ceiling chunk in pixels */
  width: number;
  /** Height of the ceiling chunk in pixels */
  height: number;
  /** Base color for the ceiling stone */
  baseColor?: number;
  /** Number of jagged teeth / stalactites along the bottom edge */
  jaggedCount?: number;
  /** How far the jagged points extend downward (pixels) */
  jaggedDepth?: number;
  /** Whether to generate a procedural texture */
  generateTexture?: boolean;
  /** Existing texture key */
  textureKey?: string;
  /** Scene depth */
  depth?: number;
}

export interface HangingVineConfig {
  /** Number of vine segments */
  segments?: number;
  /** Length of each segment in pixels */
  segmentLength?: number;
  /** Color of the vine */
  vineColor?: number;
  /** Whether the vine sways with a tween */
  sway?: boolean;
  /** Maximum sway offset in pixels */
  swayAmount?: number;
}

export interface HangingChainConfig {
  /** Number of chain links */
  links?: number;
  /** Length of each link in pixels */
  linkLength?: number;
  /** Color of the chain */
  chainColor?: number;
  /** Whether the chain sways */
  sway?: boolean;
  /** Sway amount */
  swayAmount?: number;
  /** Whether to attach a weight/hook at the bottom */
  hasWeight?: boolean;
}

const DEFAULT_CEILING_CONFIG: Required<Omit<CeilingHazardConfig, 'textureKey'>> = {
  width: 128,
  height: 64,
  baseColor: 0x0a0e14,
  jaggedCount: 6,
  jaggedDepth: 20,
  generateTexture: true,
  depth: -3,
};

const DEFAULT_VINE_CONFIG: Required<HangingVineConfig> = {
  segments: 6,
  segmentLength: 12,
  vineColor: 0x0a2018,
  sway: true,
  swayAmount: 4,
};

const DEFAULT_CHAIN_CONFIG: Required<HangingChainConfig> = {
  links: 5,
  linkLength: 10,
  chainColor: 0x1a1a20,
  sway: true,
  swayAmount: 3,
  hasWeight: true,
};

// ── Texture key ────────────────────────────────────────────────────────────────
const CEILING_TEX_KEY = 'ceiling_tex';

// ── HangingElement base (decorative child) ─────────────────────────────────────
export interface HangingElement {
  /** All game objects that make up this hanging element */
  parts: Phaser.GameObjects.Rectangle[];
  /** Destroy this element and clean up tweens */
  destroy: () => void;
}

// ── CeilingHazard ──────────────────────────────────────────────────────────────
export class CeilingHazard {
  /** The visual body of the ceiling chunk */
  public body: Phaser.GameObjects.Rectangle;
  /** The physics collider (invisible, used for hazard detection) */
  public collider: Phaser.Physics.Arcade.Sprite;
  /** Array of hanging decorative elements (vines, chains) */
  public hangingElements: HangingElement[] = [];
  /** Tween references for cleanup */
  private tweens: Phaser.Tweens.Tween[] = [];
  /** The scene */
  private scene: Phaser.Scene;
  /** Configuration */
  private cfg: Required<Omit<CeilingHazardConfig, 'textureKey'>>;
  /** Position */
  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config?: Partial<CeilingHazardConfig>) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.cfg = { ...DEFAULT_CEILING_CONFIG, ...config };

    // Generate texture if needed
    if (this.cfg.generateTexture) {
      generateCeilingTexture(
        scene,
        this.cfg.baseColor,
        this.cfg.jaggedCount,
        this.cfg.jaggedDepth,
      );
    }

    const texKey = config?.textureKey || CEILING_TEX_KEY;

    // ── Visual body ───────────────────────────────────────────────────────
    this.body = scene.add.rectangle(x, y, this.cfg.width, this.cfg.height, this.cfg.baseColor, 1);
    this.body.setDepth(this.cfg.depth);

    // Jagged bottom edge (visual only — decorative stalactite edge)
    this.drawJaggedBottom(scene, x, y);

    // ── Collider — invisible hazard zone ─────────────────────────────────
    this.collider = scene.physics.add.sprite(x, y, texKey);
    this.collider.setDisplaySize(this.cfg.width, this.cfg.height);
    this.collider.setImmovable(true);
    (this.collider.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.collider.setVisible(false);
    this.collider.setDepth(this.cfg.depth);
    this.collider.setPipeline('Light2D');
  }

  // ── Add to hazard group ─────────────────────────────────────────────────────
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

  // ── Add hanging vines ──────────────────────────────────────────────────────
  public addHangingVines(
    count: number = 3,
    vineConfig?: Partial<HangingVineConfig>,
  ): HangingElement[] {
    const vCfg = { ...DEFAULT_VINE_CONFIG, ...vineConfig };
    const elements: HangingElement[] = [];

    const spacing = this.cfg.width / (count + 1);
    for (let i = 0; i < count; i++) {
      const vx = this.x - this.cfg.width / 2 + spacing * (i + 1);
      const vine = this.createVine(vx, this.y + this.cfg.height / 2, vCfg);
      this.hangingElements.push(vine);
      elements.push(vine);
    }

    return elements;
  }

  // ── Add rusted chains ─────────────────────────────────────────────────────
  public addRustedChains(
    count: number = 2,
    chainConfig?: Partial<HangingChainConfig>,
  ): HangingElement[] {
    const cCfg = { ...DEFAULT_CHAIN_CONFIG, ...chainConfig };
    const elements: HangingElement[] = [];

    const spacing = this.cfg.width / (count + 1);
    for (let i = 0; i < count; i++) {
      const cx = this.x - this.cfg.width / 2 + spacing * (i + 1);
      const chain = this.createChain(cx, this.y + this.cfg.height / 2, cCfg);
      this.hangingElements.push(chain);
      elements.push(chain);
    }

    return elements;
  }

  // ── Set depth ───────────────────────────────────────────────────────────────
  public setDepth(depth: number): void {
    this.body.setDepth(depth);
    this.collider.setDepth(depth);
  }

  // ── Destroy everything ─────────────────────────────────────────────────────
  public destroy(): void {
    this.body.destroy();
    this.collider.destroy();
    this.hangingElements.forEach(el => el.destroy());
    this.tweens.forEach(t => t.destroy());
    // Destroy jagged graphics
    if (this._jaggedGraphics) this._jaggedGraphics.destroy();
  }

  // ── Private state ──────────────────────────────────────────────────────────
  private _jaggedGraphics: Phaser.GameObjects.Graphics | null = null;

  // ── Draw jagged bottom edge ────────────────────────────────────────────────
  private drawJaggedBottom(scene: Phaser.Scene, cx: number, cy: number): void {
    const g = scene.add.graphics();
    g.setDepth(this.cfg.depth + 0.01);

    const halfW = this.cfg.width / 2;
    const bottomY = cy + this.cfg.height / 2;
    const toothW = this.cfg.width / this.cfg.jaggedCount;

    g.fillStyle(this.cfg.baseColor, 1);
    g.beginPath();
    g.moveTo(cx - halfW, bottomY);

    for (let i = 0; i < this.cfg.jaggedCount; i++) {
      const tx = cx - halfW + toothW * i + toothW / 2;
      // Alternate spike directions for organic look
      const spikeDir = i % 2 === 0 ? 1 : -1;
      const depth = this.cfg.jaggedDepth + Phaser.Math.Between(-4, 4);
      g.lineTo(tx + spikeDir * 3, bottomY + depth);
      g.lineTo(cx - halfW + toothW * (i + 1), bottomY);
    }

    g.closePath();
    g.fill();

    // Shadow beneath the jagged edge
    g.fillStyle(0x000000, 0.2);
    g.fillRect(cx - halfW, bottomY + 2, this.cfg.width, this.cfg.jaggedDepth);

    // Subtle highlight on the jagged tips
    g.fillStyle(0x1a2430, 0.15);
    for (let i = 0; i < this.cfg.jaggedCount; i++) {
      const tx = cx - halfW + toothW * i + toothW / 2;
      const spikeDir = i % 2 === 0 ? 1 : -1;
      const depth = this.cfg.jaggedDepth + Phaser.Math.Between(-4, 4);
      g.fillCircle(tx + spikeDir * 3, bottomY + depth - 2, 2);
    }

    this._jaggedGraphics = g;

    // Add to scene's display list manually so it persists
    scene.children.add(g);
  }

  // ── Create a single vine ───────────────────────────────────────────────────
  private createVine(vx: number, startY: number, cfg: Required<HangingVineConfig>): HangingElement {
    const parts: Phaser.GameObjects.Rectangle[] = [];
    const tweenRefs: Phaser.Tweens.Tween[] = [];

    for (let seg = 0; seg < cfg.segments; seg++) {
      const segY = startY + seg * cfg.segmentLength + cfg.segmentLength / 2;
      const segWidth = seg === cfg.segments - 1 ? 1.5 : 2;
      const segAlpha = Phaser.Math.FloatBetween(0.2, 0.4);

      const rect = this.scene.add.rectangle(vx, segY, segWidth, cfg.segmentLength - 1, cfg.vineColor, segAlpha);
      rect.setDepth(this.cfg.depth + 0.5);
      rect.setPipeline('Light2D');
      parts.push(rect);

      if (cfg.sway) {
        const tween = this.scene.tweens.add({
          targets: rect,
          x: vx + Phaser.Math.Between(-cfg.swayAmount, cfg.swayAmount),
          duration: Phaser.Math.Between(2000, 4000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: seg * 100,
        });
        tweenRefs.push(tween);
        this.tweens.push(tween);
      }
    }

    // Small leaf/bud at the tip
    const tip = this.scene.add.rectangle(
      vx, startY + cfg.segments * cfg.segmentLength,
      2, 2,
      0x3a5a3a, 0.3,
    );
    tip.setDepth(this.cfg.depth + 0.6);
    tip.setPipeline('Light2D');
    parts.push(tip);

    return {
      parts,
      destroy: () => {
        parts.forEach(p => p.destroy());
        tweenRefs.forEach(t => t.destroy());
      },
    };
  }

  // ── Create a single chain ──────────────────────────────────────────────────
  private createChain(cx: number, startY: number, cfg: Required<HangingChainConfig>): HangingElement {
    const parts: Phaser.GameObjects.Rectangle[] = [];
    const tweenRefs: Phaser.Tweens.Tween[] = [];

    for (let link = 0; link < cfg.links; link++) {
      const linkY = startY + link * cfg.linkLength + cfg.linkLength / 2;
      const linkW = link % 2 === 0 ? 3 : 2; // Alternating link sizes

      const rect = this.scene.add.rectangle(cx, linkY, linkW, cfg.linkLength - 1, cfg.chainColor, 0.7);
      rect.setDepth(this.cfg.depth + 0.5);
      rect.setPipeline('Light2D');
      parts.push(rect);

      if (cfg.sway) {
        const tween = this.scene.tweens.add({
          targets: rect,
          x: cx + Phaser.Math.Between(-cfg.swayAmount, cfg.swayAmount),
          duration: Phaser.Math.Between(3000, 5000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: link * 80,
        });
        tweenRefs.push(tween);
        this.tweens.push(tween);
      }
    }

    // Weight / hook at the bottom
    if (cfg.hasWeight) {
      const endY = startY + cfg.links * cfg.linkLength;
      const weight = this.scene.add.rectangle(cx, endY + 4, 4, 6, 0x222230, 0.8);
      weight.setDepth(this.cfg.depth + 0.6);
      weight.setPipeline('Light2D');
      parts.push(weight);

      // Small hook curve
      const hook = this.scene.add.rectangle(cx + 3, endY + 4, 4, 2, 0x2a2a30, 0.6);
      hook.setDepth(this.cfg.depth + 0.6);
      hook.setPipeline('Light2D');
      parts.push(hook);
    }

    return {
      parts,
      destroy: () => {
        parts.forEach(p => p.destroy());
        tweenRefs.forEach(t => t.destroy());
      },
    };
  }
}

// ── Procedural ceiling texture generation ──────────────────────────────────────
function generateCeilingTexture(
  scene: Phaser.Scene,
  baseColor: number,
  jaggedCount: number,
  jaggedDepth: number,
): void {
  if (scene.textures.exists(CEILING_TEX_KEY)) return;

  const g = scene.add.graphics();
  const size = 128;

  // Base — dark massive stone
  g.fillStyle(baseColor, 1);
  g.fillRect(0, 0, size, size);

  // Organic stone bands
  for (let row = 0; row < 6; row++) {
    const ry = row * 20 + Phaser.Math.Between(0, 5);
    g.fillStyle(Phaser.Display.Color.IntegerToColor(baseColor).lighten(4).color, 0.1);
    g.fillRect(Phaser.Math.Between(0, 5), ry, size - Phaser.Math.Between(0, 10), Phaser.Math.Between(2, 4));
  }

  // Dark stains / moisture marks
  g.fillStyle(0x000000, 0.15);
  for (let s = 0; s < 5; s++) {
    g.fillEllipse(
      Phaser.Math.Between(10, size - 10),
      Phaser.Math.Between(10, size - 20),
      Phaser.Math.Between(20, 50),
      Phaser.Math.Between(10, 30),
    );
  }

  // Jagged bottom edge silhouette
  const toothW = size / jaggedCount;
  g.fillStyle(baseColor, 1);
  g.beginPath();
  g.moveTo(0, size);
  for (let i = 0; i < jaggedCount; i++) {
    const tx = toothW * i + toothW / 2;
    const spikeDir = i % 2 === 0 ? 1 : -1;
    const depth = jaggedDepth + Phaser.Math.Between(-4, 6);
    g.lineTo(tx + spikeDir * 2, size - depth);
    g.lineTo(toothW * (i + 1), size);
  }
  g.closePath();
  g.fill();

  // Small crystal / mineral deposits
  g.fillStyle(0x1a2a36, 0.08);
  for (let m = 0; m < 6; m++) {
    g.fillCircle(
      Phaser.Math.Between(10, size - 10),
      Phaser.Math.Between(5, size - 15),
      Phaser.Math.Between(3, 8),
    );
  }

  g.generateTexture(CEILING_TEX_KEY, size, size);
  g.destroy();
}