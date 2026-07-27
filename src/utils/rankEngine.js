import { MAX_RANK, RANKS } from '../config/rankSystem.js';

const TOTAL_RP_KEY = 'shadowAscentTotalRP';
const RP_HISTORY_KEY = 'shadowAscentRPHistory';

function safeNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    globalThis?.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function emitEvent(eventName, detail) {
  try {
    globalThis?.dispatchEvent?.(new CustomEvent(eventName, { detail }));
  } catch {
    return false;
  }

  return true;
}

function getRankForRP(totalRP) {
  const safeRP = Math.max(0, Math.floor(safeNumber(totalRP)));
  return (
    RANKS.find((rank) => {
      const belowMax = rank?.maxRP === null || safeRP <= rank?.maxRP;
      return safeRP >= rank?.minRP && belowMax;
    }) || MAX_RANK
  );
}

function getDivisionForRP(rank, totalRP) {
  const safeRP = Math.max(0, Math.floor(safeNumber(totalRP)));
  return (
    rank?.divisions?.find((division) => {
      const belowMax = division?.maxRP === null || safeRP <= division?.maxRP;
      return safeRP >= division?.minRP && belowMax;
    }) ||
    rank?.divisions?.[rank?.divisions?.length - 1] ||
    null
  );
}

export function calculateRank(totalRP) {
  const safeRP = Math.max(0, Math.floor(safeNumber(totalRP)));
  const rank = getRankForRP(safeRP);
  const division = getDivisionForRP(rank, safeRP);
  const rankSpan = rank?.maxRP === null ? 1 : Math.max(1, rank?.maxRP - rank?.minRP + 1);
  const rankProgress = rank?.maxRP === null ? 100 : Math.min(100, Math.max(0, ((safeRP - rank?.minRP) / rankSpan) * 100));

  return {
    totalRP: safeRP,
    rankId: rank?.id,
    rankName: rank?.name,
    rankShortName: rank?.shortName,
    tier: rank?.tier,
    color: rank?.color,
    glow: rank?.glow,
    division: division?.label || 'Apex',
    divisionId: division?.id || `${rank?.id}-apex`,
    divisionMinRP: division?.minRP ?? rank?.minRP,
    divisionMaxRP: division?.maxRP,
    rankMinRP: rank?.minRP,
    rankMaxRP: rank?.maxRP,
    rankProgress,
    isMaxRank: rank?.id === MAX_RANK?.id,
  };
}

export function getTotalRP() {
  try {
    const storedRP = globalThis?.localStorage?.getItem(TOTAL_RP_KEY);
    return Math.max(0, Math.floor(safeNumber(storedRP)));
  } catch {
    return 0;
  }
}

export function getRPHistory() {
  const history = readJSON(RP_HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

export function getNextRankInfo(rankData) {
  const currentRankData = rankData || calculateRank(getTotalRP());
  const rankIndex = RANKS.findIndex((rank) => rank?.id === currentRankData?.rankId);
  const nextRank = RANKS?.[rankIndex + 1] || null;

  if (!nextRank) {
    return {
      isMaxRank: true,
      nextRank: null,
      rpNeeded: 0,
      progressToNextRank: 100,
    };
  }

  const totalRP = Math.max(0, Math.floor(safeNumber(currentRankData?.totalRP)));
  const currentRank = RANKS?.[rankIndex] || RANKS[0];
  const spanToNext = Math.max(1, nextRank?.minRP - currentRank?.minRP);
  const earnedInRank = Math.max(0, totalRP - currentRank?.minRP);

  return {
    isMaxRank: false,
    nextRank,
    rpNeeded: Math.max(0, nextRank?.minRP - totalRP),
    progressToNextRank: Math.min(100, Math.max(0, (earnedInRank / spanToNext) * 100)),
  };
}

export function addRP(amount, source = 'unknown') {
  const safeAmount = Math.max(0, Math.floor(safeNumber(amount)));
  const previousTotal = getTotalRP();
  const previousRank = calculateRank(previousTotal);
  const nextTotal = previousTotal + safeAmount;
  const nextRank = calculateRank(nextTotal);
  const historyEntry = {
    id: `${Date.now()}-${source}`,
    amount: safeAmount,
    source,
    previousTotal,
    totalRP: nextTotal,
    rankId: nextRank?.rankId,
    division: nextRank?.division,
    createdAt: new Date().toISOString(),
  };
  const nextHistory = [historyEntry, ...getRPHistory()].slice(0, 250);

  try {
    globalThis?.localStorage?.setItem(TOTAL_RP_KEY, String(nextTotal));
  } catch {
    return {
      success: false,
      message: 'Your rank progress could not be saved locally.',
      totalRP: previousTotal,
      rankData: previousRank,
      historyEntry: null,
    };
  }

  writeJSON(RP_HISTORY_KEY, nextHistory);
  emitEvent('rpUpdated', { amount: safeAmount, source, totalRP: nextTotal, rankData: nextRank });

  if (nextRank?.rankId !== previousRank?.rankId) {
    emitEvent('rankUp', { previousRank, nextRank, totalRP: nextTotal, source });
  }

  return {
    success: true,
    amount: safeAmount,
    totalRP: nextTotal,
    rankData: nextRank,
    previousRank,
    historyEntry,
  };
}
