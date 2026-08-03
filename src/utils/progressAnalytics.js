import { getPlayerLevel } from './planAccess.js';

export const ANALYTICS_PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'all', label: 'All' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localDateKey(value) {
  if (!value) {
    return '';
  }

  const plainDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = plainDate ? new Date(Number(plainDate?.[1]), Number(plainDate?.[2]) - 1, Number(plainDate?.[3])) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey) {
  const parts = String(dateKey || '').split('-').map(Number);
  return parts?.length === 3 ? new Date(parts?.[0], parts?.[1] - 1, parts?.[2]) : new Date(Number.NaN);
}

function addDays(dateKey, amount) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function startOfWeek(dateKey) {
  const date = dateFromKey(dateKey);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return localDateKey(date);
}

function startOfMonth(dateKey) {
  const date = dateFromKey(dateKey);
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

function formatLabel(dateKey, period) {
  const date = dateFromKey(dateKey);

  if (period === 'monthly') {
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }

  if (period === 'weekly') {
    return `Wk ${date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}`;
  }

  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function rangeStart(period, earliestDate, today) {
  if (period === 'all') {
    return earliestDate || today;
  }

  if (period === 'monthly') {
    const date = dateFromKey(today);
    return localDateKey(new Date(date.getFullYear(), date.getMonth() - 11, 1));
  }

  if (period === 'weekly') {
    return addDays(startOfWeek(today), -77);
  }

  return addDays(today, -13);
}

function normalizeLedgerEvents(data, metric) {
  const tracked = (Array.isArray(data?.progressEvents) ? data?.progressEvents : [])
    .filter((entry) => entry?.metric === metric && safeNumber(entry?.amount) > 0)
    .map((entry) => ({
      date: localDateKey(entry?.created_at),
      amount: Math.abs(safeNumber(entry?.amount)),
      type: entry?.event_type === 'spent' ? 'spent' : 'earned',
      totalAfter: safeNumber(entry?.total_after),
    }))
    .filter((entry) => entry?.date);

  return tracked;
}

function legacyXPEvents(data) {
  const mindQuestDates = new Set(
    (data?.questHistory || [])
      .filter((entry) => entry?.questId === 'mind')
      .map((entry) => localDateKey(entry?.completedAt))
      .filter(Boolean),
  );
  const entries = [
    ...(data?.questHistory || []).map((entry) => ({ date: localDateKey(entry?.completedAt), amount: safeNumber(entry?.reward?.xp) })),
    ...(data?.workouts || []).map((entry) => ({ date: localDateKey(entry?.completedAt || entry?.dateKey), amount: safeNumber(entry?.reward?.xp) })),
    ...(data?.tasks || [])
      .filter((entry) => entry?.completed && entry?.completedAt)
      .map((entry) => ({ date: localDateKey(entry?.completedAt), amount: 5 })),
    ...(data?.unlockedAchievements || []).map((entry) => ({ date: localDateKey(entry?.unlockedAt), amount: safeNumber(entry?.xpReward || 100) })),
    ...(data?.brainHistory || [])
      .filter((entry) => !mindQuestDates.has(localDateKey(entry?.completedAt)))
      .map((entry) => ({ date: localDateKey(entry?.completedAt), amount: safeNumber(entry?.pointsAwarded) })),
  ];

  if (data?.dashboardFocus?.dateKey) {
    entries.push({ date: localDateKey(data?.dashboardFocus?.dateKey), amount: safeNumber(data?.dashboardFocus?.reward?.xp) });
  }

  return entries.filter((entry) => entry?.date && entry?.amount > 0).map((entry) => ({ ...entry, type: 'earned' }));
}

function legacyGoldEvents(data) {
  const entries = [
    ...(data?.questHistory || []).map((entry) => ({ date: localDateKey(entry?.completedAt), amount: safeNumber(entry?.reward?.gold), type: 'earned' })),
    ...(data?.workouts || []).map((entry) => ({ date: localDateKey(entry?.completedAt || entry?.dateKey), amount: safeNumber(entry?.reward?.gold), type: 'earned' })),
    ...(data?.tasks || [])
      .filter((entry) => entry?.completed && entry?.completedAt)
      .map((entry) => ({ date: localDateKey(entry?.completedAt), amount: 2, type: 'earned' })),
    ...(data?.inventory || [])
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        date: localDateKey(entry?.purchasedAt || entry?.createdAt || entry?.updatedAt || entry?.dateKey),
        amount: safeNumber(entry?.price || data?.shopItemPrices?.[entry?.id]),
        type: 'spent',
      })),
  ];

  if (data?.dashboardFocus?.dateKey) {
    entries.push({ date: localDateKey(data?.dashboardFocus?.dateKey), amount: safeNumber(data?.dashboardFocus?.reward?.gold), type: 'earned' });
  }

  return entries.filter((entry) => entry?.date && entry?.amount > 0);
}

function combineHistory(legacyEntries, trackedEntries) {
  if (!trackedEntries?.length) {
    return legacyEntries;
  }

  const firstTrackedDate = trackedEntries.map((entry) => entry?.date).sort()?.[0];
  return [...legacyEntries.filter((entry) => entry?.date < firstTrackedDate), ...trackedEntries];
}

