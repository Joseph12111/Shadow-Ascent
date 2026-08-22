import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentSession,
  getCurrentUser,
  isSupabaseConfigured,
  requestPasswordReset,
  signInWithPassword,
  signOutUser,
  signUpWithPassword,
  supabase,
  updateUserPassword,
} from '../lib/supabase.js';
import { recordProgressEvent } from '../utils/progressEvents.js';

const PROFILE_STORAGE_KEY = 'userProfile';
const SUBSCRIPTION_STORAGE_KEY = 'shadowAscentSubscription';
const AUTH_LOCAL_KEYS = [
  PROFILE_STORAGE_KEY,
  SUBSCRIPTION_STORAGE_KEY,
  'shadowAscentSession',
  'shadowAscentProfile',
  'shadowAscentProfileStatus',
  'shadowAscentOnboarding',
  'shadowAscentWelcomeOpeningPending',
];
const QUEST_HISTORY_KEY = 'shadowAscentQuestHistory';
const WORKOUT_HISTORY_KEY = 'shadowAscentWorkoutHistory';
const TASKS_KEY = 'shadowAscentChecklistTasks';
const HABITS_KEY = 'shadowAscentBadHabits';
const INVENTORY_KEY = 'shadowAscentInventory';
const EQUIPPED_KEY = 'shadowAscentEquippedItems';
const BRAIN_HISTORY_KEY = 'shadowAscentBrainQuestHistory';
const ACHIEVEMENT_STORAGE_KEY = 'shadowAscentAchievements';
const RP_HISTORY_KEY = 'shadowAscentRPHistory';
const DASHBOARD_FOCUS_KEY = 'shadowAscentDashboardFocus';
const CONNECTION_EVENTS = [
  'statUpdated',
  'rpUpdated',
  'xpUpdated',
  'goldUpdated',
  'brainQuestCompleted',
  'dailyQuestUpdated',
  'workoutCompleted',
  'achievementUnlocked',
  'rankUp',
];

export const AuthContext = createContext(null);

function readStoredProfile() {
  try {
    const storedProfile = globalThis?.localStorage?.getItem(PROFILE_STORAGE_KEY);
    return storedProfile ? JSON.parse(storedProfile) : null;
  } catch {
    return null;
  }
}

function writeStoredProfile(profile) {
  try {
    if (profile) {
      globalThis?.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } else {
      globalThis?.localStorage?.removeItem(PROFILE_STORAGE_KEY);
    }
  } catch {
    return false;
  }

  return true;
}

function readStoredSubscription() {
  try {
    const storedSubscription = globalThis?.localStorage?.getItem(SUBSCRIPTION_STORAGE_KEY);
    return storedSubscription ? JSON.parse(storedSubscription) : null;
  } catch {
    return null;
  }
}

function writeStoredSubscription(subscription) {
  try {
    if (subscription) {
      globalThis?.localStorage?.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscription));
    } else {
      globalThis?.localStorage?.removeItem(SUBSCRIPTION_STORAGE_KEY);
    }
  } catch {
    return false;
  }

  return true;
}

function clearAuthStorage() {
  try {
    AUTH_LOCAL_KEYS.forEach((key) => {
      globalThis?.localStorage?.removeItem(key);
    });
  } catch {
    return false;
  }

  return true;
}

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function queueUpsert(table, payload, onConflict) {
  if (!supabase || !table || !payload) {
    return;
  }

  const isArrayPayload = Array.isArray(payload);

  if (isArrayPayload && !payload?.length) {
    return;
  }

  try {
    const options = onConflict ? { onConflict } : undefined;
    const query = supabase.from(table).upsert(payload, options);
    query.then(() => undefined).catch(() => undefined);
  } catch {
    return;
  }
}

function logProfileFailure(step, error) {
  if (!import.meta.env?.DEV) {
    return;
  }

  console.error(`[Shadow Ascent auth] ${step} failed`, {
    message: String(error?.message || 'Unknown Supabase error'),
    code: error?.code || null,
    status: error?.status || null,
  });
}

