import { Sparkles } from 'lucide-react';
import RankEmblem from '../game/RankEmblem.jsx';

function CharacterFigure({ displayName }) {
  return (
    <svg
      aria-label={`Basic Shadow Ascent RPG avatar for ${displayName}`}
      className="h-full w-full overflow-visible"
      role="img"
      viewBox="0 0 260 460"
    >
      <defs>
        <linearGradient id="shadow-avatar-armor" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#252550" />
          <stop offset="50%" stopColor="#141430" />
          <stop offset="100%" stopColor="#09091f" />
        </linearGradient>
        <linearGradient id="shadow-avatar-armor-light" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#2e2e60" />
          <stop offset="100%" stopColor="#16163c" />
        </linearGradient>
        <linearGradient id="shadow-avatar-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d1a030" />
        </linearGradient>
        <linearGradient id="shadow-avatar-blade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="45%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
        <radialGradient id="shadow-avatar-gem" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#6d28d9" />
        </radialGradient>
        <radialGradient id="shadow-avatar-eye" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="shadow-avatar-platform" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="shadow-avatar-aura" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <filter id="shadow-avatar-glow" height="180%" width="180%" x="-40%" y="-40%">
          <feGaussianBlur result="blur" stdDeviation="3" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="shadow-avatar-soft-glow" height="260%" width="260%" x="-80%" y="-80%">
          <feGaussianBlur result="blur" stdDeviation="7" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="shadow-avatar-metal-glow" height="140%" width="140%" x="-20%" y="-20%">
          <feGaussianBlur result="blur" stdDeviation="1.8" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="130" cy="270" fill="url(#shadow-avatar-aura)" rx="72" ry="170" />
      <ellipse cx="130" cy="435" fill="url(#shadow-avatar-platform)" rx="82" ry="16" />
      <ellipse cx="130" cy="436" fill="none" rx="65" ry="11" stroke="#8b5cf6" strokeDasharray="9,5" strokeOpacity="0.55" />
      <ellipse cx="130" cy="437" fill="none" rx="45" ry="7" stroke="#f5c542" strokeDasharray="5,4" strokeOpacity="0.35" strokeWidth="0.6" />

      <g className="shadow-avatar-wing shadow-avatar-wing-left">
        <path d="M120 140 Q52 85 8 180 Q52 158 104 170 Q114 155 120 148 Z" fill="#ddd6fe" fillOpacity="0.62" filter="url(#shadow-avatar-metal-glow)" stroke="#c4b5fd" strokeWidth="0.8" />
        <path d="M118 143 Q65 98 22 170" fill="none" opacity="0.5" stroke="#f5c542" strokeWidth="0.9" />
        <path d="M115 153 Q63 112 24 183" fill="none" opacity="0.3" stroke="#f5c542" strokeWidth="0.5" />
        <path d="M112 163 Q65 128 32 195" fill="none" opacity="0.35" stroke="#c4b5fd" strokeWidth="0.6" />
      </g>
      <g className="shadow-avatar-wing shadow-avatar-wing-right">
        <path d="M140 140 Q208 85 252 180 Q208 158 156 170 Q146 155 140 148 Z" fill="#ddd6fe" fillOpacity="0.62" filter="url(#shadow-avatar-metal-glow)" stroke="#c4b5fd" strokeWidth="0.8" />
        <path d="M142 143 Q195 98 238 170" fill="none" opacity="0.5" stroke="#f5c542" strokeWidth="0.9" />
        <path d="M145 153 Q197 112 236 183" fill="none" opacity="0.3" stroke="#f5c542" strokeWidth="0.5" />
        <path d="M148 163 Q195 128 228 195" fill="none" opacity="0.35" stroke="#c4b5fd" strokeWidth="0.6" />
      </g>

      <path d="M205 240 L211 78 L208 80 L201 240 Z" fill="url(#shadow-avatar-blade)" filter="url(#shadow-avatar-glow)" />
      <path d="M205 240 L211 78 L208 80 L201 240 Z" fill="#a855f7" fillOpacity="0.22" filter="url(#shadow-avatar-soft-glow)" />
      <line stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.6" x1="207" x2="210.5" y1="238" y2="79" />
      <rect fill="url(#shadow-avatar-gold)" height="5" rx="2.5" width="30" x="193" y="236" />
      <rect fill="#3b0764" height="22" rx="2" width="9" x="202" y="241" />
      <rect fill="url(#shadow-avatar-gold)" height="3" rx="1" width="7" x="203" y="251" />
      <rect fill="url(#shadow-avatar-gold)" height="3" rx="1" width="5" x="204" y="257" />
      <ellipse cx="207" cy="265" fill="url(#shadow-avatar-gold)" rx="7" ry="5" />

      <ellipse cx="88" cy="162" fill="url(#shadow-avatar-armor)" rx="27" ry="18" stroke="url(#shadow-avatar-gold)" strokeWidth="1.6" transform="rotate(-9 88 162)" />
      <path d="M66 154 Q88 140 110 154" fill="none" stroke="url(#shadow-avatar-gold)" strokeWidth="1.5" />
      <ellipse cx="88" cy="160" fill="url(#shadow-avatar-armor-light)" rx="19" ry="11" transform="rotate(-9 88 160)" />
      <ellipse cx="172" cy="162" fill="url(#shadow-avatar-armor)" rx="27" ry="18" stroke="url(#shadow-avatar-gold)" strokeWidth="1.6" transform="rotate(9 172 162)" />
      <path d="M150 154 Q172 140 194 154" fill="none" stroke="url(#shadow-avatar-gold)" strokeWidth="1.5" />
      <ellipse cx="172" cy="160" fill="url(#shadow-avatar-armor-light)" rx="19" ry="11" transform="rotate(9 172 160)" />

      <path d="M100 152 L160 152 L174 270 L158 282 L130 287 L102 282 L86 270 Z" fill="url(#shadow-avatar-armor)" />
      <path d="M100 152 L160 152 L174 270 L158 282 L130 287 L102 282 L86 270 Z" fill="none" stroke="url(#shadow-avatar-gold)" strokeOpacity="0.7" strokeWidth="1.1" />
      <path d="M110 158 L150 158 L160 200 L100 200 Z" fill="url(#shadow-avatar-armor-light)" fillOpacity="0.5" />
      <line stroke="#f5c542" strokeDasharray="4,3" strokeOpacity="0.45" strokeWidth="0.7" x1="112" x2="148" y1="218" y2="218" />
      <line stroke="#f5c542" strokeDasharray="4,3" strokeOpacity="0.4" strokeWidth="0.7" x1="109" x2="151" y1="228" y2="228" />
      <line stroke="#f5c542" strokeDasharray="4,3" strokeOpacity="0.35" strokeWidth="0.6" x1="107" x2="153" y1="238" y2="238" />
      <line stroke="#f5c542" strokeDasharray="4,3" strokeOpacity="0.28" strokeWidth="0.5" x1="105" x2="155" y1="248" y2="248" />
      <polygon className="shadow-avatar-gem" fill="url(#shadow-avatar-gem)" filter="url(#shadow-avatar-glow)" points="130,175 141,191 130,207 119,191" />
      <polygon fill="none" points="130,175 141,191 130,207 119,191" stroke="#e879f9" strokeWidth="1.5" />

      <rect fill="#0a0a1f" height="14" rx="3" stroke="url(#shadow-avatar-gold)" width="64" x="98" y="273" />
      <rect fill="#6d28d9" fillOpacity="0.85" height="12" rx="2.5" width="16" x="122" y="274" />
      <ellipse cx="130" cy="280" fill="url(#shadow-avatar-gold)" rx="4.5" ry="4.5" />

      <path d="M86 158 L57 248 L76 254 L102 166 Z" fill="url(#shadow-avatar-armor)" />
      <path d="M86 158 L57 248 L76 254 L102 166 Z" fill="none" stroke="url(#shadow-avatar-gold)" strokeOpacity="0.45" strokeWidth="0.7" />
      <rect fill="url(#shadow-avatar-armor)" height="26" rx="5" stroke="url(#shadow-avatar-gold)" strokeWidth="1.2" width="27" x="51" y="246" />
      <line stroke="url(#shadow-avatar-gold)" strokeOpacity="0.55" strokeWidth="0.8" x1="53" x2="76" y1="256" y2="256" />
      <rect fill="url(#shadow-avatar-armor)" height="11" rx="2" stroke="url(#shadow-avatar-gold)" strokeWidth="0.7" width="6" x="52" y="269" />
      <rect fill="url(#shadow-avatar-armor)" height="13" rx="2" stroke="url(#shadow-avatar-gold)" strokeWidth="0.7" width="6" x="60" y="269" />
      <rect fill="url(#shadow-avatar-armor)" height="12" rx="2" stroke="url(#shadow-avatar-gold)" strokeWidth="0.7" width="6" x="68" y="269" />
      <path d="M174 158 L200 248 L181 254 L158 166 Z" fill="url(#shadow-avatar-armor)" />
      <path d="M174 158 L200 248 L181 254 L158 166 Z" fill="none" stroke="url(#shadow-avatar-gold)" strokeOpacity="0.45" strokeWidth="0.7" />
      <rect fill="url(#shadow-avatar-armor)" height="26" rx="5" stroke="url(#shadow-avatar-gold)" strokeWidth="1.2" width="27" x="182" y="246" />
      <line stroke="url(#shadow-avatar-gold)" strokeOpacity="0.55" strokeWidth="0.8" x1="184" x2="207" y1="256" y2="256" />

      <path d="M107 280 L98 392 L122 392 L132 286 Z" fill="url(#shadow-avatar-armor)" />
      <path d="M107 280 L98 392 L122 392 L132 286 Z" fill="none" stroke="#8b5cf6" strokeOpacity="0.5" strokeWidth="0.6" />
      <ellipse cx="110" cy="332" fill="url(#shadow-avatar-armor)" rx="13" ry="9" stroke="url(#shadow-avatar-gold)" />
      <path d="M153 286 L158 392 L182 392 L173 280 Z" fill="url(#shadow-avatar-armor)" />
      <path d="M153 286 L158 392 L182 392 L173 280 Z" fill="none" stroke="#8b5cf6" strokeOpacity="0.5" strokeWidth="0.6" />
      <ellipse cx="170" cy="332" fill="url(#shadow-avatar-armor)" rx="13" ry="9" stroke="url(#shadow-avatar-gold)" />

      <path d="M96 388 L89 433 L126 433 L123 388 Z" fill="#090920" stroke="url(#shadow-avatar-gold)" strokeWidth="1.3" />
      <path d="M89 415 Q107 407 126 415" fill="none" stroke="url(#shadow-avatar-gold)" strokeOpacity="0.65" strokeWidth="0.9" />
      <path d="M90 430 Q107 424 125 430" fill="none" stroke="#8b5cf6" strokeOpacity="0.6" strokeWidth="0.7" />
      <path d="M157 388 L154 433 L191 433 L184 388 Z" fill="#090920" stroke="url(#shadow-avatar-gold)" strokeWidth="1.3" />
      <path d="M154 415 Q172 407 191 415" fill="none" stroke="url(#shadow-avatar-gold)" strokeOpacity="0.65" strokeWidth="0.9" />
      <path d="M155 430 Q172 424 189 430" fill="none" stroke="#8b5cf6" strokeOpacity="0.6" strokeWidth="0.7" />

      <rect fill="url(#shadow-avatar-armor)" height="18" rx="4" stroke="url(#shadow-avatar-gold)" width="28" x="116" y="132" />
      <path d="M118 140 L142 140" stroke="url(#shadow-avatar-gold)" strokeOpacity="0.5" strokeWidth="0.7" />
      <ellipse cx="130" cy="104" fill="url(#shadow-avatar-armor)" rx="31" ry="34" />
      <path d="M108 87 L101 59 L116 81 Z" fill="url(#shadow-avatar-gold)" />
      <path d="M120 80 L115 52 L131 76 Z" fill="url(#shadow-avatar-gold)" />
      <path d="M140 80 L145 52 L129 76 Z" fill="url(#shadow-avatar-gold)" />
      <path d="M152 87 L159 59 L144 81 Z" fill="url(#shadow-avatar-gold)" />
      <path d="M100 92 Q130 84 160 92" fill="none" stroke="url(#shadow-avatar-gold)" strokeLinecap="round" strokeWidth="2.5" />
      <path d="M101 100 Q130 108 159 100 L156 120 Q130 129 104 120 Z" fill="#060616" fillOpacity="0.9" />
      <ellipse className="shadow-avatar-eye" cx="117" cy="108" fill="#8b5cf6" filter="url(#shadow-avatar-glow)" rx="8" ry="5" />
      <ellipse className="shadow-avatar-eye shadow-avatar-eye-delay" cx="143" cy="108" fill="#8b5cf6" filter="url(#shadow-avatar-glow)" rx="8" ry="5" />
      <ellipse cx="117" cy="108" fill="url(#shadow-avatar-eye)" rx="4.5" ry="3" />
      <ellipse cx="143" cy="108" fill="url(#shadow-avatar-eye)" rx="4.5" ry="3" />
      <polygon fill="#f5c542" filter="url(#shadow-avatar-metal-glow)" points="130,87 136,96 130,105 124,96" />
      <path d="M107 120 Q130 129 153 120 L151 133 Q130 141 109 133 Z" fill="url(#shadow-avatar-armor)" stroke="url(#shadow-avatar-gold)" />
    </svg>
  );
}

