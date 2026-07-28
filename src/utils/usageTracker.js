import { isOwner } from './ownerCheck.js';

const USAGE_STORAGE_KEY = 'shadowAscentUsage';

export const FREEMIUM_LIMITS = {
  workoutGenerator: 2,
  mealPlanner: 2,
  mealScanner: 1,
};

function getPeriodKey(date = new Date()) {
  return date?.toISOString?.()?.slice(0, 7) || '';
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

function getFeatureEntry(feature, dateKey = getPeriodKey()) {
  const usage = readUsage();
  const periodUsage = usage?.[dateKey] || {};
  const entry = periodUsage?.[feature];

  if (entry && typeof entry === 'object') {
    return {
      used: Number(entry?.used || 0),
      limit: Number.isFinite(Number(entry?.limit)) ? Number(entry?.limit) : FREEMIUM_LIMITS?.[feature],
    };
  }

  return {
    used: Number(entry || 0),
    limit: FREEMIUM_LIMITS?.[feature],
  };
}

export function getUsageSnapshot(user) {
  const dateKey = getPeriodKey();
  const owner = isOwner(user);
  const usage = readUsage();
  const periodUsage = usage?.[dateKey] || {};

  return Object.keys(FREEMIUM_LIMITS).reduce((snapshot, feature) => {
    const storedEntry = periodUsage?.[feature];
    const used = Number(typeof storedEntry === 'object' ? storedEntry?.used || 0 : storedEntry || 0);
    const storedLimit = typeof storedEntry === 'object' ? Number(storedEntry?.limit) : NaN;
    const limit = Number.isFinite(storedLimit) ? storedLimit : FREEMIUM_LIMITS?.[feature];

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
  const entry = getFeatureEntry(feature);
  const limit = entry?.limit;

  if (owner) {
    return { allowed: true, owner: true, used: entry?.used, limit: Infinity, remaining: Infinity, reason: 'owner' };
  }

  if (!Number.isFinite(limit)) {
    return { allowed: false, owner: false, used: 0, limit: 0, remaining: 0, reason: 'invalid_feature' };
  }

  const used = entry?.used;

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

  const dateKey = getPeriodKey();
  const usage = readUsage();
  const periodUsage = usage?.[dateKey] || {};
  const nextUsed = Number(eligibility?.used || 0) + 1;
  const nextUsage = {
    ...usage,
    [dateKey]: {
      ...periodUsage,
      [feature]: {
        used: nextUsed,
        limit: eligibility?.limit,
      },
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

export function syncFeatureUsage(feature, serverUsage) {
  const used = Number(serverUsage?.used);
  const limit = Number(serverUsage?.limit);

  if (!feature || !Number.isFinite(used) || !Number.isFinite(limit)) {
    return false;
  }

  const dateKey = getPeriodKey();
  const usage = readUsage();
  const periodUsage = usage?.[dateKey] || {};
  const nextUsage = {
    ...usage,
    [dateKey]: {
      ...periodUsage,
      [feature]: {
        used,
        limit,
      },
    },
  };

  return writeUsage(nextUsage);
}

export function resetUsage(date = new Date()) {
  const dateKey = getPeriodKey(date);
  const usage = readUsage();
  const nextUsage = {
    ...usage,
    [dateKey]: {},
  };

  return writeUsage(nextUsage);
}