function queueProfileUpsert(profile, step = 'profile upsert') {
  if (!profile?.id || !supabase) {
    return;
  }

  try {
    supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          logProfileFailure(step, error);
        }
      })
      .catch((error) => logProfileFailure(step, error));
  } catch (error) {
    logProfileFailure(step, error);
  }
}

function syncConnectedFeatureData(authUser, profile) {
  if (!authUser?.id || !supabase) {
    return;
  }

  const userId = authUser?.id;
  const questHistory = toArray(readJSON(QUEST_HISTORY_KEY, []));
  const workoutHistory = toArray(readJSON(WORKOUT_HISTORY_KEY, []));
  const tasks = toArray(readJSON(TASKS_KEY, []));
  const habits = toArray(readJSON(HABITS_KEY, []));
  const inventory = toArray(readJSON(INVENTORY_KEY, []));
  const brainHistory = toArray(readJSON(BRAIN_HISTORY_KEY, []));
  const achievements = toArray(readJSON(ACHIEVEMENT_STORAGE_KEY, []));
  const rpHistory = toArray(readJSON(RP_HISTORY_KEY, []));
  const dashboardFocus = readJSON(DASHBOARD_FOCUS_KEY, null);
  const equippedRaw = readJSON(EQUIPPED_KEY, {});
  const equipped = equippedRaw && typeof equippedRaw === 'object' ? equippedRaw : {};
  const now = new Date().toISOString();

  queueUpsert(
    'profiles',
    {
      ...(profile || {}),
      id: userId,
      email: authUser?.email || profile?.email || '',
      updated_at: now,
    },
    'id',
  );

  queueUpsert(
    'daily_quest_history',
    questHistory.map((entry) => ({
      user_id: userId,
      date_key: entry?.dateKey || '',
      quest_id: entry?.questId || '',
      reward: entry?.reward || {},
      completed_at: entry?.completedAt || null,
      id: `${userId}-${entry?.dateKey || 'day'}-${entry?.questId || 'quest'}`,
      updated_at: now,
    })),
    'id',
  );

  queueUpsert(
    'workout_history',
    workoutHistory.map((entry) => ({
      ...entry,
      user_id: userId,
      updated_at: now,
    })),
    'id',
  );

  queueUpsert(
    'checklist_tasks',
    tasks.map((entry) => ({
      ...entry,
      user_id: userId,
      updated_at: now,
    })),
    'id',
  );

  queueUpsert(
    'bad_habits',
    habits.map((entry) => ({
      ...entry,
      user_id: userId,
      updated_at: now,
    })),
    'id',
  );

  queueUpsert(
    'player_inventory',
    {
      user_id: userId,
      inventory,
      equipped,
      updated_at: now,
    },
    'user_id',
  );

  queueUpsert(
    'brain_quest_history',
    brainHistory.map((entry) => ({
      id: `${userId}-${entry?.dateKey || entry?.completedAt || 'brain'}`,
      user_id: userId,
      date_key: entry?.dateKey || '',
      question_ids: toArray(entry?.questionIds),
      completed: Boolean(entry?.completed),
      score: Number(entry?.score || 0),
      points_awarded: Number(entry?.pointsAwarded || 0),
      answers: entry?.answers || {},
      completed_at: entry?.completedAt || null,
      updated_at: now,
    })),
    'id',
  );

  queueUpsert(
    'achievement_unlocks',
    achievements.map((entry) => ({
      id: `${userId}-${entry?.id || 'achievement'}`,
      user_id: userId,
      achievement_id: entry?.id || '',
      title: entry?.title || '',
      category: entry?.category || '',
      xp_reward: Number(entry?.xpReward || 0),
      unlocked_at: entry?.unlockedAt || now,
      updated_at: now,
    })),
    'id',
  );

  queueUpsert(
    'rp_history',
    rpHistory.map((entry) => ({
      ...entry,
      user_id: userId,
      updated_at: now,
    })),
    'id',
  );

  if (dashboardFocus?.dateKey) {
    queueUpsert(
      'dashboard_focus',
      {
        id: `${userId}-${dashboardFocus?.dateKey}`,
        user_id: userId,
        date_key: dashboardFocus?.dateKey,
        claimed_at: dashboardFocus?.claimedAt || now,
        reward: dashboardFocus?.reward || {},
        updated_at: now,
      },
      'id',
    );
  }
}

