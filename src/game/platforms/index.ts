// ─────────────────────────────────────────────────────────────────────────────
// platforms/index.ts — Modular 2D Platform System for Phaser 3
// ─────────────────────────────────────────────────────────────────────────────
//
// This module provides a complete, reusable 2D platform system.
// Currently exported:
//   1. PlatformLedge — Thin horizontal platform ledges with ALWAYS-VISIBLE rim

export { PlatformLedge, createPlatformLedges } from './PlatformLedge';
export type { PlatformLedgeConfig } from './PlatformLedge';