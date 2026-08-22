import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Calculator, CheckCircle2, Dumbbell, Flame, ScrollText, Sparkles, Trophy } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import RankWidget from '../components/game/RankWidget.jsx';
import XPBar from '../components/game/XPBar.jsx';
import BrainQuestModal from '../components/features/BrainQuestModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { addRP, calculateRank, getTotalRP } from '../utils/rankEngine.js';
import { getXPLevelProgress } from '../utils/progressAnalytics.js';

const DASHBOARD_FOCUS_KEY = 'shadowAscentDashboardFocus';
const QUEST_STATE_KEY = 'shadowAscentDailyQuests';
const WORKOUT_HISTORY_KEY = 'shadowAscentWorkoutHistory';
const TASKS_KEY = 'shadowAscentChecklistTasks';
const HABITS_KEY = 'shadowAscentBadHabits';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

function getDashboardSnapshot(profile) {
  const dateKey = todayKey();
  const questState = readJSON(QUEST_STATE_KEY, {});
  const workoutHistory = readJSON(WORKOUT_HISTORY_KEY, []);
  const tasks = readJSON(TASKS_KEY, []);
  const habits = readJSON(HABITS_KEY, []);
  const dailyQuestState = questState?.[dateKey] || {};
  const completedQuestCount = Object.values(dailyQuestState?.completed || {}).filter(Boolean)?.length || 0;
  const todayWorkouts = Array.isArray(workoutHistory) ? workoutHistory.filter((workout) => workout?.dateKey === dateKey) : [];
  const openTasks = Array.isArray(tasks) ? tasks.filter((task) => !task?.completed)?.length : 0;
  const resistedHabits = Array.isArray(habits) ? habits.filter((habit) => habit?.lastResistedDate === dateKey)?.length : 0;

  return {
    completedQuestCount,
    todayWorkoutCount: todayWorkouts?.length,
    todayWorkoutMinutes: todayWorkouts.reduce((total, workout) => total + Number(workout?.durationMinutes || 0), 0),
    openTasks,
    resistedHabits,
    xp: Number(profile?.xp || 0),
    gold: Number(profile?.gold || 0),
    totalRP: Number(profile?.total_rp ?? getTotalRP()),
  };
}

