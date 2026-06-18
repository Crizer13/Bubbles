// ─────────────────────────────────────────────────────────────────────────────
// ParallaxBackground.ts — 3-layer parallax scrolling background system for
// dark cinematic pixel-art aesthetics.
// ─────────────────────────────────────────────────────────────────────────────
//
// LAYERS:
//   Layer 1 (Closest): Dark silhouetted mid-ground structures
//   Layer 2 (Mid):     Weathered brick/stone walls fading into blue mist
//   Layer 3 (Far):     Deep gradient blue fog moving very slowly
//
// USAGE:
//   const parallax = new ParallaxBackground(scene, levelWidth, levelHeight);
//   parallax.create();
//   // In scene.update():
//   parallax.update(camera);

import Phaser from 'phaser';

// ── Configuration ──────────────────────────────────────────────────────────────
export interface ParallaxLayerConfig {
  /** Scroll speed multiplier relative to camera (0 = static, 1 = follows camera) */
  scrollFactor: number;
  /** Alpha / opacity of the layer */
  alpha: number;
  /** Depth in the scene (lower = farther back) */
  depth: number;
  /** Whether to tile horizontally */
  tileHorizontally: boolean;
  /** Whether to tile vertically */
  tileVertically: boolean;
}

export interface ParallaxBackgroundConfig {
  /** Width of the level in pixels */
  levelWidth: number;
  /** Height of the level in pixels */
  levelHeight: number;
  /** Color for Layer 1 (closest — silhouetted structures) */
  layer1Color?: number;
  /** Color for Layer 2 (mid — weathered walls) */
  layer2Color?: number;
  /** Color for Layer 3 (far — deep blue fog) */
  layer3Color?: number;
  /** Number of structure columns in Layer 1 */
  layer1StructureCount?: number;
  /** Number of wall segments in Layer 2 */
  layer2WallCount?: number;
  /** Fog density in Layer 3 (number of fog patches) */
  layer3FogPatches?: number;
}

const DEFAULT_CONFIG: Required<ParallaxBackgroundConfig> = {
  levelWidth: 4800,
  levelHeight: 1080,
  layer1Color: 0x0a1218,
  layer2Color: 0x0e1a2a,
  layer3Color: 0x040a12,
  layer1StructureCount: 12,
  layer2WallCount: 8,
  layer3FogPatches: 15,
};

// ── Layer definitions ──────────────────────────────────────────────────────────
const LAYER_DEFS: ParallaxLayerConfig[] = [
  // Layer 1 — Closest: silhouetted mid-ground structures
  { scrollFactor: 0.3, alpha: 0.7, depth: -8, tileHorizontally: true, tileVertically: false },
  // Layer 2 — Mid: weathered brick/stone walls fading into blue mist
  { scrollFactor: 0.15, alpha: 0.5, depth: -10, tileHorizontally: true, tileVertically: false },
  // Layer 3 — Far: deep gradient blue fog
  { scrollFactor: 0.05, alpha: 0.3, depth: -12, tileHorizontally: true, tileVertically: true },
];

// ── ParallaxBackground ─────────────────────────────────────────────────────────
export class ParallaxBackground {
  private scene: Phaser.Scene;
  private cfg: Required<ParallaxBackgroundConfig>;

  /** All game objects created for the parallax layers */
  private layerObjects: Phaser.GameObjects.GameObject[][] = [[], [], []];

  /** Graphics objects for each layer (used for redrawing on camera move) */
  private layerGraphics: (Phaser.GameObjects.Graphics | null)[] = [null, null, null];

  /** Camera reference for scroll tracking */
  private camera: Phaser.Cameras.Scene2D.Camera | null = null;

  /** Last camera position for dirty-checking */
  private lastCamX: number = 0;
  private lastCamY: number = 0;

