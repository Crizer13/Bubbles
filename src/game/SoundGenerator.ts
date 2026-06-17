// ─────────────────────────────────────────────────────────────────────────────
// SoundGenerator.ts — Synthesizes game sound effects using the Web Audio API.
// No audio files needed — all sounds are generated procedurally.
// ─────────────────────────────────────────────────────────────────────────────

import { AudioSettings } from '../store/AudioSettings';

export interface GameSounds {
  jump: () => void;
  dash: () => void;
  land: () => void;
  death: () => void;
  collect: () => void;
  victory: () => void;
  trigger: () => void;
  ambientDrone: () => { stop: () => void };
}

/**
 * Creates a collection of synthesised game sounds using Web Audio oscillators.
 * All sounds are generated at runtime — no audio files required.
 */
export function createSoundGenerator(): GameSounds {
  let audioCtx: AudioContext | null = null;

  function getCtx(): AudioContext {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    // Resume if suspended (browsers require user gesture to start)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Play a tone with given parameters.
   * Volume is multiplied by the current SFX effective volume.
   */
  function playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    baseVolume: number = 0.15,
    rampEnd?: number,
  ): void {
    try {
      const ctx = getCtx();
      const settings = AudioSettings.get();
      if (settings.muted) return;

      const vol = baseVolume * settings.masterVolume * settings.sfxVolume;
      if (vol <= 0) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (rampEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(rampEnd, ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available — silently ignore
    }
  }

  /**
   * Play a noise burst (for impacts / thuds).
   * Uses a buffer of random samples.
   */
  function playNoise(duration: number, baseVolume: number = 0.08, lowPassFreq: number = 400): void {
    try {
      const ctx = getCtx();
      const settings = AudioSettings.get();
      if (settings.muted) return;

      const vol = baseVolume * settings.masterVolume * settings.sfxVolume;
      if (vol <= 0) return;

      const sampleRate = ctx.sampleRate;
      const length = sampleRate * duration;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.03));
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(lowPassFreq, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(ctx.currentTime);
    } catch {
      // Audio not available — silently ignore
    }
  }

  // ── Sound definitions ──────────────────────────────────────────────────

  /** Quick ascending chirp — the sheep jumps */
  function playJump(): void {
    playTone(200, 0.15, 'square', 0.1, 600);
    playTone(300, 0.12, 'triangle', 0.06, 700);
  }

  /** Swoosh / whoosh for dashing */
  function playDash(): void {
    playNoise(0.2, 0.06, 2000);
    playTone(800, 0.12, 'sawtooth', 0.04, 200);
  }

  /** Soft thud for landing */
  function playLand(): void {
    playNoise(0.08, 0.05, 200);
    playTone(80, 0.08, 'sine', 0.06, 60);
  }

  /** Descending sad tone for death */
  function playDeath(): void {
    playTone(400, 0.4, 'square', 0.12, 80);
    playTone(200, 0.5, 'triangle', 0.08, 50);
    playNoise(0.3, 0.1, 300);
  }

  /** Pleasant ding for collecting things */
  function playCollect(): void {
    playTone(880, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(1100, 0.15, 'sine', 0.08), 80);
  }

  /** Bright ascending fanfare for victory */
  function playVictory(): void {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.1), i * 120);
    });
    setTimeout(() => playNoise(0.5, 0.04, 4000), 400);
  }

  /** Eerie rising tone for the music trigger zone */
  function playTrigger(): void {
    playTone(220, 0.8, 'sine', 0.06, 440);
    playTone(330, 0.6, 'triangle', 0.04, 550);
  }

  /**
   * Creates a continuous ambient drone (low rumbling cavern sound).
   * Respects ambientVolume settings in real-time.
   */
  function playAmbientDrone(): { stop: () => void } {
    let stopped = false;
    try {
      const ctx = getCtx();

      // Low rumble
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, ctx.currentTime);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(82.5, ctx.currentTime);

      // Sub-bass
      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(27.5, ctx.currentTime);

      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const gain3 = ctx.createGain();

      // Function to update ambient volume based on settings
      function updateAmbientVolume(): void {
        const eff = AudioSettings.getEffectiveVolume('ambient');
        const baseGain = 0.03;
        const now = ctx.currentTime;
        gain1.gain.linearRampToValueAtTime(baseGain * eff, now + 0.2);
        gain2.gain.linearRampToValueAtTime(baseGain * 0.67 * eff, now + 0.2);
        gain3.gain.linearRampToValueAtTime(baseGain * 1.33 * eff, now + 0.2);
      }

      // Initial volume
      const initialEff = AudioSettings.getEffectiveVolume('ambient');
      gain1.gain.setValueAtTime(0.03 * initialEff, ctx.currentTime);
      gain2.gain.setValueAtTime(0.02 * initialEff, ctx.currentTime);
      gain3.gain.setValueAtTime(0.04 * initialEff, ctx.currentTime);

      // Subscribe to settings changes for real-time volume updates
      const unsub = AudioSettings.subscribe(updateAmbientVolume);

      // Low-pass filter to make it feel cavernous
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, ctx.currentTime);

      // Slight LFO on the volume for organic feel
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.01, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(gain1.gain);
      lfo.start(ctx.currentTime);

      osc1.connect(gain1);
      osc2.connect(gain2);
      osc3.connect(gain3);
      gain1.connect(filter);
      gain2.connect(filter);
      gain3.connect(filter);
      filter.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc3.start(ctx.currentTime);

      return {
        stop: () => {
          if (stopped) return;
          stopped = true;
          unsub();
          try {
            gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            gain3.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            lfo.stop(ctx.currentTime + 0.5);
            osc1.stop(ctx.currentTime + 0.5);
            osc2.stop(ctx.currentTime + 0.5);
            osc3.stop(ctx.currentTime + 0.5);
          } catch {
            // Already stopped
          }
        },
      };
    } catch {
      return { stop: () => {} };
    }
  }

  return {
    jump: playJump,
    dash: playDash,
    land: playLand,
    death: playDeath,
    collect: playCollect,
    victory: playVictory,
    trigger: playTrigger,
    ambientDrone: playAmbientDrone,
  };
}

/** Preview sound used in settings sliders */
export function playPreviewSound(): void {
  const gen = createSoundGenerator();
  gen.collect();
}