// ─────────────────────────────────────────────────────────────────────────────
// PlayerConfig.ts — Interfaces for every tunable knob on the character
// ─────────────────────────────────────────────────────────────────────────────

/** Horizontal movement tuning */
export interface HorizontalMovementConfig {
  /** Pixels/sec maximum ground/air speed */
  maxSpeed: number;
  /** Pixels/sec² acceleration while a direction is held */
  acceleration: number;
  /** Pixels/sec² deceleration when no direction is held (ground friction) */
  friction: number;
}

/** Jump / gravity tuning */
export interface JumpConfig {
  /** Initial upward velocity applied on jump (negative = up in Phaser) */
  jumpVelocity: number;
  /**
   * If the player releases the jump key early, their upward velocity is
   * clamped to this value so the jump is shorter.  Set to 0 to allow
   * full cut.  Must be <= |jumpVelocity|.
   */
  minJumpVelocity: number;
  /** Gravity multiplier while the player is rising (vy < 0) */
  risingGravityScale: number;
  /** Gravity multiplier while the player is falling (vy >= 0) */
  fallingGravityScale: number;
  /** Base gravity that gets multiplied by the scales above (pixels/sec²) */
  baseGravity: number;
}

/** Coyote-time & jump-buffer tuning */
export interface JumpTimingConfig {
  /** Milliseconds after leaving the ground where a jump still registers */
  coyoteTimeMs: number;
  /** Milliseconds before landing where a jump press is remembered */
  jumpBufferMs: number;
}

/** Dash tuning */
export interface DashConfig {
  /** Speed of the dash in pixels/sec */
  speed: number;
  /** How long the dash lasts in milliseconds */
  durationMs: number;
  /** Cooldown between dashes in milliseconds */
  cooldownMs: number;
  /**
   * After the dash ends, the player's velocity is multiplied by this
   * factor (0–1) so they don't carry full dash speed.
   */
  endVelocityCutFactor: number;
}

/** Full config bundle */
export interface PlayerConfig {
  horizontal: HorizontalMovementConfig;
  jump: JumpConfig;
  jumpTiming: JumpTimingConfig;
  dash: DashConfig;
}

/** Sensible defaults — tweak these to taste */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  horizontal: {
    maxSpeed: 260,
    acceleration: 1800,
    friction: 2400,
  },
  jump: {
    jumpVelocity: -420,
    minJumpVelocity: -180,
    risingGravityScale: 1.0,
    fallingGravityScale: 1.7,
    baseGravity: 980,
  },
  jumpTiming: {
    coyoteTimeMs: 100,
    jumpBufferMs: 120,
  },
  dash: {
    speed: 520,
    durationMs: 150,
    cooldownMs: 600,
    endVelocityCutFactor: 0.35,
  },
};
