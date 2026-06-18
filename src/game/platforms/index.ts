// ─────────────────────────────────────────────────────────────────────────────
// platforms/index.ts — Modular 2D Platform System for Phaser 3
// ─────────────────────────────────────────────────────────────────────────────
//
// This module provides a complete, reusable 2D platform system with:
//   1. StaticPillarPlatform    — Vertical stone pillars with top-surface colliders
//   2. CeilingHazard           — Jagged ceilings with hanging vines/chains
//   3. ParallaxBackground      — 3-layer parallax scrolling background
//   4. SmartColliderHelper     — Efficient colliders preventing wall-sticking
//   5. SmartCollisionHandler   — Collision callbacks for one-way platforms
//   6. CollisionCategory       — Bit flags for collision filtering
//
// EXPORTED TYPES:
//   PillarConfig, PillarConfig
//   CeilingHazardConfig, HangingVineConfig, HangingChainConfig, HangingElement
//   ParallaxBackgroundConfig, ParallaxLayerConfig
//   (from SmartColliderHelper): all types are exported inline

export { StaticPillarPlatform } from './StaticPillarPlatform';
export type { PillarConfig } from './StaticPillarPlatform';

export { CeilingHazard } from './CeilingHazard';
export type { CeilingHazardConfig, HangingVineConfig, HangingChainConfig, HangingElement } from './CeilingHazard';

export { ParallaxBackground } from './ParallaxBackground';
export type { ParallaxBackgroundConfig, ParallaxLayerConfig } from './ParallaxBackground';

export { SmartColliderHelper, SmartCollisionHandler, CollisionCategory } from './SmartColliderHelper';

export { PlatformLedge, createPlatformLedges } from './PlatformLedge';
export type { PlatformLedgeConfig } from './PlatformLedge';
