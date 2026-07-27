import { getRankById } from '../../config/rankSystem.js';

const emblemShapes = {
  'shadow-initiate': {
    symbol: 'M50 27 L67 40 L61 66 L50 75 L39 66 L33 40 Z',
    accents: ['M50 35 L58 43 L50 51 L42 43 Z'],
  },
  iron: {
    symbol: 'M50 22 L72 37 L65 72 L50 82 L35 72 L28 37 Z',
    accents: ['M38 42 H62', 'M41 61 H59'],
  },
  bronze: {
    symbol: 'M50 20 L75 35 L69 68 L50 84 L31 68 L25 35 Z',
    accents: ['M35 43 L50 34 L65 43', 'M38 61 L50 70 L62 61'],
  },
  silver: {
    symbol: 'M50 16 L78 32 L72 70 L50 88 L28 70 L22 32 Z',
    accents: ['M50 28 V74', 'M36 48 H64'],
  },
  gold: {
    symbol: 'M50 13 L81 31 L75 71 L50 91 L25 71 L19 31 Z',
    accents: ['M50 26 L63 50 L50 76 L37 50 Z'],
  },
  platinum: {
    symbol: 'M50 11 L84 30 L77 72 L50 93 L23 72 L16 30 Z',
    accents: ['M31 38 L50 25 L69 38', 'M31 62 L50 77 L69 62'],
  },
  diamond: {
    symbol: 'M50 9 L86 29 L79 73 L50 95 L21 73 L14 29 Z',
    accents: ['M50 22 L72 49 L50 82 L28 49 Z', 'M28 49 H72'],
  },
  ascendant: {
    symbol: 'M50 7 L88 28 L81 74 L50 97 L19 74 L12 28 Z',
    accents: ['M50 20 C61 34 66 49 50 80', 'M50 20 C39 34 34 49 50 80'],
  },
  mythic: {
    symbol: 'M50 6 L90 27 L83 75 L50 98 L17 75 L10 27 Z',
    accents: ['M34 40 L50 18 L66 40 L60 73 H40 Z'],
  },
  challenger: {
    symbol: 'M50 4 L92 26 L84 77 L50 99 L16 77 L8 26 Z',
    accents: ['M50 17 L66 38 L75 34 L65 55 L73 73 L50 63 L27 73 L35 55 L25 34 L34 38 Z'],
  },
};

export default function RankEmblem({ rankId = 'shadow-initiate', size = 96, loading = false, error = null, empty = false, className = '' }) {
  if (loading) {
    return <div className={`animate-pulse rounded-full border border-white/10 bg-white/[0.03] ${className}`} style={{ height: size, width: size }} />;
  }

  if (error) {
    return <div className={`flex items-center justify-center rounded-full border border-shadow-red/30 text-xs text-shadow-red ${className}`} style={{ height: size, width: size }}>!</div>;
  }

  if (empty) {
    return <div className={`rounded-full border border-white/10 bg-white/[0.03] ${className}`} style={{ height: size, width: size }} />;
  }

  const rank = getRankById(rankId);
  const shape = emblemShapes?.[rank?.id] || emblemShapes?.['shadow-initiate'];
  const isChallenger = rank?.id === 'challenger';
  const gradientId = `rank-gradient-${rank?.id}`;
  const glowId = `rank-glow-${rank?.id}`;

  return (
    <svg
      aria-label={`${rank?.name} rank emblem`}
      className={`${isChallenger ? 'rank-emblem-challenger' : ''} ${className}`}
      height={size}
      role="img"
      viewBox="0 0 100 110"
      width={size}
    >
      <defs>
        <radialGradient cx="50%" cy="35%" id={gradientId} r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="38%" stopColor={rank?.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0.98" />
        </radialGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation={isChallenger ? '5' : '3'} floodColor={rank?.color} floodOpacity={isChallenger ? '0.85' : '0.55'} />
        </filter>
      </defs>

      <path d="M50 104 C30 96 14 82 9 58 C5 38 14 20 50 6 C86 20 95 38 91 58 C86 82 70 96 50 104 Z" fill="#0a0a0f" stroke="rgba(240,192,64,0.3)" strokeWidth="2" />
      <path d={shape?.symbol} fill={`url(#${gradientId})`} filter={`url(#${glowId})`} stroke={rank?.color} strokeLinejoin="round" strokeWidth="2.4" />
      {shape?.accents?.map((accent) => (
        <path d={accent} fill="none" key={accent} stroke="#f0c040" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      ))}
      <circle cx="50" cy="101" fill={rank?.color} r="3.2" />
    </svg>
  );
}
