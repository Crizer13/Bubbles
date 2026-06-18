# 🛠️ How to Edit the Game Yourself

Read this to learn which files control what. Just change numbers and colors — no coding needed.

---

## 📁 The only files you need to touch

```
src/game/
├── GameScene.ts         ← Lighting, player, HUD text
├── LevelBuilder.ts      ← Level layout + scenery (stars, kingdom, forest)
├── platforms/
│   └── PlatformLedge.ts ← How each platform looks
└── HOW_TO_EDIT.md       ← This file
```

---

## 1. ✨ Change the night sky & stars

**File:** `src/game/LevelBuilder.ts` → `drawScenery()` function

### Sky colors (section 1):
```typescript
skyGrad.fillGradientStyle(0x050510, 0x050510, 0x0e0a20, 0x1a0e30, 1);
//                      ↑top-left  ↑top-right  ↑bot-left  ↑bot-right
```
Change the hex colors to change the sky gradient.

### Number of stars (section 2):
```typescript
for (let i = 0; i < 80; i++) {  // ← Change 80 to more/less stars
```
### Star twinkle:
Every 3rd star twinkles. Change `i % 3 === 0` to `i % 2 === 0` for more twinkling stars.

### Moon position (section 3):
```typescript
const moonX = Phaser.Math.Between(400, w - 400);  // ← Moon X range
const moonY = Phaser.Math.Between(60, 180);        // ← Moon Y range
```

---

## 2. 🏰 Change the distant kingdom

**File:** `src/game/LevelBuilder.ts` → `drawScenery()` section 4

### Castle positions and sizes:
```typescript
// Castle 1 — large main keep (at 25% of level width)
const c1x = w * 0.25;  // ← Position (0 = left, 1 = right)
drawCastle(kingdom, c1x, kingdomHorizon, {
  baseW: 160,   // ← Castle width
  height: 140,  // ← Castle height
  towerH: 60,   // ← Side tower height
  towerW: 20,   // ← Side tower width
  hasSpire: true, // ← Whether it has a pointed spire
});
```

### To add more castles:
Copy the `drawCastle()` call and change the position (`w * 0.XX`) and size values.

### Kingdom silhouette color:
```typescript
kingdom.fillStyle(0x0a0818, 0.7);  // ← Color + opacity
```

---

## 3. 🌲 Change the forest

**File:** `src/game/LevelBuilder.ts` → `drawScenery()` sections 5 & 6

### Background forest (small trees on the horizon):
```typescript
for (let t = 0; t < 30; t++) {     // ← Number of trees
  const treeH = Phaser.Math.Between(60, 160);   // ← Tree height range
  const treeW = Phaser.Math.Between(20, 45);    // ← Tree width range
```

### Foreground trees (large, close trees):
```typescript
for (let t = 0; t < 8; t++) {      // ← Number of foreground trees
  const treeH = Phaser.Math.Between(200, 350);  // ← Much taller
  const treeW = Phaser.Math.Between(50, 90);    // ← Much wider
```

### Tree color:
```typescript
forest.fillStyle(0x0a0a14, 0.6);       // ← Back trees
nearForest.fillStyle(0x060610, 0.5);   // ← Front trees
```

---

## 4. 🪲 Change fireflies

**File:** `src/game/LevelBuilder.ts` → `drawScenery()` section 7

```typescript
for (let i = 0; i < 15; i++) {   // ← Number of fireflies
  const fx = Phaser.Math.Between(0, w);
  const fy = Phaser.Math.Between(h * 0.5, h - 100);
  const firefly = scene.add.rectangle(fx, fy, 2, 2, 0xeeff88, 0.5);
  //                                             ↑color   ↑brightness
```

---

## 5. 🪨 Change platform colors

**File:** `src/game/platforms/PlatformLedge.ts`

```typescript
rimColor: 0x44ddff,     // ← Bright edge line on top (cyan)
stoneColor: 0x2a3a4a,   // ← Stone body color
```

---

## 6. 🎨 Change the whole color palette

**File:** `src/game/LevelBuilder.ts` — the `PALETTE` object (line ~37):

```typescript
const PALETTE = {
  crystalBlue: 0x44ddff,    // ← Blue crystals & platform rims
  crystalPurple: 0xbb88ff,  // ← Purple crystals
  crystalGreen: 0x66ffaa,   // ← Green crystals
  woodColor: 0x1a1210,      // ← Wooden supports under platforms
  vineColor: 0x0e2818,      // ← Hanging vines (not currently used)
};
```

---

## 7. 📐 Change platform positions

**File:** `src/game/LevelBuilder.ts` — the `defs` array (line ~140):

```typescript
const defs: [number, number, number, number][] = [
  // [x position, y position, width, height]
  [60,  840, 160, 20],    // ← Platform 1
  [120, 860, 200, 20],    // ← Platform 2
  // Add or remove lines to change the level
];
```

**Tips:**
- X range: 0 (left) to 4800 (right)
- Y range: 0 (top) to 1080 (bottom)  
- Player spawns at `{ x: 140, y: 830 }` (line ~300)
- Leave 150-300px gaps for jumping

---

## 8. 💡 Change the darkness

**File:** `src/game/GameScene.ts` (lines ~49-57)

```typescript
this.cameras.main.setBackgroundColor(0x040a0e);    // ← Sky behind everything
this.lights.setAmbientColor(0x0a1218);              // ← Darkness level (0x000000 = pitch black, 0xffffff = bright)
this.playerLight = this.lights.addLight(0, 0, 220, 0x88ddff, 1.5);
//                                            ↑radius  ↑color    ↑intensity
```

**To make brighter:** Change `0x0a1218` to `0x2a3a4a`

---

## Quick reference

| What | File | Section |
|---|---|---|
| Sky color | `LevelBuilder.ts` | `drawScenery()` → #1 |
| Stars | `LevelBuilder.ts` | `drawScenery()` → #2 |
| Moon | `LevelBuilder.ts` | `drawScenery()` → #3 |
| Kingdom | `LevelBuilder.ts` | `drawScenery()` → #4 |
| Forest | `LevelBuilder.ts` | `drawScenery()` → #5/#6 |
| Fireflies | `LevelBuilder.ts` | `drawScenery()` → #7 |
| Platform rim color | `PlatformLedge.ts` | ~line 51 |
| Platform positions | `LevelBuilder.ts` | `defs` array |
| Darkness | `GameScene.ts` | `setAmbientColor()` |
| Player light | `GameScene.ts` | `addLight()` |

---

**After any edit:** run `npx vite build`, then open `dist/index.html` in your browser to see the changes.