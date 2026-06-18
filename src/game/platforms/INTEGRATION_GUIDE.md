# 🏗️ Modular 2D Platform System — Integration Guide

This guide explains how to integrate the modular platform system into your existing Phaser 3 game. The system was designed to work with your existing `GameScene.ts` and `LevelBuilder.ts` code.

---

## 📁 File Structure

```
src/game/platforms/
├── index.ts                  # Barrel exports
├── StaticPillarPlatform.ts   # Vertical stone pillars with top colliders
├── CeilingHazard.ts          # Jagged ceilings with hanging vines/chains
├── ParallaxBackground.ts     # 3-layer parallax background
├── SmartColliderHelper.ts    # Smart colliders to prevent wall-sticking
└── INTEGRATION_GUIDE.md      # This file (you're reading it!)
```

---

## 🚀 Quick Start — In Your Scene

### Step 1: Import the classes

```typescript
import {
  StaticPillarPlatform,
  CeilingHazard,
  ParallaxBackground,
  SmartColliderHelper,
  SmartCollisionHandler,
} from './platforms';
```

### Step 2: Add to LevelData interface

Add to your existing `LevelData` interface (in `LevelBuilder.ts`):

```typescript
export interface LevelData {
  // ... existing fields ...
  /** New: Reference to the parallax system for update() */
  parallax: ParallaxBackground;
}
```

### Step 3: Create the parallax background

```typescript
// In buildLevel()
const parallax = new ParallaxBackground(scene, {
  levelWidth: LEVEL_W,
  levelHeight: LEVEL_H,
});
parallax.create();
```

### Step 4: Create pillar platforms with smart colliders

```typescript
const smartCollider = new SmartColliderHelper(scene);
const wallGroup = scene.physics.add.staticGroup(); // NEW: for wall colliders

// Replace old addPlatform() calls:
const pillar = new StaticPillarPlatform(scene, x, y, {
  width: 140,
  height: 200,
  topOnlyCollider: true,
});
pillar.addToGroup(platformGroup, wallGroup);

// Or use the SmartColliderHelper directly:
smartCollider.createPillarColliders(platformGroup, wallGroup, x, y, 140, 200);
```

### Step 5: Create ceiling hazards with decorations

```typescript
// Replace old addSpike() for ceilings:
const ceiling = new CeilingHazard(scene, x, y, {
  width: 160,
  height: 80,
  jaggedCount: 8,
  jaggedDepth: 25,
});
ceiling.addToGroup(spikeHazards);

// Add hanging decorations:
ceiling.addHangingVines(4);     // 4 vines hanging down
ceiling.addRustedChains(2, {    // 2 chains with weights
  links: 6,
  hasWeight: true,
});
```

### Step 6: Add colliders in GameScene

In your `GameScene.create()`:

```typescript
// Smart wall collision (no wall-sticking)
this.physics.add.collider(
  this.player,
  wallGroup,
  SmartCollisionHandler.onWallCollide,
  undefined,
  this,
);
```

### Step 7: Update the parallax in your update loop

```typescript
// In GameScene.update():
this.level.parallax.update();
```

---

## 🧩 GameObject Hierarchy in Editor

Here's how to organize your scene hierarchy:

```
GameScene
├── Camera: MainCamera
│   ├── PostFX: Bloom (0xffffff, 1, 1, 1.2, 0.6)
│   └── Bounds: (0, 0, levelWidth, levelHeight)
│
├── Lights2D
│   ├── Ambient: 0x0a1218
│   ├── PlayerLight: (follows player, warm glow)
│   └── CrystalLights: (scattered, pulsing)
│
├── Background [depth: -12 to -8]  ← ParallaxBackground
│   ├── Layer 3 (Far Fog) [depth: -12, scroll: 0.05]
│   ├── Layer 2 (Mid Walls) [depth: -10, scroll: 0.15]
│   └── Layer 1 (Structures) [depth: -8, scroll: 0.3]
│
├── Ceiling Hazards [depth: -3]
│   ├── CeilingChunk_01 [jagged, 8 teeth, 25px depth]
│   │   ├── (Collider — invisible)
│   │   ├── Vine_01_01 (swaying)
│   │   ├── Vine_01_02 (swaying)
│   │   └── Chain_01_01 (swaying with weight)
│   ├── CeilingChunk_02
│   │   └── ...
│   └── ...
│
├── Platforms (StaticGroup) [depth: 0]
│   ├── Pillar_01
│   │   ├── VisualBody (Rectangle, dark stone)
│   │   ├── TopCollider (thin, invisible, wider than body)
│   │   ├── Moss_01 (decorative, catches light)
│   │   ├── Moss_02
│   │   └── GrassBlade_01
│   ├── Pillar_02
│   │   └── ...
│   └── Floor_01
│
├── Wall Colliders (StaticGroup) [depth: 0, invisible]
│   ├── Wall_Left_01
│   ├── Wall_Right_01
│   └── ...
│
├── Moving Platforms (Group)
│   ├── MovingPlat_01 [tweens: vertical, 2.8s]
│   ├── MovingPlat_02 [tweens: horizontal, 3.2s]
│   └── ...
│
├── Hazard Colliders (StaticGroup) [depth: 8]
│   └── (ceiling hazards + spike hazards combined)
│
├── Glow Objects [depth: 4-5]
│   ├── Crystal_01 (with light + halo)
│   ├── Crystal_02
│   └── ...
│
├── Player [depth: 10]
│   ├── (Arcade Sprite with controller)
│   └── PlayerLight (Light2D, follows)
│
├── Tower [depth: -2 to 2]
│   ├── TowerBody
│   ├── Windows (with glow)
│   ├── BeaconFixture
│   ├── BeaconLight (pulsing)
│   ├── BeamCone (swaying)
│   └── HangingVines
│
├── Triggers (Zones, invisible)
│   ├── MusicTriggerZone
│   └── GoalZone (with visual indicator)
│
└── HUD (ScrollFactor: 0, Depth: 100)
    ├── StateText
    ├── ControlsHint
    ├── TriggerText
    ├── DeathText
    └── WinText
```

