// ─────────────────────────────────────────────────────────────────────────────
// PlayerConfig.ts — Floaty, dreamy movement for the glowing sheep protagonist
// Project: Awakening — Sunken Aqueduct
// ─────────────────────────────────────────────────────────────────────────────

export interface HorizontalMovementConfig {
  maxSpeed: number;
  acceleration: number;
  friction: number;
}

export interface JumpConfig {
  jumpVelocity: number;
  minJumpVelocity: number;
  risingGravityScale: number;
  fallingGravityScale: number;
  baseGravity: number;
}

export interface JumpTimingConfig {
  coyoteTimeMs: number;
  jumpBufferMs: number;
}

export interface DashConfig {
  speed: number;
  durationMs: number;
  cooldownMs: number;
  endVelocityCutFactor: number;
}

export interface PlayerConfig {
  horizontal: HorizontalMovementConfig;
  jump: JumpConfig;
  jumpTiming: JumpTimingConfig;
  dash: DashConfig;
}

/** Floaty, dreamy physics for the glowing sheep */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  horizontal: {
    maxSpeed: 180,          // Gentle, deliberate pace
    acceleration: 1200,     // Soft acceleration — like floating
    friction: 1500,         // Low friction — slippery, dreamy
  },
  jump: {
    jumpVelocity: -360,     // Moderate jump height
    minJumpVelocity: -120,  // Very short hops
    risingGravityScale: 0.8,  // Float upward slowly
    fallingGravityScale: 1.5, // Gentle descent — feather-like
    baseGravity: 900,       // Lower gravity = floatier feel
  },
  jumpTiming: {
    coyoteTimeMs: 100,      // Generous coyote for forgiveness
    jumpBufferMs: 120,      // Generous buffer
  },
  dash: {
    speed: 650,             // Fast burst — zoom across gaps
    durationMs: 250,        // Longer duration for more distance
    cooldownMs: 600,        // Shorter cooldown so you can use it more
    endVelocityCutFactor: 0.2, // Less velocity cut = more momentum
  },
};