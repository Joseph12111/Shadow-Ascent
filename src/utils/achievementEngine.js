const ACHIEVEMENT_STORAGE_KEY = 'shadowAscentAchievements';
const XP_STORAGE_KEY = 'shadowAscentXP';
const ACHIEVEMENT_XP_BONUS = 100;

export const ACHIEVEMENTS = [
  {
    id: 'first-ascent',
    title: 'First Ascent',
    description: 'Earn your first 100 rank points.',
    category: 'rank',
    xpReward: ACHIEVEMENT_XP_BONUS,
    isUnlocked: (stats) => Number(stats?.totalRP || 0) >= 100,
  },
  {
    id: 'daily-vow',
    title: 'Daily Vow',
    description: 'Complete 5 daily quests.',
    category: 'quests',
    xpReward: ACHIEVEMENT_XP_BONUS,
    isUnlocked: (stats) => Number(stats?.dailyQuestsCompleted || 0) >= 5,
  },
  {
    id: 'iron-discipline',
    title: 'Iron Discipline',
    description: 'Log 3 completed workouts.',
    category: 'workout',
    xpReward: ACHIEVEMENT_XP_BONUS,
    isUnlocked: (stats) => Number(stats?.workoutsCompleted || 0) >= 3,
  },
  {
    id: 'mind-flame',
    title: 'Mind Flame',
    description: 'Complete a brain quest.',
    category: 'brain',
    xpReward: ACHIEVEMENT_XP_BONUS,
    isUnlocked: (stats) => Number(stats?.brainQuestsCompleted || 0) >= 1,
  },
  {
    id: 'habit-breaker',
    title: 'Habit Breaker',
    description: 'Reach a 7 day bad-habit discipline streak.',
    category: 'habits',
    xpReward: ACHIEVEMENT_XP_BONUS,
    isUnlocked: (stats) => Number(stats?.badHabitStreak || 0) >= 7,
  },
  {
    id: 'gold-blooded',
    title: 'Gold Blooded',
    description: 'Collect 500 gold.',
    category: 'economy',
    xpReward: ACHIEVEMENT_XP_BONUS,
    isUnlocked: (stats) => Number(stats?.goldEarned || 0) >= 500,
  },
];

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

function readXP() {
  try {
    const storedXP = globalThis?.localStorage?.getItem(XP_STORAGE_KEY);
    const parsedXP = Number(storedXP);
    return Number.isFinite(parsedXP) ? Math.max(0, Math.floor(parsedXP)) : 0;
  } catch {
    return 0;
  }
}

function writeXP(nextXP) {
  try {
    globalThis?.localStorage?.setItem(XP_STORAGE_KEY, String(nextXP));
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

export function getUnlockedAchievements() {
  const unlocked = readJSON(ACHIEVEMENT_STORAGE_KEY, []);
  return Array.isArray(unlocked) ? unlocked : [];
}

export function getAchievementProgress(stats = {}) {
  const unlocked = getUnlockedAchievements();

  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.some((entry) => entry?.id === achievement?.id),
    eligible: achievement?.isUnlocked?.(stats) || false,
  }));
}

export function unlockAchievement(achievementId) {
  const achievement = ACHIEVEMENTS.find((entry) => entry?.id === achievementId);

  if (!achievement) {
    return {
      success: false,
      message: 'Achievement could not be found.',
      achievement: null,
      xpAwarded: 0,
    };
  }

  const unlocked = getUnlockedAchievements();
  const alreadyUnlocked = unlocked.some((entry) => entry?.id === achievement?.id);

  if (alreadyUnlocked) {
    return {
      success: true,
      alreadyUnlocked: true,
      achievement,
      xpAwarded: 0,
    };
  }

  const unlockedEntry = {
    id: achievement?.id,
    title: achievement?.title,
    category: achievement?.category,
    xpReward: achievement?.xpReward,
    unlockedAt: new Date().toISOString(),
  };
  const nextUnlocked = [unlockedEntry, ...unlocked];
  const previousXP = readXP();
  const nextXP = previousXP + ACHIEVEMENT_XP_BONUS;

  const achievementsSaved = writeJSON(ACHIEVEMENT_STORAGE_KEY, nextUnlocked);
  const xpSaved = writeXP(nextXP);

  if (!achievementsSaved || !xpSaved) {
    return {
      success: false,
      message: 'Achievement progress could not be saved locally.',
      achievement,
      xpAwarded: 0,
    };
  }

  emitEvent('achievementUnlocked', { achievement: unlockedEntry, xpAwarded: ACHIEVEMENT_XP_BONUS, totalXP: nextXP });
  emitEvent('xpUpdated', { amount: ACHIEVEMENT_XP_BONUS, source: 'achievement', totalXP: nextXP });

  return {
    success: true,
    alreadyUnlocked: false,
    achievement: unlockedEntry,
    xpAwarded: ACHIEVEMENT_XP_BONUS,
    totalXP: nextXP,
  };
}

export function checkAchievements(stats = {}) {
  const newlyUnlocked = [];

  ACHIEVEMENTS.forEach((achievement) => {
    if (achievement?.isUnlocked?.(stats)) {
      const result = unlockAchievement(achievement?.id);
      if (result?.success && !result?.alreadyUnlocked) {
        newlyUnlocked.push(result?.achievement);
      }
    }
  });

  return {
    newlyUnlocked,
    unlocked: getUnlockedAchievements(),
    progress: getAchievementProgress(stats),
  };
}

export { ACHIEVEMENT_XP_BONUS };