  constructor(scene: Phaser.Scene, config: ParallaxBackgroundConfig) {
    this.scene = scene;
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Create all parallax layers ──────────────────────────────────────────────
  public create(): void {
    this.camera = this.scene.cameras.main;

    this.createLayer3_FarFog();
    this.createLayer2_MidWalls();
    this.createLayer1_Structures();

    this.lastCamX = this.camera.scrollX;
    this.lastCamY = this.camera.scrollY;
  }

  // ── Update — call from scene.update() ──────────────────────────────────────
  public update(): void {
    if (!this.camera) return;

    const camX = this.camera.scrollX;
    const camY = this.camera.scrollY;

    // Only redraw if camera has moved significantly
    if (Math.abs(camX - this.lastCamX) < 2 && Math.abs(camY - this.lastCamY) < 2) return;

    this.lastCamX = camX;
    this.lastCamY = camY;

    // Reposition layer objects based on scroll factors
    this.updateLayerPositions(camX, camY);
  }

  // ── Destroy all layers ─────────────────────────────────────────────────────
  public destroy(): void {
    this.layerObjects.forEach(layer => {
      layer.forEach(obj => obj.destroy());
    });
    this.layerGraphics.forEach(g => {
      if (g) g.destroy();
    });
  }

  // ── Layer 1: Silhouetted mid-ground structures ────────────────────────────
  private createLayer1_Structures(): void {
    const g = this.scene.add.graphics();
    g.setDepth(LAYER_DEFS[0].depth);
    g.setAlpha(LAYER_DEFS[0].alpha);
    this.layerGraphics[0] = g;
    this.layerObjects[0].push(g);

    const w = this.cfg.levelWidth;
    const h = this.cfg.levelHeight;
    const color = this.cfg.layer1Color;

    // Draw structures across the level width
    for (let i = 0; i < this.cfg.layer1StructureCount; i++) {
      const sx = (i / this.cfg.layer1StructureCount) * w + Phaser.Math.Between(-40, 40);
      const structH = Phaser.Math.Between(200, 500);
      const structW = Phaser.Math.Between(40, 100);

      // Main structure body
      g.fillStyle(color, 1);
      g.fillRect(sx, h - structH, structW, structH);

      // Jagged top
      g.beginPath();
      g.moveTo(sx, h - structH);
      const topJags = Phaser.Math.Between(3, 6);
      for (let j = 0; j < topJags; j++) {
        const jx = sx + (structW / topJags) * j;
        const jy = h - structH - Phaser.Math.Between(5, 20);
        g.lineTo(jx, jy);
      }
      g.lineTo(sx + structW, h - structH);
      g.closePath();
      g.fill();

      // Window openings (dark voids)
      g.fillStyle(0x000000, 0.4);
      const winCount = Phaser.Math.Between(1, 3);
      for (let ww = 0; ww < winCount; ww++) {
        const winX = sx + Phaser.Math.Between(8, structW - 16);
        const winY = h - structH + Phaser.Math.Between(30, structH - 60);
        g.fillRect(winX, winY, Phaser.Math.Between(8, 16), Phaser.Math.Between(12, 20));
      }

      // Broken archway at base
      g.fillStyle(0x000000, 0.3);
      g.fillRect(sx + structW * 0.2, h - 40, structW * 0.6, 40);
      g.fillStyle(color, 1);
      g.fillRect(sx + structW * 0.2, h - 40, structW * 0.6, 4);
    }

    // Additional small debris / rubble at the base
    g.fillStyle(Phaser.Display.Color.IntegerToColor(color).lighten(4).color, 0.3);
    for (let d = 0; d < 20; d++) {
      const dx = Phaser.Math.Between(0, w);
      const dy = h - Phaser.Math.Between(5, 20);
      g.fillRect(dx, dy, Phaser.Math.Between(3, 10), Phaser.Math.Between(2, 5));
    }
  }

  // ── Layer 2: Weathered brick/stone walls fading into blue mist ────────────
  private createLayer2_MidWalls(): void {
    const g = this.scene.add.graphics();
    g.setDepth(LAYER_DEFS[1].depth);
    g.setAlpha(LAYER_DEFS[1].alpha);
    this.layerGraphics[1] = g;
    this.layerObjects[1].push(g);

    const w = this.cfg.levelWidth;
    const h = this.cfg.levelHeight;
    const color = this.cfg.layer2Color;

    // Draw wall segments
    for (let i = 0; i < this.cfg.layer2WallCount; i++) {
      const wx = (i / this.cfg.layer2WallCount) * w + Phaser.Math.Between(-30, 30);
      const wallH = Phaser.Math.Between(300, 600);
      const wallW = Phaser.Math.Between(80, 160);

      // Wall body
      g.fillStyle(color, 1);
      g.fillRect(wx, h - wallH, wallW, wallH);

      // Brick pattern
      const brickColor = Phaser.Display.Color.IntegerToColor(color).lighten(6).color;
      g.lineStyle(1, brickColor, 0.15);
      const brickRows = Math.floor(wallH / 16);
      for (let row = 0; row < brickRows; row++) {
        const by = h - wallH + row * 16;
        const offset = row % 2 === 0 ? 0 : 8;
        g.beginPath();
        g.moveTo(wx, by);
        g.lineTo(wx + wallW, by);
        g.strokePath();

        // Vertical brick lines
        for (let bx = offset; bx < wallW; bx += 24) {
          g.beginPath();
          g.moveTo(wx + bx, by);
          g.lineTo(wx + bx, by + 16);
          g.strokePath();
        }
      }

      // Weathered patches (fading into mist)
      g.fillStyle(Phaser.Display.Color.IntegerToColor(color).lighten(10).color, 0.08);
      for (let p = 0; p < 4; p++) {
        g.fillEllipse(
          wx + Phaser.Math.Between(10, wallW - 10),
          h - wallH + Phaser.Math.Between(20, wallH - 20),
          Phaser.Math.Between(20, 50),
          Phaser.Math.Between(15, 40),
        );
      }

      // Top edge — crumbling
      g.fillStyle(0x000000, 0.2);
      g.fillRect(wx, h - wallH, wallW, Phaser.Math.Between(3, 8));
    }

    // Blue mist gradient overlay at the top of the walls
    g.fillGradientStyle(0x0a1a2e, 0x0a1a2e, 0x000000, 0x000000, 0.15);
    g.fillRect(0, 0, w, h * 0.3);
  }

  // ── Layer 3: Deep gradient blue fog ───────────────────────────────────────
  private createLayer3_FarFog(): void {
    const g = this.scene.add.graphics();
    g.setDepth(LAYER_DEFS[2].depth);
    g.setAlpha(LAYER_DEFS[2].alpha);
    this.layerGraphics[2] = g;
    this.layerObjects[2].push(g);

    const w = this.cfg.levelWidth;
    const h = this.cfg.levelHeight;
    const color = this.cfg.layer3Color;

    // Deep gradient background
    g.fillGradientStyle(0x02060a, 0x040a12, 0x0a1624, 0x0e1e30, 1);
    g.fillRect(0, 0, w, h);

    // Fog patches — large, soft ellipses
    const fogColor = 0x0a1a2e;
    for (let f = 0; f < this.cfg.layer3FogPatches; f++) {
      const fx = Phaser.Math.Between(0, w);
      const fy = Phaser.Math.Between(0, h);
      const fw = Phaser.Math.Between(300, 800);
      const fh = Phaser.Math.Between(100, 300);
      const fogAlpha = Phaser.Math.FloatBetween(0.02, 0.06);

      g.fillStyle(fogColor, fogAlpha);
      g.fillEllipse(fx, fy, fw, fh);
    }

    // Horizontal mist bands
    g.fillStyle(0x0a1a2e, 0.03);
    for (let b = 0; b < 5; b++) {
      const by = Phaser.Math.Between(0, h);
      g.fillRect(0, by, w, Phaser.Math.Between(40, 100));
    }

    // Subtle vertical light shafts from above
    g.fillStyle(0x1a2a3e, 0.02);
    for (let s = 0; s < 6; s++) {
      const sx = Phaser.Math.Between(0, w);
      g.fillTriangle(
        sx - Phaser.Math.Between(10, 30), 0,
        sx + Phaser.Math.Between(10, 30), 0,
        sx + Phaser.Math.Between(-20, 20), h,
      );
    }
  }

  // ── Update layer positions based on camera scroll ─────────────────────────
  private updateLayerPositions(camX: number, camY: number): void {
    // For graphics-based layers, we redraw with offset
    // This is more efficient than moving individual objects for large parallax
    this.redrawLayer(0, camX, camY);
    this.redrawLayer(1, camX, camY);
    this.redrawLayer(2, camX, camY);
  }

  private redrawLayer(layerIndex: number, camX: number, camY: number): void {
    const g = this.layerGraphics[layerIndex];
    if (!g) return;

    const cfg = LAYER_DEFS[layerIndex];
    const offsetX = camX * cfg.scrollFactor;
    const offsetY = camY * cfg.scrollFactor;

    // For graphics-based layers, we use setPosition to offset the entire graphics object
    // This creates the parallax effect without redrawing
    g.setPosition(-offsetX, -offsetY);
  }
}