export default function BasicAvatar({
  displayName = 'Ascendant',
  gold = 0,
  items = 0,
  level = 1,
  rank = 'Shadow Initiate V',
  rankId = 'shadow-initiate',
  title = 'Shadow Ascendant',
  xp = 0,
}) {
  const displayedLevel = Number(level || 1);
  const displayedGold = Number(gold || 0);
  const displayedItems = Number(items || 0);
  const displayedXP = Number(xp || 0);

  return (
    <article className="relative isolate min-w-0 overflow-hidden rounded-2xl border border-shadow-purple/30 bg-shadow-primary shadow-purpleGlow">
      <style>{`
        @keyframes shadowAvatarWingFlap {
          0%, 100% { transform: scaleX(1) translateY(0); }
          50% { transform: scaleX(1.045) translateY(-4px); }
        }
        @keyframes shadowAvatarFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }
        @keyframes shadowAvatarGemPulse {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 4px #e879f9); }
          50% { filter: brightness(1.6) drop-shadow(0 0 10px #e879f9); }
        }
        @keyframes shadowAvatarEyePulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; filter: brightness(1.5); }
        }
        .shadow-avatar-figure { animation: shadowAvatarFloat 4.2s ease-in-out infinite; }
        .shadow-avatar-wing { animation: shadowAvatarWingFlap 3.2s ease-in-out infinite; transform-origin: 130px 145px; }
        .shadow-avatar-wing-right { animation-delay: 0.15s; }
        .shadow-avatar-gem { animation: shadowAvatarGemPulse 2.5s ease-in-out infinite; }
        .shadow-avatar-eye { animation: shadowAvatarEyePulse 2s ease-in-out infinite; }
        .shadow-avatar-eye-delay { animation-delay: 0.2s; }
        @media (prefers-reduced-motion: reduce) {
          .shadow-avatar-figure, .shadow-avatar-wing, .shadow-avatar-gem, .shadow-avatar-eye { animation: none; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(139,92,246,0.18),transparent_60%)]" />
      <div className="relative flex min-w-0 items-center justify-between gap-3 border-b border-shadow-purple/20 bg-shadow-secondary/80 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-shadow-purpleLight" aria-hidden="true" />
            <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-shadow-purpleLight">Basic RPG Avatar</p>
          </div>
          <h3 className="mt-1 truncate font-heading text-xl font-bold text-shadow-gold">{displayName}</h3>
          <p className="truncate text-xs text-shadow-textSecondary">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-right">
          <RankEmblem className="shrink-0" rankId={rankId} size={38} />
          <p className="max-w-24 text-[10px] font-bold uppercase tracking-[0.12em] text-shadow-textMuted">{rank}</p>
        </div>
      </div>

      <div className="relative mx-auto aspect-[13/16] w-full max-w-sm px-8 py-3 sm:px-12">
        <div className="shadow-avatar-figure h-full w-full">
          <CharacterFigure displayName={displayName} />
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2 border-t border-shadow-purple/20 bg-shadow-secondary/70 p-3">
        <AvatarStat label="Level" value={displayedLevel} />
        <AvatarStat label="Gold" value={displayedGold.toLocaleString()} />
        <AvatarStat label="XP" value={displayedXP.toLocaleString()} />
        <AvatarStat label="Items" value={displayedItems.toLocaleString()} />
      </div>
    </article>
  );
}

function AvatarStat({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-shadow-purple/20 bg-black/20 px-2 py-2 text-center">
      <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-shadow-textMuted">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-shadow-text">{value}</p>
    </div>
  );
}
