import { isOwner } from './ownerCheck.js';

const USAGE_STORAGE_KEY = 'shadowAscentUsage';

export const FREEMIUM_LIMITS = {
  workoutGenerator: 2,
  mealPlanner: 2,
  mealScanner: 1,
};

function getTodayKey(date = new Date()) {
  return date?.toISOString?.()?.slice(0, 10) || '';
}

function readUsage() {
  try {
    const storedUsage = globalThis?.localStorage?.getItem(USAGE_STORAGE_KEY);
    const parsedUsage = storedUsage ? JSON.parse(storedUsage) : {};
    return parsedUsage && typeof parsedUsage === 'object' ? parsedUsage : {};
  } catch {
    return {};
  }
}

function writeUsage(usage) {
  try {
    globalThis?.localStorage?.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
    return true;
  } catch {
    return false;
  }
}

function getFeatureUsage(feature, dateKey = getTodayKey()) {
  const usage = readUsage();
  const dayUsage = usage?.[dateKey] || {};
  return Number(dayUsage?.[feature] || 0);
}

export function getUsageSnapshot(user) {
  const dateKey = getTodayKey();
  const owner = isOwner(user);
  const usage = readUsage();
  const dayUsage = usage?.[dateKey] || {};

  return Object.keys(FREEMIUM_LIMITS).reduce((snapshot, feature) => {
    const used = Number(dayUsage?.[feature] || 0);
    const limit = FREEMIUM_LIMITS?.[feature];

    return {
      ...snapshot,
      [feature]: {
        used,
        limit,
        remaining: owner ? Infinity : Math.max(0, limit - used),
        allowed: owner || used < limit,
        owner,
      },
    };
  }, {});
}

export function canUseFeature(feature, user) {
  const owner = isOwner(user);
  const limit = FREEMIUM_LIMITS?.[feature];

  if (owner) {
    return { allowed: true, owner: true, used: getFeatureUsage(feature), limit: Infinity, remaining: Infinity, reason: 'owner' };
  }

  if (!Number.isFinite(limit)) {
    return { allowed: false, owner: false, used: 0, limit: 0, remaining: 0, reason: 'invalid_feature' };
  }

  const used = getFeatureUsage(feature);

  return {
    allowed: used < limit,
    owner: false,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    reason: used < limit ? 'allowed' : 'limit_reached',
  };
}

export function recordFeatureUsage(feature, user) {
  const eligibility = canUseFeature(feature, user);

  if (!eligibility?.allowed) {
    return {
      success: false,
      ...eligibility,
      message: eligibility?.reason === 'limit_reached' ? 'Daily free limit reached.' : 'This feature is unavailable.',
    };
  }

  if (eligibility?.owner) {
    return {
      success: true,
      ...eligibility,
      used: eligibility?.used,
      remaining: Infinity,
      reason: 'owner',
    };
  }

  const dateKey = getTodayKey();
  const usage = readUsage();
  const dayUsage = usage?.[dateKey] || {};
  const nextUsed = Number(dayUsage?.[feature] || 0) + 1;
  const nextUsage = {
    ...usage,
    [dateKey]: {
      ...dayUsage,
      [feature]: nextUsed,
    },
  };

  const saved = writeUsage(nextUsage);

  return {
    success: saved,
    allowed: saved,
    owner: false,
    used: nextUsed,
    limit: FREEMIUM_LIMITS?.[feature],
    remaining: Math.max(0, FREEMIUM_LIMITS?.[feature] - nextUsed),
    reason: saved ? 'allowed' : 'storage_failed',
    message: saved ? null : 'Usage could not be saved locally.',
  };
}

export function resetUsage(date = new Date()) {
  const dateKey = getTodayKey(date);
  const usage = readUsage();
  const nextUsage = {
    ...usage,
    [dateKey]: {},
  };

  return writeUsage(nextUsage);
}
