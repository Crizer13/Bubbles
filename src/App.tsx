import { useState, useRef, useEffect, useCallback } from 'react';
import { createPhaserGame } from './game/PhaserGame';
import MainMenu from './MainMenu';
import Settings from './Settings';

type Screen = 'menu' | 'game' | 'guide' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Cleanup game instance
  const destroyGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
  }, []);

  // Start the game
  const handleStart = useCallback(() => {
    setScreen('game');
  }, []);

  // Show guide
  const handleShowGuide = useCallback(() => {
    setScreen('guide');
  }, []);

  // Show settings
  const handleShowSettings = useCallback(() => {
    setScreen('settings');
  }, []);

  // Go back to menu
  const handleBackToMenu = useCallback(() => {
    destroyGame();
    setScreen('menu');
  }, [destroyGame]);

  // Track if we're currently creating a game to prevent double-creation
  const creatingGameRef = useRef(false);

  // Create/destroy Phaser game when screen changes
  useEffect(() => {
    if (screen === 'game' && containerRef.current && !gameRef.current && !creatingGameRef.current) {
      creatingGameRef.current = true;
      const id = setTimeout(() => {
        if (containerRef.current && !gameRef.current) {
          gameRef.current = createPhaserGame(containerRef.current);
        }
        creatingGameRef.current = false;
      }, 50);
      return () => {
        clearTimeout(id);
        creatingGameRef.current = false;
      };
    }
  }, [screen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyGame();
    };
  }, [destroyGame]);

  // ── Menu Screen ────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <MainMenu
        onStart={handleStart}
        onShowGuide={handleShowGuide}
        onShowSettings={handleShowSettings}
      />
    );
  }

  // ── Game Screen ────────────────────────────────────────────────────
  if (screen === 'game') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-[#05050a]">
        {/* Ambient glow */}
        <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-radial from-blue-500/5 to-transparent rounded-full pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-radial from-purple-500/4 to-transparent rounded-full pointer-events-none" />

        {/* Back button */}
        <button
          onClick={handleBackToMenu}
          className="back-button"
          style={{ position: 'fixed', top: '24px', left: '24px', zIndex: 50 }}
        >
          <span className="text-blue-400/70">←</span>
          <span>Menu</span>
        </button>

        {/* Game canvas */}
        <div className="game-wrapper">
          <div ref={containerRef} />
        </div>

        {/* Hint */}
        <p className="mt-4 text-[10px] text-gray-700 tracking-widest uppercase font-display">
          Press Menu or Esc to return
        </p>
      </div>
    );
  }

  // ── Guide Screen ───────────────────────────────────────────────────
  if (screen === 'guide') {
    return (
      <div className="relative min-h-screen flex flex-col items-center py-8 px-4">
        {/* Ambient glow */}
        <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-radial from-blue-500/5 to-transparent rounded-full pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-radial from-purple-500/4 to-transparent rounded-full pointer-events-none" />

        {/* Back button */}
        <button
          onClick={handleBackToMenu}
          className="back-button"
        >
          <span className="text-blue-400/70">←</span>
          <span>Back</span>
        </button>

        {/* Guide content */}
        <div className="max-w-[960px] w-full space-y-8 pb-12 pt-20">
          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="game-title">
              Bubbles
            </h1>
            <p className="game-subtitle max-w-2xl mx-auto">
              A TypeScript port of a Godot-style character controller with coyote time, jump buffering, variable jump height, and directional dash.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <span className="h-px w-16 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
              <span className="text-blue-400/40 text-xs select-none">✦</span>
              <span className="h-px w-16 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
            </div>
          </div>

          {/* Controls */}
          <section className="space-y-4">
            <h2 className="section-heading text-blue-400 flex items-center gap-2">
              <span className="text-lg">⌨️</span> Controls
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="glossy-card px-4 py-3 flex items-center gap-2 flex-wrap">
                <span className="text-gray-400 text-sm">Move:</span>{' '}
                <kbd>←</kbd>
                <kbd>→</kbd>
                <span className="text-gray-600 text-xs">or</span>
                <kbd>A</kbd>
                <kbd>D</kbd>
              </div>
              <div className="glossy-card px-4 py-3 flex items-center gap-2 flex-wrap">
                <span className="text-gray-400 text-sm">Jump:</span>{' '}
                <kbd>Space</kbd>
                <span className="text-gray-600 text-xs">or</span>
                <kbd>↑</kbd>
              </div>
              <div className="glossy-card px-4 py-3 flex items-center gap-2">
                <span className="text-gray-400 text-sm">Dash:</span>{' '}
                <kbd>Shift</kbd>
              </div>
              <div className="glossy-card px-4 py-3 flex items-center gap-2">
                <span className="text-gray-400 text-sm">Tip:</span>{' '}
                <span className="text-gray-500 text-xs">Tap jump quickly for short hops!</span>
              </div>
            </div>
          </section>

          {/* Part 1 — Controller architecture */}
          <section className="space-y-4">
            <h2 className="section-heading text-purple-400 flex items-center gap-2">
              <span className="text-lg">📦</span> Part 1 — Player Controller Architecture
            </h2>
            <div className="glossy-card p-5 space-y-4 text-sm text-gray-400 leading-relaxed">
              <p>
                The <code>PlayerController</code> extends{' '}
                <code>Phaser.Physics.Arcade.Sprite</code>{' '}
                and is configured via TypeScript interfaces (<code>HorizontalMovementConfig</code>,{' '}
                <code>JumpConfig</code>,{' '}
                <code>DashConfig</code>, etc.) merged with sensible defaults.
              </p>
              <p>
                Every frame, <code>controllerUpdate(time, delta, input)</code> is called from the scene.
                It delegates to five private methods:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong className="text-gray-300">updateTimers</strong> — counts down coyote, jump-buffer, dash timers</li>
                <li><strong className="text-gray-300">handleDashInput</strong> — starts dashes, overrides velocity during dash, applies end-velocity cut</li>
                <li><strong className="text-gray-300">handleHorizontalMovement</strong> — acceleration/friction with clamping</li>
                <li><strong className="text-gray-300">handleJumpInput</strong> — coyote + buffer check, variable-height jump cut</li>
                <li><strong className="text-gray-300">applyGravity</strong> — rising vs falling gravity scale</li>
              </ul>
              <p>
                The controller exposes a <code>state: PlayerState</code> field{' '}
                (<code className="text-gray-500">'idle' | 'run' | 'jump' | 'fall' | 'dash'</code>) that you can read from the scene to drive sprite
                animations without coupling animation logic to the controller.
              </p>
            </div>
          </section>

          {/* Part 2 — Scene setup guide */}
          <section className="space-y-4">
            <h2 className="section-heading text-pink-400 flex items-center gap-2">
              <span className="text-lg">🎮</span> Part 2 — Scene Setup Guide
            </h2>
            <div className="space-y-3">
              {[
                {
                  title: 'Step 1 — Keyboard Bindings',
                  text: 'In create(), grab Phaser\'s built-in cursor keys plus custom keys for WASD and dash. Each frame in update(), build a PlayerInput object using key.isDown and JustDown(key), then pass it to the controller. This decouples input from movement logic — you could swap in gamepad input without touching the controller.',
                  accent: 'blue' as const,
                },
                {
                  title: 'Step 2 — Smooth Camera Follow',
                  text: 'Use camera.startFollow(player, true, lerpX, lerpY) with low lerp values (0.08) for buttery easing instead of snapping. camera.setBounds() clamps the viewport to the level rectangle so you never see empty space. A small dead zone via camera.setDeadzone(60, 40) prevents micro-jitter when the player stands still.',
                  accent: 'purple' as const,
                },
                {
                  title: 'Step 3 — Lights2D for Moody Atmosphere',
                  text: 'Call this.lights.enable() and set a dark ambient with this.lights.setAmbientColor(0x222233). Any sprite that should react to lighting needs sprite.setPipeline(\'Light2D\'). Add a point light on the player that follows them each frame, plus static lights on glowing orbs and decorations. Tween the light intensity for a pulsing, alive feel.',
                  accent: 'pink' as const,
                },
                {
                  title: 'Step 4 — Bloom / Glow Post-FX',
                  text: 'Phaser 3.60+ includes a built-in bloom pipeline accessible via camera.postFX.addBloom(color, offsetX, offsetY, blurStrength, strength). This catches any bright pixels (the orbs, lights) and bleeds them outward. Requires type: Phaser.WEBGL in the game config.',
                  accent: 'green' as const,
                },
                {
                  title: 'Step 5 — Music Trigger Zones',
                  text: 'Create a Phaser.GameObjects.Zone, add a static Arcade body, then use physics.add.overlap(player, zone, callback). In the callback, tween the ambient music volume down and the intense track volume up. Track entry/exit with a boolean flag, resetting it in update() when the player leaves the zone bounds. The demo shows the notification text; in a real game you\'d call this.sound.add() and tween the volume property.',
                  accent: 'gold' as const,
                },
              ].map(({ title, text, accent }) => {
                const colorMap: Record<string, string> = {
                  blue: 'blue-300',
                  purple: 'purple-300',
                  pink: 'pink-300',
                  green: 'emerald-300',
                  gold: 'amber-300',
                };
                return (
                  <div key={title} className="glossy-card p-4">
                    <h3 className={`text-sm font-semibold text-${colorMap[accent]} mb-2`}>
                      {title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Config reference */}
          <section className="space-y-4">
            <h2 className="section-heading text-emerald-400 flex items-center gap-2">
              <span className="text-lg">⚙️</span> Tunable Parameters
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                ['maxSpeed', '260 px/s', 'Max horizontal velocity'],
                ['acceleration', '1800 px/s²', 'How quickly you reach max speed'],
                ['friction', '2400 px/s²', 'How quickly you stop'],
                ['jumpVelocity', '-420 px/s', 'Initial jump impulse'],
                ['minJumpVelocity', '-180 px/s', 'Velocity cap on early release'],
                ['risingGravityScale', '1.0×', 'Gravity while going up'],
                ['fallingGravityScale', '1.7×', 'Gravity while falling'],
                ['coyoteTimeMs', '100 ms', 'Grace period after leaving ledge'],
                ['jumpBufferMs', '120 ms', 'Pre-landing jump press memory'],
                ['dashSpeed', '520 px/s', 'Dash velocity'],
                ['dashDurationMs', '150 ms', 'How long the dash lasts'],
                ['dashCooldownMs', '600 ms', 'Time between dashes'],
                ['endVelocityCutFactor', '0.35', 'Velocity multiplier post-dash'],
              ].map(([name, value, desc]) => (
                <div key={name} className="glossy-card px-4 py-3 flex justify-between items-start gap-3">
                  <div>
                    <span className="text-emerald-300 font-medium text-sm">{name}</span>
                    <span className="text-gray-600 text-xs block mt-0.5">{desc}</span>
                  </div>
                  <span className="text-gray-500 text-xs whitespace-nowrap font-mono">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center text-xs text-gray-700 pt-6 border-t border-gray-800/40 space-y-1">
            <p>Built with Phaser 3.60+ · TypeScript · React · Tailwind CSS</p>
            <p className="text-gray-800 text-[10px]">
              Fonts: Orbitron · Press Start 2P · Inter · JetBrains Mono
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // ── Settings Screen ────────────────────────────────────────────────
  if (screen === 'settings') {
    return <Settings onBack={handleBackToMenu} />;
  }

  return null;
}