import { useState, useEffect, useRef } from 'react';

interface MainMenuProps {
  onStart: () => void;
  onShowGuide: () => void;
  onShowSettings: () => void;
}

export default function MainMenu({ onStart, onShowGuide, onShowSettings }: MainMenuProps) {
  const [showContent, setShowContent] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Animate entrance
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden select-none">
      {/* Animated background particles (CSS bubbles) */}
      <div className="menu-bubbles" />

      {/* Ambient glow spots */}
      <div className="fixed top-[-15%] left-[-5%] w-[50%] h-[50%] bg-gradient-radial from-blue-500/8 to-transparent rounded-full pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[50%] h-[50%] bg-gradient-radial from-purple-500/6 to-transparent rounded-full pointer-events-none" />

      {/* Logo / Brand section */}
      <div
        className={`text-center transition-all duration-1000 ease-out ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        {/* Decorative top glow orb */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 via-purple-400/20 to-pink-400/30 blur-xl animate-pulse-slow" />
            <div className="absolute inset-2 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-md animate-pulse-slower" />
            <div className="absolute inset-4 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-300/20 to-blue-500/20 blur-sm" />
          </div>
        </div>

        {/* Game Title */}
        <h1
          ref={titleRef}
          className="menu-title mb-3"
        >
          Bubbles
        </h1>

        {/* Tagline */}
        <p className="menu-tagline mb-10">
          A glossy platformer demo
        </p>

        {/* Decorative separator */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className="h-px w-24 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-ping-slow" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-ping-slow" style={{ animationDelay: '0.3s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400/40 animate-ping-slow" style={{ animationDelay: '0.6s' }} />
          </div>
          <span className="h-px w-24 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent" />
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-4">
          <MenuButton
            label="▶  PLAY"
            sublabel="Start the game"
            isHovered={hoveredButton === 'play'}
            onHover={() => setHoveredButton('play')}
            onLeave={() => setHoveredButton(null)}
            onClick={onStart}
            accent="blue"
          />

          <MenuButton
            label="⌨  CONTROLS & INFO"
            sublabel="How to play & documentation"
            isHovered={hoveredButton === 'guide'}
            onHover={() => setHoveredButton('guide')}
            onLeave={() => setHoveredButton(null)}
            onClick={onShowGuide}
            accent="purple"
          />

          <MenuButton
            label="🎛  SETTINGS"
            sublabel="Audio volume controls"
            isHovered={hoveredButton === 'settings'}
            onHover={() => setHoveredButton('settings')}
            onLeave={() => setHoveredButton(null)}
            onClick={onShowSettings}
            accent="pink"
          />
        </div>

        {/* Version footer */}
        <p className="mt-12 text-[10px] text-gray-800 tracking-widest uppercase">
          Phaser 3 · TypeScript · React
        </p>
      </div>
    </div>
  );
}

// ── Glossy Menu Button ──────────────────────────────────────────────────────

interface MenuButtonProps {
  label: string;
  sublabel: string;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  accent: 'blue' | 'purple' | 'pink';
}

function MenuButton({ label, sublabel, isHovered, onHover, onLeave, onClick, accent }: MenuButtonProps) {
  const accentColor = accent === 'blue'
    ? 'rgba(79, 195, 247, '
    : accent === 'purple'
      ? 'rgba(179, 136, 255, '
      : 'rgba(255, 128, 171, ';

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="menu-button group relative w-72 px-8 py-4 rounded-xl overflow-hidden
        bg-gradient-to-b from-white/[0.06] to-white/[0.02]
        border border-white/[0.08] 
        transition-all duration-300 ease-out
        hover:scale-[1.03] active:scale-[0.98]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
      style={{
        boxShadow: isHovered
          ? `0 0 30px ${accentColor}0.15), 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)`
          : '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        borderColor: isHovered
          ? `${accentColor}0.3)`
          : 'rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Glossy shine overlay on hover */}
      <span
        className={`absolute inset-0 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `linear-gradient(135deg, ${accentColor}0.08) 0%, transparent 60%)`,
        }}
      />

      {/* Shine sweep */}
      <span
        className={`absolute inset-0 transition-transform duration-700 ease-out ${
          isHovered ? 'translate-x-full' : '-translate-x-full'
        }`}
        style={{
          background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)`,
        }}
      />

      {/* Button content */}
      <div className="relative z-10 flex flex-col items-center gap-0.5">
        <span className={`font-display font-bold text-sm tracking-[0.15em] uppercase transition-colors duration-300 ${
          isHovered ? 'text-gray-200' : 'text-gray-300'
        }`}>
          {label}
        </span>
        <span className={`font-body text-[10px] tracking-wider transition-all duration-300 ${
          isHovered ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {sublabel}
        </span>
      </div>

      {/* Animated border glow */}
      <span
        className={`absolute inset-0 rounded-xl transition-opacity duration-500 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          boxShadow: `inset 0 0 20px ${accentColor}0.1)`,
        }}
      />
    </button>
  );
}