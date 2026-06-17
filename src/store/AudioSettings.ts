// ─────────────────────────────────────────────────────────────────────────────
// AudioSettings.ts — Global audio settings (persisted in localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioSettings {
  masterVolume: number;   // 0.0 – 1.0
  sfxVolume: number;      // 0.0 – 1.0
  ambientVolume: number;  // 0.0 – 1.0
  muted: boolean;
}

const STORAGE_KEY = 'bubbles_audio_settings';

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  ambientVolume: 0.5,
  muted: false,
};

let currentSettings: AudioSettings = { ...DEFAULT_SETTINGS };

// ── Load from localStorage ─────────────────────────────────────────────────
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
  }
} catch {
  // Ignore parse errors, use defaults
}

// ── Listener pattern for reactive updates ──────────────────────────────────
type Listener = (settings: AudioSettings) => void;
const listeners: Set<Listener> = new Set();

function notify(): void {
  for (const fn of listeners) {
    fn(currentSettings);
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch {
    // Storage not available
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
export const AudioSettings = {
  /** Get current settings snapshot */
  get(): AudioSettings {
    return { ...currentSettings };
  },

  /** Update one or more fields */
  update(partial: Partial<AudioSettings>): AudioSettings {
    currentSettings = { ...currentSettings, ...partial };
    persist();
    notify();
    return this.get();
  },

  /** Reset to defaults */
  reset(): AudioSettings {
    currentSettings = { ...DEFAULT_SETTINGS };
    persist();
    notify();
    return this.get();
  },

  /** Subscribe to changes. Returns unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Get the effective volume for a category (applies master + category + mute) */
  getEffectiveVolume(category: 'sfx' | 'ambient'): number {
    if (currentSettings.muted) return 0;
    const catVol = category === 'sfx' ? currentSettings.sfxVolume : currentSettings.ambientVolume;
    return currentSettings.masterVolume * catVol;
  },
};
