// ─────────────────────────────────────────────────────────────────────────────
// GameScene.ts — The main scene: camera, lighting, music, input, the works
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { PlayerController, PlayerInput } from './PlayerController';
import { buildLevel, LevelData } from './LevelBuilder';

export class GameScene extends Phaser.Scene {
  // -- Core objects --------------------------------------------------------
  private player!: PlayerController;
  private level!: LevelData;

  // -- Input ---------------------------------------------------------------
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyDash!: Phaser.Input.Keyboard.Key;
  private keyJump!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;

  // -- Music ---------------------------------------------------------------
  private inTriggerZone: boolean = false;

  // -- Lights --------------------------------------------------------------
  private playerLight!: Phaser.GameObjects.Light;

  // -- UI ------------------------------------------------------------------
  private stateText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private triggerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════
  create(): void {
    // ── 1. Build the level ─────────────────────────────────────────────
    this.level = buildLevel(this);

    // ── 2. Background ──────────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(0x0a0a14);

    // Parallax-style gradient background
    const bg = this.add.graphics();
    bg.setDepth(-10);
    bg.fillGradientStyle(0x0a0a14, 0x0a0a14, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, this.level.levelWidth, this.level.levelHeight);

    // Distant "stars" / particles
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, this.level.levelWidth);
      const sy = Phaser.Math.Between(0, this.level.levelHeight * 0.6);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.4);
      const size = Phaser.Math.Between(1, 3);
      const star = this.add.rectangle(sx, sy, size, size, 0xffffff, alpha);
      star.setDepth(-9);
      // Twinkle
      this.tweens.add({
        targets: star,
        alpha: { from: alpha, to: alpha * 0.3 },
        duration: Phaser.Math.Between(1500, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── 3. Lights2D setup ──────────────────────────────────────────────
    // Enable the light system with a dark ambient
    this.lights.enable();
    this.lights.setAmbientColor(0x222233);

    // Player light — warm, medium radius
    this.playerLight = this.lights.addLight(0, 0, 280, 0xffeedd, 1.8);

    // Glow-object lights
    for (const orb of this.level.glowObjects) {
      const light = this.lights.addLight(orb.x, orb.y, 180, 0x66aaff, 1.2);
      // Pulsing intensity
      this.tweens.add({
        targets: light,
        intensity: { from: 1.2, to: 0.5 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // Pulsing orb alpha
      this.tweens.add({
        targets: orb,
        alpha: { from: 0.9, to: 0.3 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // A couple of warm ambient lights scattered around
    this.lights.addLight(600, 600, 350, 0xff9944, 0.5);
    this.lights.addLight(1600, 400, 300, 0x9944ff, 0.4);
    this.lights.addLight(2800, 350, 320, 0xff4466, 0.5);

    // ── 4. Player ──────────────────────────────────────────────────────
    const spawn = this.level.playerSpawn;
    this.player = new PlayerController(this, spawn.x, spawn.y, 'player_tex');
    this.player.setDepth(10);
    this.player.setPipeline('Light2D');

    // Body size tweaks
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 30);
    body.setOffset(2, 2);

    // Collide with platforms
    this.physics.add.collider(this.player, this.level.platforms);

    // ── 5. Music trigger zone ──────────────────────────────────────────
    // Visual indicator for the trigger zone (subtle)
    const zoneVis = this.add.rectangle(2400, this.level.levelHeight / 2, 800, this.level.levelHeight, 0xff2244, 0.03);
    zoneVis.setDepth(-5);

    this.physics.add.overlap(
      this.player,
      this.level.musicTriggerZone,
      () => {
        if (!this.inTriggerZone) {
          this.inTriggerZone = true;
          this.triggerText.setText('🎵 INTENSE ZONE — Music would fade in here');
          this.triggerText.setAlpha(1);
          this.tweens.add({
            targets: this.triggerText,
            alpha: 0,
            duration: 3000,
            delay: 1500,
          });
        }
      },
      undefined,
      this,
    );

    // ── 6. Camera ──────────────────────────────────────────────────────
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.level.levelWidth, this.level.levelHeight);
    cam.startFollow(this.player, true, 0.08, 0.08); // lerp!
    cam.setDeadzone(60, 40);

    // ── 7. Post-FX bloom on the camera ─────────────────────────────────
    // Phaser 3.60+ built-in PostFX pipeline
    if (cam.postFX) {
      cam.postFX.addBloom(0xffffff, 1, 1, 1.5, 1.2);
    }

    // ── 8. Input ───────────────────────────────────────────────────────
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyDash  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      this.keyJump  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyLeft  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    // ── 9. HUD (fixed to camera) ──────────────────────────────────────
    this.stateText = this.add.text(16, 16, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#88aacc',
    }).setScrollFactor(0).setDepth(100);

    this.helpText = this.add.text(16, 40, '← → or A/D: Move  |  Space/↑: Jump  |  Shift: Dash', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#556677',
    }).setScrollFactor(0).setDepth(100);

    this.triggerText = this.add.text(
      Number(this.game.config.width) / 2,
      Number(this.game.config.height) / 2 - 40,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ff6688',
        align: 'center',
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════
  update(time: number, delta: number): void {
    // -- Build input struct -------------------------------------------------
    const input: PlayerInput = {
      left:        this.cursors.left.isDown  || this.keyLeft.isDown,
      right:       this.cursors.right.isDown || this.keyRight.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                   Phaser.Input.Keyboard.JustDown(this.keyJump),
      jumpHeld:    this.cursors.up.isDown    || this.keyJump.isDown,
      dashPressed: Phaser.Input.Keyboard.JustDown(this.keyDash),
    };

    // -- Run player controller ----------------------------------------------
    this.player.controllerUpdate(time, delta, input);

    // -- Move the player light to follow the player -------------------------
    this.playerLight.x = this.player.x;
    this.playerLight.y = this.player.y - 8;

    // -- Detect leaving the trigger zone ------------------------------------
    if (this.inTriggerZone) {
      const px = this.player.x;
      const zoneLeft = 2400 - 400;
      const zoneRight = 2400 + 400;
      if (px < zoneLeft || px > zoneRight) {
        this.inTriggerZone = false;
      }
    }

    // -- Respawn if fallen --------------------------------------------------
    if (this.player.y > this.level.levelHeight + 100) {
      this.player.setPosition(this.level.playerSpawn.x, this.level.playerSpawn.y);
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }

    // -- HUD ----------------------------------------------------------------
    this.stateText.setText(
      `state: ${this.player.state}  |  ` +
      `vel: ${Math.round((this.player.body as Phaser.Physics.Arcade.Body).velocity.x)}, ` +
      `${Math.round((this.player.body as Phaser.Physics.Arcade.Body).velocity.y)}  |  ` +
      `facing: ${this.player.facingDir > 0 ? '→' : '←'}`,
    );
  }
}
