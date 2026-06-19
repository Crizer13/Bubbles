// ─────────────────────────────────────────────────────────────────────────────
// PlayerController.ts — A Phaser Arcade Sprite with Godot-style movement
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import {
  PlayerConfig,
  DEFAULT_PLAYER_CONFIG,
} from './PlayerConfig';

// ── Exposed animation state ────────────────────────────────────────────────
export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'dash';

// ── Input contract — the scene passes this each frame ──────────────────────
export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;   // just-pressed this frame
  jumpHeld: boolean;      // held down
  dashPressed: boolean;   // just-pressed this frame
}

// ── Dash visual trail particle ──────────────────────────────────────────────
interface DashTrailParticle {
  obj: Phaser.GameObjects.Rectangle;
  lifetime: number;
  maxLifetime: number;
}

// ── The controller ─────────────────────────────────────────────────────────
export class PlayerController extends Phaser.Physics.Arcade.Sprite {
  // -- Config ---------------------------------------------------------------
  private cfg: PlayerConfig;

  // -- State ----------------------------------------------------------------
  public state: PlayerState = 'idle';
  /** +1 = facing right, -1 = facing left */
  public facingDir: number = 1;

  // -- Internal timers (in ms, counting DOWN) --------------------------------
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;
  private dashTimer: number = 0;     // > 0 while dashing
  private dashCooldown: number = 0;  // > 0 while on cooldown
  private dashDirX: number = 0;
  private dashDirY: number = 0;

  // -- Misc -----------------------------------------------------------------
  private wasOnFloor: boolean = false;
  private jumpCut: boolean = false;  // has the player released jump mid-air?

  // -- Dash Visual Effects --------------------------------------------------
  private trailParticles: DashTrailParticle[] = [];
  private dashTrailTimer: number = 0;
  private dashBurstDone: boolean = false;
  private dashFlashObj: Phaser.GameObjects.Rectangle | null = null;
  private dashRingObj: Phaser.GameObjects.Rectangle | null = null;
  private dashRingTween: Phaser.Tweens.Tween | null = null;

  // Reference to scene for convenience
  private gameScene: Phaser.Scene;