function createDefaultProfile(authUser) {
  const now = new Date().toISOString();
  const displayName = authUser?.user_metadata?.display_name || authUser?.email?.split('@')?.[0] || 'Ascendant';

  return {
    id: authUser?.id || null,
    email: authUser?.email || '',
    display_name: displayName,
    avatar_url: authUser?.user_metadata?.avatar_url || '',
    xp: 0,
    gold: 0,
    total_rp: 0,
    onboarding_goal: '',
    fitness_level: '',
    main_objective: '',
    weekly_training_days: null,
    onboarding_completed: false,
    onboarding_completed_at: null,
    created_at: now,
    updated_at: now,
  };
}

async function fetchProfile(authUser) {
  if (!authUser?.id || !supabase) {
    return { profile: authUser?.id ? createDefaultProfile(authUser) : null, error: null, needsCreate: false };
  }

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser?.id).maybeSingle();

    if (error) {
      logProfileFailure('profile select after authentication', error);
      return { profile: createDefaultProfile(authUser), error: 'Unable to load your remote profile.', needsCreate: false };
    }

    return { profile: data || createDefaultProfile(authUser), error: null, needsCreate: !data };
  } catch (error) {
    logProfileFailure('profile select after authentication', error);
    return { profile: createDefaultProfile(authUser), error: 'Unable to load your remote profile.', needsCreate: false };
  }
}

