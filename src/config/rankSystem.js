export const DIVISION_ORDER = ['V', 'IV', 'III', 'II', 'I'];

export const DEFAULT_RANK_ICON_PATH = '/icons/icon-192.png';
export const NORMAL_DIVISION_RP = 100;
export const MYTHIC_DIVISION_RP = 280;
export const MYTHIC_MIN_RP = 4400;
export const CHALLENGER_MIN_RP = 5800;

const NORMAL_RANKS = [
  { id: 'shadow-initiate', name: 'Shadow Initiate', shortName: 'Initiate', color: '#6b7280', glow: 'rgba(107,114,128,0.35)' },
  { id: 'iron', name: 'Iron', shortName: 'Iron', color: '#9ca3af', glow: 'rgba(156,163,175,0.35)' },
  { id: 'bronze', name: 'Bronze', shortName: 'Bronze', color: '#b7791f', glow: 'rgba(183,121,31,0.35)' },
  { id: 'silver', name: 'Silver', shortName: 'Silver', color: '#d1d5db', glow: 'rgba(209,213,219,0.35)' },
  { id: 'gold', name: 'Gold', shortName: 'Gold', color: '#f0c040', glow: 'rgba(240,192,64,0.4)' },
  { id: 'platinum', name: 'Platinum', shortName: 'Platinum', color: '#6ab0ff', glow: 'rgba(106,176,255,0.4)' },
  { id: 'diamond', name: 'Diamond', shortName: 'Diamond', color: '#00d4ff', glow: 'rgba(0,212,255,0.4)' },
  { id: 'ascendant', name: 'Ascendant', shortName: 'Ascendant', color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
];

function createDivisions(rankId, minRP, rpPerDivision) {
  return DIVISION_ORDER.map((label, index) => {
    const divisionMinRP = minRP + index * rpPerDivision;

    return {
      id: `${rankId}-${label.toLowerCase()}`,
      label,
      minRP: divisionMinRP,
      maxRP: divisionMinRP + rpPerDivision - 1,
      rpRequired: rpPerDivision,
    };
  });
}

const generatedNormalRanks = NORMAL_RANKS.map((rank, index) => {
  const minRP = index * DIVISION_ORDER.length * NORMAL_DIVISION_RP;
  const divisionMaxRP = minRP + DIVISION_ORDER.length * NORMAL_DIVISION_RP - 1;
  const isAscendant = rank?.id === 'ascendant';

  return {
    ...rank,
    tier: index + 1,
    minRP,
    maxRP: isAscendant ? MYTHIC_MIN_RP - 1 : divisionMaxRP,
    divisionMaxRP,
    iconKey: rank?.id,
    iconPath: DEFAULT_RANK_ICON_PATH,
    divisionRP: NORMAL_DIVISION_RP,
    divisions: createDivisions(rank?.id, minRP, NORMAL_DIVISION_RP),
  };
});

const mythicRank = {
  id: 'mythic',
  name: 'Mythic',
  shortName: 'Mythic',
  tier: 9,
  minRP: MYTHIC_MIN_RP,
  maxRP: CHALLENGER_MIN_RP - 1,
  divisionMaxRP: CHALLENGER_MIN_RP - 1,
  color: '#8b5cf6',
  glow: 'rgba(139,92,246,0.4)',
  iconKey: 'mythic',
  iconPath: DEFAULT_RANK_ICON_PATH,
  divisionRP: MYTHIC_DIVISION_RP,
  divisions: createDivisions('mythic', MYTHIC_MIN_RP, MYTHIC_DIVISION_RP),
};

const challengerRank = {
  id: 'challenger',
  name: 'Challenger',
  shortName: 'Challenger',
  tier: 10,
  minRP: CHALLENGER_MIN_RP,
  maxRP: null,
  divisionMaxRP: null,
  color: '#ef4444',
  glow: 'rgba(239,68,68,0.4)',
  iconKey: 'challenger',
  iconPath: DEFAULT_RANK_ICON_PATH,
  divisionRP: null,
  divisions: [{ id: 'challenger-apex', label: 'Apex', minRP: CHALLENGER_MIN_RP, maxRP: null, rpRequired: null }],
};

export const RANKS = [...generatedNormalRanks, mythicRank, challengerRank];
export const MAX_RANK = challengerRank;

function toRankId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function normalizeRankId(rankValue) {
  const candidate = typeof rankValue === 'object' ? rankValue?.rankId || rankValue?.id || rankValue?.rankName || rankValue?.name : rankValue;
  const normalized = toRankId(candidate);
  const matchedRank = RANKS.find((rank) => rank?.id === normalized || toRankId(rank?.name) === normalized || toRankId(rank?.shortName) === normalized);
  return matchedRank?.id || RANKS[0]?.id;
}

export function getRankById(rankValue) {
  const normalizedRankId = normalizeRankId(rankValue);
  return RANKS.find((rank) => rank?.id === normalizedRankId) || RANKS[0];
}