function completeDailySeries({ entries, currentTotal, period, valueKeys, baselineValues, profileCreatedAt }) {
  const today = localDateKey(new Date());
  const earliestEvent = entries.map((entry) => entry?.date).filter(Boolean).sort()?.[0];
  const earliestDate = [earliestEvent, localDateKey(profileCreatedAt)].filter(Boolean).sort()?.[0] || today;
  const start = rangeStart(period, earliestDate, today);
  const grouped = entries.reduce((acc, entry) => {
    const current = acc?.[entry?.date] || {};
    const key = entry?.type === 'spent' ? 'spent' : 'earned';
    return {
      ...acc,
      [entry?.date]: { ...current, [key]: safeNumber(current?.[key]) + safeNumber(entry?.amount) },
    };
  }, {});
  const running = { ...baselineValues };

  Object.keys(grouped)
    .filter((date) => date < start)
    .sort()
    .forEach((date) => {
      valueKeys.forEach((key) => {
        running[key] = safeNumber(running?.[key]) + safeNumber(grouped?.[date]?.[key]);
      });
    });

  const daily = [];
  for (let date = start; date <= today; date = addDays(date, 1)) {
    const gains = grouped?.[date] || {};
    valueKeys.forEach((key) => {
      running[key] = safeNumber(running?.[key]) + safeNumber(gains?.[key]);
    });
    daily.push({ date, ...running, ...valueKeys.reduce((acc, key) => ({ ...acc, [`${key}Change`]: safeNumber(gains?.[key]) }), {}) });
  }

  if (period === 'daily' || period === 'all') {
    return daily.map((entry) => ({ ...entry, label: formatLabel(entry?.date, period) }));
  }

  const bucketGetter = period === 'weekly' ? startOfWeek : startOfMonth;
  const buckets = daily.reduce((acc, entry) => {
    const bucket = bucketGetter(entry?.date);
    const previous = acc?.[bucket] || {};
    return {
      ...acc,
      [bucket]: {
        ...entry,
        date: bucket,
        ...valueKeys.reduce((values, key) => ({ ...values, [`${key}Change`]: safeNumber(previous?.[`${key}Change`]) + safeNumber(entry?.[`${key}Change`]) }), {}),
      },
    };
  }, {});

  return Object.values(buckets)
    .sort((a, b) => String(a?.date).localeCompare(String(b?.date)))
    .map((entry) => ({ ...entry, label: formatLabel(entry?.date, period) }));
}

export function buildXPSeries(data, period = 'daily') {
  const tracked = normalizeLedgerEvents(data, 'xp').filter((entry) => entry?.type === 'earned');
  const entries = combineHistory(legacyXPEvents(data), tracked);
  const knownGains = entries.reduce((total, entry) => total + safeNumber(entry?.amount), 0);
  const trackedTotal = tracked.reduce((highest, entry) => Math.max(highest, safeNumber(entry?.totalAfter)), 0);
  const currentXP = Math.max(safeNumber(data?.profile?.xp), trackedTotal, knownGains);
  const baselineXP = Math.max(0, currentXP - knownGains);
  const series = completeDailySeries({
    entries,
    currentTotal: currentXP,
    period,
    valueKeys: ['earned'],
    baselineValues: { earned: baselineXP },
    profileCreatedAt: data?.profile?.created_at,
  });

  return series.map((entry) => ({ ...entry, xp: entry?.earned, gained: entry?.earnedChange }));
}

export function buildGoldSeries(data, period = 'daily') {
  const tracked = normalizeLedgerEvents(data, 'gold');
  const entries = combineHistory(legacyGoldEvents(data), tracked);
  const knownEarned = entries.filter((entry) => entry?.type === 'earned').reduce((total, entry) => total + safeNumber(entry?.amount), 0);
  const knownSpent = entries.filter((entry) => entry?.type === 'spent').reduce((total, entry) => total + safeNumber(entry?.amount), 0);
  const currentGold = Math.max(0, safeNumber(data?.profile?.gold));
  const baselineEarned = Math.max(0, currentGold + knownSpent - knownEarned);

  return completeDailySeries({
    entries,
    currentTotal: currentGold,
    period,
    valueKeys: ['earned', 'spent'],
    baselineValues: { earned: baselineEarned, spent: 0 },
    profileCreatedAt: data?.profile?.created_at,
  });
}

export function getXPLevelProgress(profile, xpOverride) {
  const totalXP = Math.max(0, safeNumber(xpOverride ?? profile?.xp));
  const level = getPlayerLevel({ ...profile, xp: totalXP });
  const levelStartXP = Math.max(0, (level - 1) * 100);
  const nextLevelXP = level * 100;
  const xpIntoLevel = Math.max(0, Math.min(100, totalXP - levelStartXP));
  const xpNeeded = Math.max(0, nextLevelXP - totalXP);

  return {
    totalXP,
    level,
    levelStartXP,
    nextLevelXP,
    xpIntoLevel,
    xpNeeded,
    percentage: Math.max(0, Math.min(100, Math.round((xpIntoLevel / 100) * 100))),
  };
}
