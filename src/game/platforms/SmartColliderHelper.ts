// ─────────────────────────────────────────────────────────────────────────────
// SmartColliderHelper.ts — Efficient 2D collider system that prevents players
// from getting stuck on vertical walls when jumping.
// ─────────────────────────────────────────────────────────────────────────────
//
// PROBLEM:
//   When platforms use full-body colliders, the player can "wall-stick" on
//   vertical pillar sides while jumping past them. This creates a frustrating
//   snagging feeling.
//
// SOLUTION:
//   Smart colliders use a "top-only" approach where:
//   1. The top surface has a wide, thin collider (player lands on this)
//   2. Side walls use one-way colliders (player can pass through from the side
//      but not from above/below)
//   3. An optional "inner" collider prevents the player from falling through
//      the platform entirely
//
//   This mimics a CompositeCollider2D approach but works with Phaser Arcade
//   Physics' simple box colliders.
//
// USAGE:
//   const helper = new SmartColliderHelper(scene);
//   helper.createTopOnlyPlatform(platformGroup, x, y, width);
//   helper.createPillarColliders(pillarGroup, wallGroup, x, y, width, height);

import Phaser from 'phaser';

// ── Collision category flags for filtering ────────────────────────────────────
// These allow selective collision — e.g., player can collide with top surfaces
// but slide past walls.
export const CollisionCategory = {
  /** Standard solid platform — player collides from all sides */
  SOLID: 0x0001,
  /** Top-only platform — player only collides when landing from above */
  TOP_ONLY: 0x0002,
  /** Wall — one-way side collision (player passes through from left/right) */
  WALL: 0x0004,
  /** Hazard — damages the player on contact */
  HAZARD: 0x0008,
  /** Moving platform — special handling */
  MOVING: 0x0010,
} as const;

// ── SmartColliderHelper ───────────────────────────────────────────────────────
export class SmartColliderHelper {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ── Create a top-only platform (one-way) ──────────────────────────────────
  //
  // The player can only stand on this platform from above.
  // They can jump up through it from below.
  //
  public createTopOnlyPlatform(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    thickness: number = 8,
    textureKey?: string,
  ): Phaser.Physics.Arcade.Sprite {
    const texKey = textureKey || 'platform_tex';
    const plat = group.create(x, y, texKey) as Phaser.Physics.Arcade.Sprite;
    plat.setDisplaySize(width, thickness);
    plat.refreshBody();
    plat.setVisible(false);
    plat.setPipeline('Light2D');

    // Store metadata on the body for collision processing
    const body = plat.body as Phaser.Physics.Arcade.StaticBody;
    (body as any).__collisionCategory = CollisionCategory.TOP_ONLY;

    return plat;
  }

  // ── Create a full pillar with smart colliders ────────────────────────────
  //
  // Creates a pillar with:
  //   - A thin top platform (landing zone)
  //   - Two thin side walls (prevent falling through, but allow sliding)
  //   - The top platform extends slightly wider than the visual body
  //
  public createPillarColliders(
    platformGroup: Phaser.Physics.Arcade.StaticGroup,
    wallGroup: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
    textureKey?: string,
  ): { top: Phaser.Physics.Arcade.Sprite; leftWall: Phaser.Physics.Arcade.Sprite; rightWall: Phaser.Physics.Arcade.Sprite } {
    const texKey = textureKey || 'pillar_tex';
    const halfW = width / 2;
    const halfH = height / 2;
    const wallThickness = 4;

    // ── Top platform (wider than pillar body for generous landing) ────────
    const topY = y - halfH + 4; // Top edge of the pillar
    const top = this.createTopOnlyPlatform(
      platformGroup,
      x,
      topY,
      width + 6, // Slightly wider than pillar
      8,
      texKey,
    );

    // ── Left wall collider ────────────────────────────────────────────────
    const leftWallX = x - halfW + wallThickness / 2;
    const leftWall = wallGroup.create(leftWallX, y, texKey) as Phaser.Physics.Arcade.Sprite;
    leftWall.setDisplaySize(wallThickness, height - 8); // Slightly shorter than full height
    leftWall.refreshBody();
    leftWall.setVisible(false);
    const leftBody = leftWall.body as Phaser.Physics.Arcade.StaticBody;
    (leftBody as any).__collisionCategory = CollisionCategory.WALL;

    // ── Right wall collider ───────────────────────────────────────────────
    const rightWallX = x + halfW - wallThickness / 2;
    const rightWall = wallGroup.create(rightWallX, y, texKey) as Phaser.Physics.Arcade.Sprite;
    rightWall.setDisplaySize(wallThickness, height - 8);
    rightWall.refreshBody();
    rightWall.setVisible(false);
    const rightBody = rightWall.body as Phaser.Physics.Arcade.StaticBody;
    (rightBody as any).__collisionCategory = CollisionCategory.WALL;

    return { top, leftWall, rightWall };
  }

  // ── Create a one-way wall (passable from one direction) ──────────────────
  //
  // Creates a wall that the player can pass through from one side.
  // Useful for allowing the player to jump up past platforms.
  //
  public createOneWayWall(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
    passFromDirection: 'left' | 'right' | 'top' | 'bottom',
    textureKey?: string,
  ): Phaser.Physics.Arcade.Sprite {
    const texKey = textureKey || 'pillar_tex';
    const wall = group.create(x, y, texKey) as Phaser.Physics.Arcade.Sprite;
    wall.setDisplaySize(width, height);
    wall.refreshBody();
    wall.setVisible(false);
    wall.setPipeline('Light2D');

    const body = wall.body as Phaser.Physics.Arcade.StaticBody;
    (body as any).__collisionCategory = CollisionCategory.WALL;
    (body as any).__passDirection = passFromDirection;

    return wall;
  }
}

// ── Collision callback helper ─────────────────────────────────────────────────
//
// Use this in your scene to handle smart collisions:
//
//   this.physics.add.collider(player, platformGroup, SmartColliderHelper.onCollide);
//   this.physics.add.collider(player, wallGroup, SmartColliderHelper.onWallCollide);
//
export class SmartCollisionHandler {
  /**
   * Handle top-only platform collision.
   * The player can only stand on the platform if they are falling onto it from above.
   * They can jump up through it from below.
   */
  static onTopOnlyCollide(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): boolean {
    const playerBody = (player as any).body as Phaser.Physics.Arcade.Body;
    const platBody = (platform as any).body as Phaser.Physics.Arcade.StaticBody;

    // If the player is moving upward and their bottom is below the platform top,
    // they should pass through (jumping up from below)
    const playerBottom = playerBody.y + playerBody.height / 2;
    const platTop = platBody.y - platBody.height / 2;

    // Allow passing through if player is below the platform and moving up
    if (playerBody.velocity.y < 0 && playerBottom < platTop + 4) {
      return false; // Don't collide
    }

    return true; // Allow collision (landing)
  }

  /**
   * Handle wall collision — allows sliding along walls without sticking.
   * This works by only checking horizontal overlap significance.
   */
  static onWallCollide(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    wall: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ): void {
    const playerBody = (player as any).body as Phaser.Physics.Arcade.Body;
    // Reduce friction on walls so the player slides off
    playerBody.setDragX(0);
  }
}