export default function Dashboard() {
  const { profile, loading, updateProfile } = useAuth();
  const toast = useToast();
  const [snapshot, setSnapshot] = useState(() => getDashboardSnapshot(profile));
  const [brainOpen, setBrainOpen] = useState(false);
  const [focusClaimed, setFocusClaimed] = useState(() => {
    const focus = readJSON(DASHBOARD_FOCUS_KEY, {});
    return focus?.dateKey === todayKey();
  });

  useEffect(() => {
    function refreshSnapshot() {
      setSnapshot(getDashboardSnapshot(profile));
    }

    refreshSnapshot();
    const events = ['dailyQuestUpdated', 'workoutCompleted', 'brainQuestCompleted', 'statUpdated', 'xpUpdated', 'goldUpdated', 'rpUpdated', 'achievementUnlocked', 'rankUp'];
    events.forEach((eventName) => globalThis?.addEventListener?.(eventName, refreshSnapshot));

    return () => {
      events.forEach((eventName) => globalThis?.removeEventListener?.(eventName, refreshSnapshot));
    };
  }, [profile]);

  const rankData = useMemo(() => calculateRank(snapshot?.totalRP), [snapshot?.totalRP]);
  const xpLevel = useMemo(() => getXPLevelProgress(profile, snapshot?.xp), [profile, snapshot?.xp]);

  function claimDailyFocus() {
    const dateKey = todayKey();
    const saved = writeJSON(DASHBOARD_FOCUS_KEY, { dateKey, claimedAt: new Date().toISOString(), reward: { xp: 10, gold: 5 } });

    if (!saved) {
      toast?.error?.('Daily focus could not be saved locally.');
      return;
    }

    setFocusClaimed(true);
    const nextProfile = updateProfile?.({
      xp: Number(profile?.xp || 0) + 10,
      gold: Number(profile?.gold || 0) + 5,
    });
    emitEvent('xpUpdated', { amount: 10, source: 'dashboardFocus', totalXP: nextProfile?.xp });
    emitEvent('goldUpdated', { amount: 5, source: 'dashboardFocus', totalGold: nextProfile?.gold });
    toast?.success?.('Daily focus claimed: +10 XP, +5 gold.');
  }

  function handleBrainComplete(result) {
    const reward = Number(result?.pointsAwarded || 0);

    if (reward > 0) {
      const rpResult = addRP(reward, 'brainQuest');
      updateProfile?.({
        total_rp: rpResult?.totalRP,
        xp: Number(profile?.xp || 0) + reward,
      });
      emitEvent('xpUpdated', { amount: reward, source: 'brainQuest', totalXP: Number(profile?.xp || 0) + reward });
      toast?.achievement?.(`Brain quest complete: +${reward} RP and XP.`);
    }
  }

  return (
    <div className="w-full space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card loading={loading} subtitle="Today progress, synced locally first." title="Dashboard" icon={Sparkles}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatBadge icon={ScrollText} label="Quests" value={`${snapshot?.completedQuestCount}/5`} />
            <StatBadge icon={Dumbbell} label="Workout" tone="purple" value={`${snapshot?.todayWorkoutMinutes} min`} />
            <StatBadge icon={CheckCircle2} label="Open Tasks" value={snapshot?.openTasks} />
            <StatBadge icon={Flame} label="Habits Held" tone="purple" value={snapshot?.resistedHabits} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Button className="transition-all duration-200 hover:shadow-goldGlowStrong" disabled={focusClaimed} onClick={claimDailyFocus} variant={focusClaimed ? 'ghost' : 'primary'}>
              {focusClaimed ? 'Focus Claimed' : 'Claim Focus'}
            </Button>
            <Button className="transition-all duration-200 hover:shadow-purpleGlow" onClick={() => setBrainOpen(true)} variant="secondary">
              <Brain className="h-4 w-4" aria-hidden="true" />
              Brain Quest
            </Button>
            <Link className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-shadow-border bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-shadow-textSecondary transition-all duration-200 hover:border-shadow-gold/40 hover:text-shadow-gold hover:shadow-goldGlow" to="/quests">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                Daily Quests
            </Link>
          </div>
        </Card>

        <div className="space-y-5 rounded-2xl shadow-goldGlowStrong">
          <RankWidget profile={profile} rankData={rankData} />
          <Card title="XP Flow" subtitle="Earned through quests, workouts, and discipline.">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-shadow-border bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-shadow-textMuted">Current XP</p>
                <p className="mt-1 text-lg font-bold text-shadow-gold">{xpLevel?.totalXP}</p>
              </div>
              <div className="rounded-xl border border-shadow-purple/25 bg-shadow-purple/10 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-shadow-textMuted">Current Level</p>
                <p className="mt-1 text-lg font-bold text-shadow-purpleLight">{xpLevel?.level}</p>
              </div>
              <div className="rounded-xl border border-shadow-border bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-shadow-textMuted">XP Needed</p>
                <p className="mt-1 text-lg font-bold text-white">{xpLevel?.xpNeeded}</p>
              </div>
              <div className="rounded-xl border border-shadow-border bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-shadow-textMuted">To Next Level</p>
                <p className="mt-1 text-lg font-bold text-white">{xpLevel?.percentage}%</p>
              </div>
            </div>
            <XPBar xp={xpLevel?.xpIntoLevel} nextLevelXP={100} />
            <div className="mt-4 rounded-2xl border border-shadow-gold/20 bg-shadow-gold/10 p-4 text-sm text-shadow-textSecondary">
              Gold held: <span className="font-semibold text-shadow-gold">{snapshot?.gold}</span>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <QuickLink icon={ScrollText} label="Quests" text="Complete five daily vows and claim rewards." to="/quests" />
        <QuickLink icon={Dumbbell} label="Workout" text="Log training and time active sessions." to="/workout" />
        <QuickLink icon={CheckCircle2} label="Checklist" text="Manage tasks and break bad habits." to="/checklist" />
        <QuickLink icon={Calculator} label="Calculators" text="BMR, TDEE, macros, 1RM, and hydration targets." to="/calculators" />
      </section>

      <BrainQuestModal onClose={() => setBrainOpen(false)} onComplete={handleBrainComplete} open={brainOpen} />
    </div>
  );
}

function QuickLink({ icon: Icon, label, text, to }) {
  return (
    <Link className="glass-card block border-shadow-border p-5 transition-all duration-200 hover:border-shadow-purple/50 hover:shadow-purpleGlow" to={to}>
      <Icon className="h-6 w-6 text-shadow-purpleLight" aria-hidden="true" />
      <h3 className="mt-4 font-heading text-xl font-bold text-shadow-gold">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">{text}</p>
    </Link>
  );
}
