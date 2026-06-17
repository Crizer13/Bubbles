import { useState, useEffect, useCallback } from 'react';
import { AudioSettings, type AudioSettings as AudioSettingsType } from './store/AudioSettings';
import { playPreviewSound } from './game/SoundGenerator';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<AudioSettingsType>(AudioSettings.get());
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Subscribe to external changes (e.g. from game scene)
  useEffect(() => {
    const unsub = AudioSettings.subscribe((s) => setSettings(s));
    return unsub;
  }, []);

  const update = useCallback((partial: Partial<AudioSettingsType>) => {
    AudioSettings.update(partial);
  }, []);

  const handleReset = useCallback(() => {
    AudioSettings.reset();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center py-8 px-4">
      {/* Ambient glow */}
      <div className="fixed top-[-15%] left-[-5%] w-[50%] h-[50%] bg-gradient-radial from-blue-500/6 to-transparent rounded-full pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[50%] h-[50%] bg-gradient-radial from-purple-500/5 to-transparent rounded-full pointer-events-none" />

      {/* Back button */}
      <button onClick={onBack} className="back-button">
        <span className="text-blue-400/70">←</span>
        <span>Back</span>
      </button>

      <div className="max-w-[480px] w-full space-y-6 pb-12 pt-20">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="section-heading text-2xl text-blue-400 flex items-center justify-center gap-2">
            <span>🎛️</span> Audio Settings
          </h1>
          <p className="text-gray-500 text-xs">
            Adjust volume levels. Changes take effect immediately.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="h-px w-16 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
            <span className="text-blue-400/40 text-xs select-none">✦</span>
            <span className="h-px w-16 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
          </div>
        </div>

        {/* Mute toggle */}
        <div className="glossy-card px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-gray-300 text-sm font-medium">Mute All</span>
            <p className="text-gray-600 text-xs mt-0.5">Silence all game audio</p>
          </div>
          <button
            onClick={() => update({ muted: !settings.muted })}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
              settings.muted
                ? 'bg-red-500/30 border border-red-500/30'
                : 'bg-blue-500/20 border border-blue-500/30'
            }`}
            aria-label={settings.muted ? 'Unmute all' : 'Mute all'}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white/20 transition-all duration-300 ${
                settings.muted ? 'left-7' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Master Volume */}
        <SliderControl
          label="Master Volume"
          value={settings.masterVolume}
          onChange={(v) => update({ masterVolume: v })}
          icon="🔊"
          tooltip={showTooltip === 'master'}
          onStartTooltip={() => setShowTooltip('master')}
          onEndTooltip={() => setShowTooltip(null)}
        />

        {/* SFX Volume */}
        <SliderControl
          label="Sound Effects"
          value={settings.sfxVolume}
          onChange={(v) => update({ sfxVolume: v })}
          icon="🔔"
          tooltip={showTooltip === 'sfx'}
          onStartTooltip={() => setShowTooltip('sfx')}
          onEndTooltip={() => setShowTooltip(null)}
        />

        {/* Ambient Volume */}
        <SliderControl
          label="Ambient / Drone"
          value={settings.ambientVolume}
          onChange={(v) => update({ ambientVolume: v })}
          icon="🌊"
          tooltip={showTooltip === 'ambient'}
          onStartTooltip={() => setShowTooltip('ambient')}
          onEndTooltip={() => setShowTooltip(null)}
        />

        {/* Preview button */}
        <div className="glossy-card px-5 py-3 flex items-center justify-between">
          <span className="text-gray-400 text-sm">Test Sound</span>
          <button
            onClick={playPreviewSound}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs
              hover:bg-white/10 hover:text-gray-200 transition-all duration-200 active:scale-95"
          >
            ▶ Play Sample
          </button>
        </div>

        {/* Reset */}
        <div className="glossy-card px-5 py-3 flex items-center justify-between">
          <span className="text-gray-400 text-sm">Reset to Defaults</span>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs
              hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 active:scale-95"
          >
            ↺ Reset
          </button>
        </div>

        {/* Status info */}
        <div className="text-center text-[10px] text-gray-700 space-y-1 pt-4 border-t border-gray-800/40">
          <p>
            {settings.muted
              ? '🔇 Audio is muted'
              : `🔊 Master: ${Math.round(settings.masterVolume * 100)}% · SFX: ${Math.round(settings.sfxVolume * 100)}% · Ambient: ${Math.round(settings.ambientVolume * 100)}%`}
          </p>
          <p>Settings saved automatically</p>
        </div>
      </div>
    </div>
  );
}

// ── Slider Control Component ───────────────────────────────────────────────

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon: string;
  tooltip: boolean;
  onStartTooltip: () => void;
  onEndTooltip: () => void;
}

function SliderControl({ label, value, onChange, icon, tooltip, onStartTooltip, onEndTooltip }: SliderControlProps) {
  return (
    <div className="glossy-card px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-gray-300 text-sm font-medium">{label}</span>
        </div>
        <div className="relative">
          <span
            className="text-gray-500 text-xs font-mono w-10 text-right cursor-default"
            onMouseEnter={onStartTooltip}
            onMouseLeave={onEndTooltip}
          >
            {Math.round(value * 100)}%
          </span>
          {tooltip && (
            <span className="absolute -top-8 right-0 px-2 py-1 rounded bg-gray-800 text-gray-300 text-[10px] whitespace-nowrap border border-white/10">
              {value < 0.1 ? 'Almost off' : value < 0.3 ? 'Quiet' : value < 0.6 ? 'Moderate' : value < 0.85 ? 'Loud' : 'Max'}
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none rounded-full bg-white/10 outline-none
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-400/30
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgba(79,195,247,0.4) 0%, rgba(79,195,247,0.4) ${value * 100}%, rgba(255,255,255,0.06) ${value * 100}%, rgba(255,255,255,0.06) 100%)`,
          }}
        />
      </div>
    </div>
  );
}