async function fetchSubscription(authUser) {
  if (!authUser?.id || !supabase) {
    return { subscription: null, failed: false };
  }

  try {
    const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', authUser?.id).maybeSingle();
    return error ? { subscription: null, failed: true } : { subscription: data || null, failed: false };
  } catch {
    return { subscription: null, failed: true };
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(() => readStoredProfile());
  const [subscription, setSubscription] = useState(() => readStoredSubscription());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const syncProfile = useCallback(async (authUser) => {
    if (!authUser?.id) {
      setProfile(null);
      writeStoredProfile(null);
      setSubscription(null);
      writeStoredSubscription(null);
      return null;
    }

    const [{ profile: nextProfile, needsCreate }, subscriptionResult] = await Promise.all([
      fetchProfile(authUser),
      fetchSubscription(authUser),
    ]);
    const nextSubscription = subscriptionResult?.failed ? readStoredSubscription() : subscriptionResult?.subscription || null;
    setProfile(nextProfile);
    writeStoredProfile(nextProfile);
    setSubscription(nextSubscription);
    writeStoredSubscription(nextSubscription);
    if (needsCreate) {
      queueProfileUpsert(nextProfile, 'profile creation after authentication');
    }
    return nextProfile;
  }, []);

  const updateProfile = useCallback(
    (updates) => {
      const safeUpdates = updates && typeof updates === 'object' ? updates : {};
      const now = new Date().toISOString();
      const nextProfile = {
        ...(profile || createDefaultProfile(user)),
        ...safeUpdates,
        id: user?.id || profile?.id || null,
        email: user?.email || profile?.email || '',
        updated_at: now,
      };

      setProfile(nextProfile);
      writeStoredProfile(nextProfile);

      if (!user?.id || !supabase) {
        return nextProfile;
      }

      queueProfileUpsert(nextProfile, 'profile update');

      return nextProfile;
    },
    [profile, user],
  );

  const signIn = useCallback(async (email, password) => {
    const result = await signInWithPassword(email, password);
    if (result?.error) {
      setError(result?.error);
    }
    return result;
  }, []);

  const signUp = useCallback(async (email, password, metadata) => {
    setError(null);
    clearAuthStorage();
    setProfile(null);
    setSubscription(null);
    const result = await signUpWithPassword(email, password, metadata);
    if (result?.error && !Object.keys(result?.fieldErrors || {})?.length) {
      setError(result?.error);
    }

    const sessionUser = result?.data?.session?.user;
    if (!result?.error && sessionUser?.id) {
      const nextProfile = createDefaultProfile(sessionUser);
      setUser(sessionUser);
      setProfile(nextProfile);
      writeStoredProfile(nextProfile);
      queueProfileUpsert(nextProfile, 'profile creation after auth.signUp');
    }

    return result;
  }, []);

  const resetPassword = useCallback(async (email) => {
    const origin = globalThis?.location?.origin || '';
    const redirectTo = `${origin}/reset-password`;
    const result = await requestPasswordReset(email, redirectTo);
    if (result?.error) {
      setError(result?.error);
    }
    return result;
  }, []);

  const updatePassword = useCallback(async (password) => {
    const result = await updateUserPassword(password);
    if (result?.error) {
      setError(result?.error);
    } else {
      setPasswordRecovery(false);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    clearAuthStorage();
    setUser(null);
    setProfile(null);
    setSubscription(null);
    setPasswordRecovery(false);

    const result = await signOutUser();
    if (result?.error) {
      setError(result?.error);
    } else {
      setError(null);
    }
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    let authSubscription = null;

    async function bootstrapAuth() {
      setLoading(true);
      setError(null);

      const { session } = await getCurrentSession();
      const sessionUser = session?.user || null;

      if (!active) {
        return;
      }

      if (sessionUser?.id) {
        setUser(sessionUser);
        await syncProfile(sessionUser);
      } else {
        const { user: currentUser } = await getCurrentUser();

        if (!active) {
          return;
        }

        setUser(currentUser);
        await syncProfile(currentUser);
      }

      if (active) {
        setLoading(false);
      }
    }

    bootstrapAuth();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          const nextUser = session?.user || null;
          setUser(nextUser);

          if (event === 'PASSWORD_RECOVERY') {
            setPasswordRecovery(true);
          }

          if (event === 'SIGNED_OUT') {
            clearAuthStorage();
            setProfile(null);
            setSubscription(null);
            setPasswordRecovery(false);
            setError(null);
            return;
          }

          if (nextUser?.id) {
            syncProfile(nextUser);
          }
        });

        authSubscription = data?.subscription || null;
      } catch {
        return;
      }
    }

    return () => {
      active = false;
      try {
        authSubscription?.unsubscribe?.();
      } catch {
        return undefined;
      }
      return undefined;
    };
  }, [syncProfile]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    function recordXPUpdate(event) {
      recordProgressEvent({
        userId: user?.id,
        metric: 'xp',
        amount: event?.detail?.amount,
        reason: event?.detail?.source,
        totalAfter: event?.detail?.totalXP,
        createdAt: event?.detail?.createdAt,
      });
    }

    function recordGoldUpdate(event) {
      recordProgressEvent({
        userId: user?.id,
        metric: 'gold',
        amount: event?.detail?.amount,
        reason: event?.detail?.source,
        totalAfter: event?.detail?.totalGold,
        createdAt: event?.detail?.createdAt,
      });
    }

    globalThis?.addEventListener?.('xpUpdated', recordXPUpdate);
    globalThis?.addEventListener?.('goldUpdated', recordGoldUpdate);

    return () => {
      globalThis?.removeEventListener?.('xpUpdated', recordXPUpdate);
      globalThis?.removeEventListener?.('goldUpdated', recordGoldUpdate);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) {
      return undefined;
    }

    let syncTimer = null;

    function scheduleSync() {
      if (syncTimer) {
        globalThis?.clearTimeout?.(syncTimer);
      }

      syncTimer = globalThis?.setTimeout?.(() => {
        syncConnectedFeatureData(user, profile);
      }, 120);
    }

    scheduleSync();
    CONNECTION_EVENTS.forEach((eventName) => globalThis?.addEventListener?.(eventName, scheduleSync));

    return () => {
      if (syncTimer) {
        globalThis?.clearTimeout?.(syncTimer);
      }
      CONNECTION_EVENTS.forEach((eventName) => globalThis?.removeEventListener?.(eventName, scheduleSync));
    };
  }, [profile, user]);

  const value = useMemo(
    () => ({
      user,
      profile,
      subscription,
      loading,
      error,
      passwordRecovery,
      updateProfile,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      clearError: () => setError(null),
    }),
    [error, loading, passwordRecovery, profile, resetPassword, signIn, signOut, signUp, subscription, updatePassword, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
