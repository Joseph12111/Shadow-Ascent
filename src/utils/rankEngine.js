import { MAX_RANK, MYTHIC_MIN_RP, RANKS } from '../config/rankSystem.js';
import { getRankGift } from './planAccess.js';

const TOTAL_RP_KEY = 'shadowAscentTotalRP';
const RP_HISTORY_KEY = 'shadowAscentRPHistory';
const RANK_GIFTS_KEY = 'shadowAscentRankGifts';

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
  return (
    RANKS.find((rank) => {
      const belowMax = rank?.maxRP === null || totalRP <= rank?.maxRP;
      return totalRP >= rank?.minRP && belowMax;
    }) || MAX_RANK
  );
}

function getDivisionForRP(rank, totalRP) {
  const matchedDivision = rank?.divisions?.find((division) => {
    const belowMax = division?.maxRP === null || totalRP <= division?.maxRP;
    return totalRP >= division?.minRP && belowMax;
  });

  return matchedDivision || rank?.divisions?.[rank?.divisions?.length - 1] || null;
}

function getNextStep(rank, division) {
  const divisionIndex = rank?.divisions?.findIndex((entry) => entry?.id === division?.id) ?? -1;
  const nextDivision = divisionIndex >= 0 ? rank?.divisions?.[divisionIndex + 1] || null : null;
  const rankIndex = RANKS.findIndex((entry) => entry?.id === rank?.id);
  const nextRank = RANKS?.[rankIndex + 1] || null;

  if (nextDivision) {
    return { nextDivision, nextRank, nextStepLabel: `${rank?.name} ${nextDivision?.label}`, nextStepMinRP: nextDivision?.minRP };
  }

  return { nextDivision: null, nextRank, nextStepLabel: nextRank?.name || 'Apex', nextStepMinRP: nextRank?.minRP ?? null };
}

export function calculateRank(totalRP) {
  const safeRP = Math.max(0, Math.floor(safeNumber(totalRP)));
  const rank = getRankForRP(safeRP);
  const division = getDivisionForRP(rank, safeRP);
  const isMaxRank = rank?.id === MAX_RANK?.id;
  const isAscendantGate = rank?.id === 'ascendant' && safeRP > Number(rank?.divisionMaxRP ?? rank?.maxRP);
  const divisionRequired = division?.rpRequired;
  const earnedInDivision = isMaxRank
    ? Math.max(0, safeRP - rank?.minRP)
    : isAscendantGate
      ? Number(divisionRequired || 100)
      : Math.max(0, safeRP - Number(division?.minRP || 0));
  const divisionRP = divisionRequired === null ? earnedInDivision : Math.min(Number(divisionRequired || 1), earnedInDivision);
  const divisionProgress = isMaxRank ? 100 : Math.min(100, Math.max(0, (divisionRP / Math.max(1, Number(divisionRequired || 1))) * 100));
  const nextStep = getNextStep(rank, division);
  const isApproachingAscendantGate = rank?.id === 'ascendant' && !isAscendantGate && !nextStep?.nextDivision;
  const nextStepLabel = isApproachingAscendantGate ? 'Mythic Gate' : nextStep?.nextStepLabel;
  const nextStepMinRP = isApproachingAscendantGate ? Number(rank?.divisionMaxRP || 0) + 1 : nextStep?.nextStepMinRP;
  const rpToNextStep = isMaxRank ? 0 : Math.max(0, Number(nextStepMinRP || MYTHIC_MIN_RP) - safeRP);
  const rankSpan = rank?.maxRP === null ? 1 : Math.max(1, rank?.maxRP - rank?.minRP + 1);

  return {
    totalRP: safeRP,
    rankId: rank?.id,
    rankName: rank?.name,
    rankShortName: rank?.shortName,
    tier: rank?.tier,
    color: rank?.color,
    glow: rank?.glow,
    iconKey: rank?.iconKey,
    iconPath: rank?.iconPath,
    division: division?.label || 'Apex',
    divisionId: division?.id || `${rank?.id}-apex`,
    divisionMinRP: division?.minRP ?? rank?.minRP,
    divisionMaxRP: division?.maxRP,
    divisionRP,
    divisionRPMax: divisionRequired,
    divisionRPNeeded: isMaxRank ? 0 : rpToNextStep,
    divisionProgress,
    nextDivision: nextStep?.nextDivision,
    nextRank: nextStep?.nextRank,
    nextStepLabel,
    rankMinRP: rank?.minRP,
    rankMaxRP: rank?.maxRP,
    rankProgress: rank?.maxRP === null ? 100 : Math.min(100, Math.max(0, ((safeRP - rank?.minRP) / rankSpan) * 100)),
    statusLabel: isMaxRank ? 'Apex' : isAscendantGate ? 'Mythic Gate' : `Division ${division?.label}`,
    isAscendantGate,
    isMaxRank,
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

export function getRankGifts() {
  const gifts = readJSON(RANK_GIFTS_KEY, []);
  return Array.isArray(gifts) ? gifts : [];
}

function grantRankGift(previousRank, nextRank) {
  const gift = getRankGift(previousRank?.rankId, nextRank?.rankId);
  if (!gift?.id) {
    return null;
  }

  const gifts = getRankGifts();
  const existingGift = gifts.find((entry) => entry?.id === gift?.id);
  if (existingGift?.id) {
    return null;
  }

  const awardedGift = {
    ...gift,
    fromRank: previousRank?.rankName || '',
    toRank: nextRank?.rankName || '',
    awardedAt: new Date().toISOString(),
  };
  const saved = writeJSON(RANK_GIFTS_KEY, [awardedGift, ...gifts]);
  if (!saved) {
    return null;
  }

  emitEvent('rankGiftGranted', { gift: awardedGift });
  return awardedGift;
}

export function getNextRankInfo(rankData) {
  const currentRankData = rankData || calculateRank(getTotalRP());

  if (currentRankData?.isMaxRank) {
    return {
      isMaxRank: true,
      nextRank: null,
      nextDivision: null,
      nextStepLabel: 'Apex',
      rpNeeded: 0,
      progressToNextRank: 100,
      progressToNextStep: 100,
    };
  }

  const nextRank = currentRankData?.nextRank || null;

  return {
    isMaxRank: false,
    nextRank,
    nextDivision: currentRankData?.nextDivision || null,
    nextStepLabel: currentRankData?.nextStepLabel || nextRank?.name,
    rpNeeded: Number(currentRankData?.divisionRPNeeded || 0),
    progressToNextRank: currentRankData?.rankProgress,
    progressToNextStep: currentRankData?.divisionProgress,
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
    const rankGift = grantRankGift(previousRank, nextRank);
    emitEvent('rankUp', { previousRank, nextRank, totalRP: nextTotal, source, rankGift });
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