  // ── Constructor ──────────────────────────────────────────────────────────
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
    config?: Partial<PlayerConfig>,
  ) {
    super(scene, x, y, texture, frame);
    this.gameScene = scene;

    // Merge provided config with defaults
    this.cfg = {
      horizontal: { ...DEFAULT_PLAYER_CONFIG.horizontal, ...config?.horizontal },
      jump:       { ...DEFAULT_PLAYER_CONFIG.jump,       ...config?.jump },
      jumpTiming: { ...DEFAULT_PLAYER_CONFIG.jumpTiming, ...config?.jumpTiming },
      dash:       { ...DEFAULT_PLAYER_CONFIG.dash,       ...config?.dash },
    };

    // Add to scene + physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Sensible body defaults
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(0); // we handle gravity ourselves
    body.setMaxVelocityX(this.cfg.horizontal.maxSpeed);
    body.setCollideWorldBounds(false);
  }

  // ── Public update — call from scene.update(time, delta) ──────────────────
  public controllerUpdate(_time: number, delta: number, input: PlayerInput): void {
    const dt = delta / 1000; // seconds
    const dtMs = delta;      // milliseconds

    this.updateTimers(dtMs, input);
    this.handleDashInput(input, dt);

    // While dashing, skip normal movement / gravity
    if (this.dashTimer <= 0) {
      this.handleHorizontalMovement(input, dt);
      this.handleJumpInput(input);
      this.applyGravity(dt);
    }

    // Update dash visual effects
    this.updateDashVisuals(dtMs, _time);

    this.resolveState();
  }

  // ── Private: timers ──────────────────────────────────────────────────────
  private updateTimers(dtMs: number, input: PlayerInput): void {
    const onFloor = this.isOnFloor();

    // Coyote time — start counting when we LEAVE the floor
    if (onFloor) {
      this.coyoteTimer = this.cfg.jumpTiming.coyoteTimeMs;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dtMs);
    }

    // Jump buffer — start counting when jump is pressed
    if (input.jumpPressed) {
      this.jumpBufferTimer = this.cfg.jumpTiming.jumpBufferMs;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dtMs);
    }

    // Dash timers
    this.dashTimer   = Math.max(0, this.dashTimer - dtMs);
    this.dashCooldown = Math.max(0, this.dashCooldown - dtMs);

    // Track "just left floor" for coyote
    this.wasOnFloor = onFloor;
  }

  // ── Private: horizontal movement ─────────────────────────────────────────
  private handleHorizontalMovement(input: PlayerInput, dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const { maxSpeed, acceleration, friction } = this.cfg.horizontal;

    let dir = 0;
    if (input.left)  dir -= 1;
    if (input.right) dir += 1;

    if (dir !== 0) {
      // Accelerate
      this.facingDir = dir;
      let vx = body.velocity.x + dir * acceleration * dt;
      vx = Phaser.Math.Clamp(vx, -maxSpeed, maxSpeed);
      body.setVelocityX(vx);
    } else {
      // Apply friction / deceleration
      const vx = body.velocity.x;
      if (Math.abs(vx) < friction * dt) {
        body.setVelocityX(0);
      } else {
        body.setVelocityX(vx - Math.sign(vx) * friction * dt);
      }
    }

    // Flip sprite to face movement direction
    this.setFlipX(this.facingDir < 0);
  }

  // ── Private: jump ────────────────────────────────────────────────────────
  private handleJumpInput(input: PlayerInput): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const { jumpVelocity, minJumpVelocity } = this.cfg.jump;

    const canJump = this.coyoteTimer > 0 || this.isOnFloor();

    // Execute jump if buffer + coyote/grounded
    if (this.jumpBufferTimer > 0 && canJump) {
      body.setVelocityY(jumpVelocity);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.jumpCut = false;
    }

    // Variable-height jump: cut velocity when button released
    if (!input.jumpHeld && body.velocity.y < minJumpVelocity && !this.jumpCut) {
      body.setVelocityY(minJumpVelocity);
      this.jumpCut = true;
    }

    // Reset jump cut flag on landing
    if (this.isOnFloor()) {
      this.jumpCut = false;
    }
  }

  // ── Private: gravity ─────────────────────────────────────────────────────
  private applyGravity(dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const { baseGravity, risingGravityScale, fallingGravityScale } = this.cfg.jump;

    const scale = body.velocity.y < 0 ? risingGravityScale : fallingGravityScale;
    body.setVelocityY(body.velocity.y + baseGravity * scale * dt);
  }

  // ── Private: dash ────────────────────────────────────────────────────────
  private handleDashInput(input: PlayerInput, dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Start a new dash?
    if (input.dashPressed && this.dashTimer <= 0 && this.dashCooldown <= 0) {
      // Direction: held direction, or facing direction
      let dx = 0;
      let dy = 0;
      if (input.left)  dx -= 1;
      if (input.right) dx += 1;
      // No vertical dashing in this implementation, but you could add it

      if (dx === 0) dx = this.facingDir;

      // Normalise (it's 1D here, but future-proof for diagonals)
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;

      this.dashTimer = this.cfg.dash.durationMs;
      this.dashCooldown = this.cfg.dash.cooldownMs;

      // Reset dash visual state
      this.dashBurstDone = false;
      this.dashTrailTimer = 0;

      // ── DASH START VISUALS ──────────────────────────────────────────────
      this.onDashStart();
    }

    // While dashing, override velocity
    if (this.dashTimer > 0) {
      body.setVelocity(
        this.dashDirX * this.cfg.dash.speed,
        this.dashDirY * this.cfg.dash.speed,
      );

      // Dash just ended this frame?
      if (this.dashTimer - dt * 1000 <= 0) {
        // Partial velocity cut
        body.setVelocity(
          body.velocity.x * this.cfg.dash.endVelocityCutFactor,
          body.velocity.y * this.cfg.dash.endVelocityCutFactor,
        );

        // ── DASH END VISUALS ──────────────────────────────────────────────
        this.onDashEnd();
      }
    }
  }

  // ── Dash Visual: Start Burst ─────────────────────────────────────────────
  private onDashStart(): void {
    // 1. Scale pulse: squish on start (stretch horizontally, squish vertically)
    this.gameScene.tweens.killTweensOf(this);
    this.setScale(1.4, 0.7);
    this.gameScene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 0.95,
      duration: 100,
      ease: 'Back.easeOut',
    });

    // 2. Light burst flash — a bright rectangle that fades quickly
    if (this.dashFlashObj) {
      this.dashFlashObj.destroy();
    }
    this.dashFlashObj = this.gameScene.add.rectangle(
      this.x, this.y, 30, 20, 0x88ddff, 0.6,
    );
    this.dashFlashObj.setDepth(15);
    this.dashFlashObj.setAlpha(0.6);
    this.gameScene.tweens.add({
      targets: this.dashFlashObj,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.dashFlashObj) {
          this.dashFlashObj.destroy();
          this.dashFlashObj = null;
        }
      },
    });

    // 3. Expanding ring effect (shockwave)
    this.spawnDashRing();
  }

  private spawnDashRing(): void {
    // Destroy any existing ring
    if (this.dashRingObj) {
      this.dashRingObj.destroy();
      this.dashRingObj = null;
    }
    if (this.dashRingTween) {
      this.dashRingTween.destroy();
      this.dashRingTween = null;
    }

    // Use a rectangle to represent the expanding ring
    this.dashRingObj = this.gameScene.add.rectangle(this.x, this.y, 12, 12, 0x88ddff, 0.5);
    this.dashRingObj.setDepth(14);

    const ringTarget = this.dashRingObj;
    this.dashRingTween = this.gameScene.tweens.add({
      targets: ringTarget,
      scaleX: 6,
      scaleY: 6,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (ringTarget.active) {
          ringTarget.destroy();
        }
        this.dashRingObj = null;
        this.dashRingTween = null;
      },
    });
  }

  // ── Dash Visual: End Burst ───────────────────────────────────────────────
  private onDashEnd(): void {
    // Scale bounce back: stretch slightly then return to normal
    this.gameScene.tweens.killTweensOf(this);
    this.gameScene.tweens.add({
      targets: this,
      scaleX: { from: 1.15, to: 1.0 },
      scaleY: { from: 0.85, to: 1.0 },
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Final burst of trail particles
    for (let i = 0; i < 6; i++) {
      this.spawnTrailParticle(true);
    }
  }

  // ── Dash Visual: Trail Particles ─────────────────────────────────────────
  private spawnTrailParticle(burst: boolean = false): void {
    const particleSize = Phaser.Math.FloatBetween(2, 5);
    const offsetX = this.facingDir > 0 ? -10 : 10;
    const px = this.x + offsetX + Phaser.Math.Between(-4, 4);
    const py = this.y + Phaser.Math.Between(-6, 6);

    const colors = [0x88ddff, 0x66ccff, 0xbb88ff, 0x44ddff];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = this.gameScene.add.rectangle(px, py, particleSize, particleSize, color, 0.7);
    particle.setDepth(12);

    // Random velocity for burst particles, more controlled for trail
    if (burst) {
      particle.setAlpha(0.8);
      this.gameScene.tweens.add({
        targets: particle,
        x: px + Phaser.Math.Between(-25, 25),
        y: py + Phaser.Math.Between(-20, 10),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(200, 400),
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    } else {
      particle.setAlpha(0.5);
      this.gameScene.tweens.add({
        targets: particle,
        x: px + (this.facingDir > 0 ? Phaser.Math.Between(-15, -5) : Phaser.Math.Between(5, 15)),
        y: py + Phaser.Math.Between(-8, 8),
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(150, 300),
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }

    // Store in list for cleanup if needed
    this.trailParticles.push({
      obj: particle,
      lifetime: burst ? 400 : 300,
      maxLifetime: burst ? 400 : 300,
    });
  }

  // ── Dash Visual: Update ──────────────────────────────────────────────────
  private updateDashVisuals(dtMs: number, time: number): void {
    if (this.dashTimer > 0) {
      // Spawn trail particles periodically while dashing
      this.dashTrailTimer += dtMs;
      if (this.dashTrailTimer > 40) {
        this.dashTrailTimer = 0;
        this.spawnTrailParticle(false);
      }

      // Update dash flash position to follow player
      if (this.dashFlashObj) {
        this.dashFlashObj.setPosition(this.x, this.y);
      }

      // Update ring position
      if (this.dashRingObj) {
        this.dashRingObj.setPosition(this.x, this.y);
      }

      // Scale wobble during dash — subtle pulse
      const wobble = Math.sin(time * 0.02) * 0.03;
      this.setScale(1.05 + wobble, 0.95 - wobble);
    }

    // Cleanup old trail particles
    this.trailParticles = this.trailParticles.filter(p => {
      p.lifetime -= dtMs;
      if (p.lifetime <= 0) {
        if (p.obj && p.obj.active) {
          p.obj.destroy();
        }
        return false;
      }
      return true;
    });
  }

  // ── Private: resolve animation state ─────────────────────────────────────
  private resolveState(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.dashTimer > 0) {
      this.state = 'dash';
    } else if (!this.isOnFloor()) {
      this.state = body.velocity.y < 0 ? 'jump' : 'fall';
    } else if (Math.abs(body.velocity.x) > 10) {
      this.state = 'run';
    } else {
      this.state = 'idle';
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  public cleanupDashEffects(): void {
    // Clean up all trail particles
    for (const p of this.trailParticles) {
      if (p.obj && p.obj.active) {
        p.obj.destroy();
      }
    }
    this.trailParticles = [];

    // Clean up flash
    if (this.dashFlashObj) {
      this.dashFlashObj.destroy();
      this.dashFlashObj = null;
    }

    // Clean up ring
    if (this.dashRingObj) {
      this.dashRingObj.destroy();
      this.dashRingObj = null;
    }
    if (this.dashRingTween) {
      this.dashRingTween.destroy();
      this.dashRingTween = null;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  public isOnFloor(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Use touching.down which is set by physics collider (more reliable than
    // blocked.down when using manual gravity)
    return body.touching.down || body.blocked.down;
  }

  /**
   * Called when the sprite is destroyed — clean up visual effects
   */
  public destroy(fromScene?: boolean): void {
    this.cleanupDashEffects();
    super.destroy(fromScene);
  }
}