---

## 🔧 Configuration Reference

### StaticPillarPlatform

| Property | Type | Default | Description |
|---|---|---|---|
| `width` | number | 64 | Pillar width in pixels |
| `height` | number | 128 | Pillar height in pixels |
| `stoneColor` | number | 0x141e28 | Base stone color |
| `mossColor` | number | 0x1a3028 | Moss/grass color |
| `runeColor` | number | 0x44ddff | Glowing rune edge trim color |
| `topOnlyCollider` | boolean | true | If true, only top has collision |
| `topColliderThickness` | number | 8 | Thickness of landing surface |
| `generateTexture` | boolean | true | Auto-generate procedural texture |
| `depth` | number | 0 | Scene depth |
| `showLandingIndicator` | boolean | true | Pulsing glow on landing surface |
| `showRuneParticles` | boolean | true | Floating rune particles above platform |

### CeilingHazard

| Property | Type | Default | Description |
|---|---|---|---|
| `width` | number | 128 | Ceiling chunk width |
| `height` | number | 64 | Ceiling chunk height |
| `baseColor` | number | 0x0a0e14 | Base stone color |
| `jaggedCount` | number | 6 | Number of stalactite teeth |
| `jaggedDepth` | number | 20 | How far teeth extend down |
| `generateTexture` | boolean | true | Auto-generate texture |
| `depth` | number | -3 | Scene depth |

### HangingVineConfig (for CeilingHazard.addHangingVines)

| Property | Type | Default | Description |
|---|---|---|---|
| `segments` | number | 6 | Number of vine segments |
| `segmentLength` | number | 12 | Length per segment (px) |
| `vineColor` | number | 0x0a2018 | Vine color |
| `sway` | boolean | true | Enable sway animation |
| `swayAmount` | number | 4 | Max sway offset (px) |

### HangingChainConfig (for CeilingHazard.addRustedChains)

| Property | Type | Default | Description |
|---|---|---|---|
| `links` | number | 5 | Number of chain links |
| `linkLength` | number | 10 | Length per link (px) |
| `chainColor` | number | 0x1a1a20 | Chain color |
| `sway` | boolean | true | Enable sway animation |
| `swayAmount` | number | 3 | Max sway offset (px) |
| `hasWeight` | boolean | true | Add weight/hook at bottom |

### ParallaxBackgroundConfig

| Property | Type | Default | Description |
|---|---|---|---|
| `levelWidth` | number | 4800 | Total level width |
| `levelHeight` | number | 1080 | Total level height |
| `layer1Color` | number | 0x0a1218 | Closest structures color |
| `layer2Color` | number | 0x0e1a2a | Mid walls color |
| `layer3Color` | number | 0x040a12 | Far fog color |
| `layer1StructureCount` | number | 12 | Number of structures |
| `layer2WallCount` | number | 8 | Number of wall segments |
| `layer3FogPatches` | number | 15 | Number of fog patches |

---

## 🧠 Smart Collider System Explained

### The Problem

When platforms use full-body box colliders, jumping past a pillar causes the player to "stick" to the vertical wall, interrupting their jump trajectory.

### The Solution

```
     ┌─────────────────────────┐    ← Top collider (wide, thin, 8px)
     │                         │       Player lands here from above
     │    VISUAL PILLAR BODY   │       No side collision!
     │    (no physics)         │ 
     │                         │
     │  ┌┐                 ┌┐  │    ← Thin wall colliders on edges
     │  ││                 ││  │       (4px wide, prevent clipping)
     │  └┘                 └┘  │
     └─────────────────────────┘
```

- **Top collider**: Thin, extends slightly wider than the visual body. Player lands on this.
- **Wall colliders**: Thin strips on each side. Player can slide past them without friction.
- **Visual body**: No physics — just for display with the procedural dark stone texture.

---

## 🎨 Aesthetic Notes

The system follows a **dark cinematic pixel-art** aesthetic:

- **Pillars**: Pitch-black stone with organic cracks, moss caps that catch faint light
- **Ceilings**: Jagged massive dark forms with moisture stains and mineral deposits
- **Vines/Chains**: Sway dynamically, creating a sense of depth and decay
- **Parallax layers**: 
  - Layer 1 — dark ruined structures with broken windows
  - Layer 2 — brick/stone walls fading into blue mist
  - Layer 3 — deep blue fog with light shafts

All textures are generated procedurally — **no external assets required**.