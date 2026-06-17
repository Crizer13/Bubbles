// ─────────────────────────────────────────────────────────────────────────────
// GameScene.ts — Sunken Aqueduct: dark teal caverns, bioluminescent crystals,
// glowing sheep protagonist, spire beacon
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { PlayerController, PlayerInput } from './PlayerController';
import { buildLevel, LevelData } from './LevelBuilder';
import { createSoundGenerator, GameSounds } from './SoundGenerator';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private level!: LevelData;
  private sounds!: GameSounds;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyDash!: Phaser.Input.Keyboard.Key;
  private keyJump!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;

  private inTriggerZone: boolean = false;
  private levelComplete: boolean = false;
  private wasAirborne: boolean = true; // Track landing detection

  private playerLight!: Phaser.GameObjects.Light;
  private beaconTween!: Phaser.Tweens.Tween;

  private stateText!: Phaser.GameObjects.Text;
  private triggerText!: Phaser.GameObjects.Text;
  private deathText!: Phaser.GameObjects.Text;
  private winText!: Phaser.GameObjects.Text;

  private ambientDroneRef: { stop: () => void } | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.level = buildLevel(this);
    this.levelComplete = false;

    // ── Audio — Synthesized sounds (no files needed!) ──────────────────
    this.sounds = createSoundGenerator();
    // Start the cavern ambient drone
    this.ambientDroneRef = this.sounds.ambientDrone();

    // ── Background — deep teal cavern ─────────────────────────────────
    this.cameras.main.setBackgroundColor(0x040a0e);

    // ── Lights2D — very dark ambient, player is the light source ──────
    this.lights.enable();
    this.lights.setAmbientColor(0x0a1218);

    // Player light — warm bioluminescent glow (sheep's magical core)
    this.playerLight = this.lights.addLight(0, 0, 220, 0x88ddff, 1.5);

    // Tower beacon
    this.beaconTween = this.tweens.add({
      targets: this.level.towerBeacon,
      intensity: { from: 2.0, to: 0.8 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Player — Glowing Sheep ─────────────────────────────────────────
    const spawn = this.level.playerSpawn;
    this.player = new PlayerController(this, spawn.x, spawn.y, 'player_tex');
    this.player.setDepth(10);
    this.player.setPipeline('Light2D');

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(16, 22);
    playerBody.setOffset(6, 7);

    // ── Colliders ─────────────────────────────────────────────────────
    this.physics.add.collider(this.player, this.level.platforms);
    this.physics.add.collider(
      this.player,
      this.level.movingPlatforms,
      this.onMovingPlatformCollide,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.level.spikeHazards,
      this.onSpikeHit,
      undefined,
      this,
    );

    // ── Music trigger zone ────────────────────────────────────────────
    this.physics.add.overlap(
      this.player,
      this.level.musicTriggerZone,
      () => {
        if (!this.inTriggerZone) {
          this.inTriggerZone = true;
          this.sounds.trigger();
          this.triggerText.setText('✨ THE LIGHT DEEPENS...');
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

    // ── Goal zone — reach to win ──────────────────────────────────────
    this.physics.add.overlap(
      this.player,
      this.level.goalZone,
      this.onReachGoal,
      undefined,
      this,
    );

    // ── Camera — slow, cinematic ──────────────────────────────────────
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.level.levelWidth, this.level.levelHeight);
    cam.startFollow(this.player, true, 0.05, 0.05);
    cam.setDeadzone(50, 30);

    if (cam.postFX) {
      cam.postFX.addBloom(0xffffff, 1, 1, 1.2, 0.6);
    }

    // ── Input ─────────────────────────────────────────────────────────
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyDash  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      this.keyJump  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyLeft  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    // ── HUD ───────────────────────────────────────────────────────────
    this.stateText = this.add.text(16, 16, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#6699aa',
    }).setScrollFactor(0).setDepth(100);

    this.add.text(16, 36, '← →/A,D: Move  |  Space/↑: Jump  |  Shift: Dash', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#446677',
    }).setScrollFactor(0).setDepth(100);

    this.triggerText = this.add.text(
      Number(this.game.config.width) / 2,
      Number(this.game.config.height) / 2 - 50,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#88ddff',
        align: 'center',
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    this.deathText = this.add.text(
      Number(this.game.config.width) / 2,
      Number(this.game.config.height) / 2,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ff6688',
        align: 'center',
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    this.winText = this.add.text(
      Number(this.game.config.width) / 2,
      Number(this.game.config.height) / 2 - 60,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#88ddff',
        align: 'center',
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);
  }

  update(time: number, delta: number): void {
    // If level complete, skip player update but still allow UI
    if (this.levelComplete) {
      return;
    }

    const input: PlayerInput = {
      left:        this.cursors.left.isDown  || this.keyLeft.isDown,
      right:       this.cursors.right.isDown || this.keyRight.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                   Phaser.Input.Keyboard.JustDown(this.keyJump),
      jumpHeld:    this.cursors.up.isDown    || this.keyJump.isDown,
      dashPressed: Phaser.Input.Keyboard.JustDown(this.keyDash),
    };

    // Play jump sound on jump press
    if (input.jumpPressed && this.player.isOnFloor()) {
      this.sounds.jump();
    }

    // Play dash sound on dash press
    if (input.dashPressed) {
      this.sounds.dash();
    }

    // Landing detection — play thud when transitioning from airborne to grounded
    const onFloor = this.player.isOnFloor();
    if (onFloor && this.wasAirborne) {
      this.sounds.land();
    }
    this.wasAirborne = !onFloor;

    this.player.controllerUpdate(time, delta, input);

    // Player light follows sheep — with a tiny bobbing offset
    this.playerLight.x = this.player.x;
    this.playerLight.y = this.player.y - 4 + Math.sin(time * 0.003) * 1.5;

    if (this.inTriggerZone) {
      const px = this.player.x;
      const zoneLeft = 3600 - 400;
      const zoneRight = 3600 + 400;
      if (px < zoneLeft || px > zoneRight) {
        this.inTriggerZone = false;
      }
    }

    // Sync moving platform physics
    const movingPlats = this.level.movingPlatforms.getChildren();
    for (let i = 0; i < movingPlats.length; i++) {
      const plat = movingPlats[i] as Phaser.Physics.Arcade.Sprite;
      if (plat && plat.body) {
        (plat.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      }
    }

    if (this.player.y > this.level.levelHeight + 100) {
      this.respawnPlayer();
    }

    this.stateText.setText(
      `state: ${this.player.state}  |  ` +
      `vel: ${Math.round((this.player.body as Phaser.Physics.Arcade.Body).velocity.x)}, ` +
      `${Math.round((this.player.body as Phaser.Physics.Arcade.Body).velocity.y)}  |  ` +
      `facing: ${this.player.facingDir > 0 ? '→' : '←'}`,
    );
  }

  private onSpikeHit(): void {
    if (this.levelComplete) return;

    this.sounds.death();
    this.deathText.setText('💔 THE LIGHT FADES...');
    this.deathText.setAlpha(1);
    this.cameras.main.shake(300, 0.015);
    this.cameras.main.flash(200, 60, 0, 20);

    this.time.delayedCall(800, () => {
      this.deathText.setAlpha(0);
      this.respawnPlayer();
    });
  }

  private onReachGoal(): void {
    if (this.levelComplete) return;

    this.levelComplete = true;

    // Victory sound!
    this.sounds.victory();

    // Freeze the player
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Victory effects
    this.winText.setText('🌟 THE LIGHT ASCENDS!\nYou reached the exit!');
    this.winText.setAlpha(1);
    this.cameras.main.shake(500, 0.01);
    this.cameras.main.flash(300, 80, 200, 100);

    // Big light pulse
    this.tweens.add({
      targets: this.playerLight,
      intensity: { from: 1.5, to: 4.0 },
      duration: 600,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Show restart hint
    this.time.delayedCall(2500, () => {
      this.winText.setText('🌟 THE LIGHT ASCENDS!\nYou reached the exit!\n\nPress Menu to restart');
    });
  }

  private onMovingPlatformCollide(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body,
    _platform: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body,
  ): void {
    // Moving platforms work via updateFromGameObject() in update()
  }

  private respawnPlayer(): void {
    this.player.setPosition(this.level.playerSpawn.x, this.level.playerSpawn.y);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.wasAirborne = true; // Reset landing tracker on respawn
  }
}