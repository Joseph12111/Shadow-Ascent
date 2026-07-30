import { isOwner } from './ownerCheck.js';

export const PLAN_IDS = {
  free: 'awakened',
  basic: 'hunter',
  pro: 'shadow-elite',
  elite: 'monarch',
};

const PLAN_ALIASES = {
  free: PLAN_IDS.free,
  awakened: PLAN_IDS.free,
  basic: PLAN_IDS.basic,
  hunter: PLAN_IDS.basic,
  pro: PLAN_IDS.pro,
  premium: PLAN_IDS.pro,
  'shadow elite': PLAN_IDS.pro,
  'shadow-elite': PLAN_IDS.pro,
  elite: PLAN_IDS.elite,
  ascended: PLAN_IDS.elite,
  monarch: PLAN_IDS.elite,
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

export const LEVEL_REWARDS = [
  { level: 15, id: 'level-15-sigil', name: 'Shadow Sigil Frame', description: 'A profile frame earned only through ascent.' },
  { level: 30, id: 'level-30-title', name: 'Iron Discipline Title', description: 'A level-exclusive adventurer title.' },
  { level: 50, id: 'level-50-aura', name: 'Ascendant Aura', description: 'A visual reward reserved for level 50.' },
  { level: 75, id: 'level-75-banner', name: 'Mythic Training Banner', description: 'A milestone banner that cannot be purchased.' },
  { level: 100, id: 'level-100-crest', name: 'Eternal Monarch Crest', description: 'The final level milestone crest.' },
];

export const RANK_GIFTS = {
  'iron:bronze': { id: 'bronze-rank-chest', name: 'Bronze Rank Gift Chest' },
  'bronze:silver': { id: 'silver-rank-chest', name: 'Silver Rank Gift Chest' },
  'silver:gold': { id: 'gold-rank-chest', name: 'Gold Rank Gift Chest' },
  'gold:platinum': { id: 'platinum-rank-chest', name: 'Platinum Rank Gift Chest' },
  'platinum:diamond': { id: 'diamond-rank-chest', name: 'Diamond Rank Gift Chest' },
  'diamond:ascendant': { id: 'ascendant-rank-chest', name: 'Ascendant Rank Gift Chest' },
  'ascendant:mythic': { id: 'mythic-rank-chest', name: 'Mythic Rank Gift Chest' },
  'mythic:challenger': { id: 'challenger-rank-chest', name: 'Challenger Rank Gift Chest' },
};

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePlanId(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  return PLAN_ALIASES?.[normalized] || PLAN_IDS.free;
}

function hasCurrentPaidSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }

  const status = String(subscription?.status || '').trim().toLowerCase();
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
    return false;
  }

  const periodEnd = subscription?.current_period_end ? new Date(subscription?.current_period_end).getTime() : null;
  return !Number.isFinite(periodEnd) || periodEnd > Date.now();
}

export function getPlayerLevel(profile) {
  const explicitLevel = Math.max(1, Math.floor(safeNumber(profile?.level, 1)));
  const derivedLevel = Math.max(1, Math.floor(Math.max(0, safeNumber(profile?.xp)) / 100) + 1);
  return Math.max(explicitLevel, derivedLevel);
}

export function getRankGift(previousRankId, nextRankId) {
  const transitionKey = `${String(previousRankId || '').toLowerCase()}:${String(nextRankId || '').toLowerCase()}`;
  return RANK_GIFTS?.[transitionKey] || null;
}

export function getPlanAccess({ user, profile, subscription } = {}) {
  const owner = isOwner(user);
  const profileStatus = String(profile?.subscription_status || '').trim().toLowerCase();
  const profilePlan = normalizePlanId(profile?.subscription_tier || profile?.plan_id);
  const remotePlan = normalizePlanId(subscription?.plan_id);
  const remotePaid = hasCurrentPaidSubscription(subscription) && remotePlan !== PLAN_IDS.free;
  const profilePaid = ACTIVE_SUBSCRIPTION_STATUSES.has(profileStatus) && profilePlan !== PLAN_IDS.free;
  const planId = owner ? 'founder-admin' : remotePaid ? remotePlan : profilePaid ? profilePlan : PLAN_IDS.free;
  const tier = owner ? 99 : planId === PLAN_IDS.elite ? 3 : planId === PLAN_IDS.pro ? 2 : planId === PLAN_IDS.basic ? 1 : 0;
  const level = getPlayerLevel(profile);
  const freeScanLimit = Math.floor(level / 10);
  const mealScannerLimit = owner ? Infinity : tier === 3 ? 7 : tier === 2 ? 3 : tier === 1 ? 1 : freeScanLimit;

  return {
    owner,
    planId,
    tier,
    level,
    isPaid: owner || tier > 0,
    workoutLimitations: owner || tier > 0,
    paidCalculators: owner || tier > 0,
    avatar: {
      basic: true,
      image: owner || tier > 0,
      aiBodyShape: owner || tier >= 2,
      animated: owner || tier >= 3,
    },
    aiLimits: {
      workoutGenerator: owner ? Infinity : tier >= 2 ? 4 : 2,
      mealPlanner: owner ? Infinity : tier >= 2 ? 4 : 2,
      mealScanner: mealScannerLimit,
    },
    mealScanner: {
      limit: mealScannerLimit,
      cadence: owner ? 'unlimited' : tier > 0 ? 'daily' : 'level',
      nextUnlockLevel: tier > 0 || owner ? null : (freeScanLimit + 1) * 10,
    },
  };
}
