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

    this.resolveState(input);
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
      }
    }
  }

  // ── Private: resolve animation state ─────────────────────────────────────
  private resolveState(_input: PlayerInput): void {
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

  // ── Helpers ──────────────────────────────────────────────────────────────
  public isOnFloor(): boolean {
    return (this.body as Phaser.Physics.Arcade.Body).blocked.down;
  }
}
