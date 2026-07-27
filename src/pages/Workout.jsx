import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Flame, History, Plus, Timer } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import WorkoutTimer, { formatTime } from '../components/features/WorkoutTimer.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { addRP } from '../utils/rankEngine.js';
import { checkAchievements } from '../utils/achievementEngine.js';
import { supabase } from '../lib/supabase.js';
import {
  buildTodayScheduledWorkout,
  getWeekdayName,
  readJSON as readStoredJSON,
  SAVED_WORKOUT_PLANS_KEY,
  TODAY_SCHEDULED_WORKOUT_KEY,
  WEEKLY_WORKOUT_SCHEDULE_KEY,
  writeJSON as writeStoredJSON,
} from '../utils/workoutPlanEngine.js';

const WORKOUT_HISTORY_KEY = 'shadowAscentWorkoutHistory';

const WORKOUT_TEMPLATES = [
  { id: 'strength', name: 'Strength Forge', type: 'Strength', exercises: ['Squat', 'Push Press', 'Row'], rewardMultiplier: 1.1 },
  { id: 'conditioning', name: 'Shadow Conditioning', type: 'Cardio', exercises: ['Intervals', 'Carry', 'Core'], rewardMultiplier: 1 },
  { id: 'mobility', name: 'Moonlit Mobility', type: 'Recovery', exercises: ['Hips', 'T-Spine', 'Breathing'], rewardMultiplier: 0.8 },
];

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

function syncWorkout(user, workout) {
  if (!user?.id || !supabase) {
    return;
  }

  try {
    supabase
      .from('workout_history')
      .upsert({ ...workout, user_id: user?.id }, { onConflict: 'id' })
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return;
  }
}

function getReward(durationMinutes, template) {
  const safeMinutes = Math.max(1, Math.floor(Number(durationMinutes) || 1));
  const multiplier = Number(template?.rewardMultiplier || 1);

  return {
    xp: Math.ceil(safeMinutes * 2 * multiplier),
    gold: Math.ceil(safeMinutes * 0.8 * multiplier),
    rp: Math.ceil(safeMinutes * 1.2 * multiplier),
  };
}

export default function Workout() {
  const { user, profile, loading, error, updateProfile } = useAuth();
  const toast = useToast();
  const [history, setHistory] = useState(() => {
    const storedHistory = readJSON(WORKOUT_HISTORY_KEY, []);
    return Array.isArray(storedHistory) ? storedHistory : [];
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState(WORKOUT_TEMPLATES?.[0]?.id);
  const [form, setForm] = useState({ title: WORKOUT_TEMPLATES?.[0]?.name, durationMinutes: '30', notes: '' });
  const [formError, setFormError] = useState('');
  const [timerOpen, setTimerOpen] = useState(false);
  const [savedPlans, setSavedPlans] = useState(() => {
    const storedPlans = readStoredJSON(SAVED_WORKOUT_PLANS_KEY, []);
    return Array.isArray(storedPlans) ? storedPlans : [];
  });
  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    const storedSchedule = readStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, null);
    return storedSchedule && typeof storedSchedule === 'object' ? storedSchedule : null;
  });
  const [activeWorkout, setActiveWorkout] = useState(null);
  const selectedTemplate = WORKOUT_TEMPLATES.find((template) => template?.id === selectedTemplateId) || WORKOUT_TEMPLATES?.[0];
  const todayWorkouts = useMemo(() => history.filter((workout) => workout?.dateKey === todayKey()), [history]);
  const totalMinutes = useMemo(() => todayWorkouts.reduce((total, workout) => total + Number(workout?.durationMinutes || 0), 0), [todayWorkouts]);
  const todayScheduledWorkout = useMemo(() => {
    const storedToday = readStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, null);
    const today = todayKey();
    if (storedToday?.dateKey === today && (storedToday?.title || storedToday?.splitName)) {
      return storedToday;
    }

    if (!weeklySchedule?.planId) {
      return null;
    }

    const linkedPlan = savedPlans.find((plan) => plan?.id === weeklySchedule?.planId);
    if (!linkedPlan) {
      return null;
    }

    const computed = buildTodayScheduledWorkout({
      plan: linkedPlan,
      schedule: weeklySchedule?.assignments || {},
      dateValue: new Date(),
    });

    if (computed?.title || computed?.splitName) {
      writeStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, computed);
    }
    return computed;
  }, [savedPlans, weeklySchedule]);

  useEffect(() => {
    function refreshSchedule() {
      const storedPlans = readStoredJSON(SAVED_WORKOUT_PLANS_KEY, []);
      const storedSchedule = readStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, null);
      setSavedPlans(Array.isArray(storedPlans) ? storedPlans : []);
      setWeeklySchedule(storedSchedule && typeof storedSchedule === 'object' ? storedSchedule : null);
    }

    globalThis?.addEventListener?.('workoutScheduleUpdated', refreshSchedule);
    return () => {
      globalThis?.removeEventListener?.('workoutScheduleUpdated', refreshSchedule);
    };
  }, []);

  function chooseTemplate(template) {
    setSelectedTemplateId(template?.id);
    setForm((currentForm) => ({
      ...currentForm,
      title: template?.name,
    }));
    setFormError('');
  }

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setFormError('');
  }

  function startScheduledWorkout() {
    if (todayScheduledWorkout?.isRest) {
      setFormError('Today is assigned as a rest or mobility day.');
      return;
    }

    if (!todayScheduledWorkout?.exercises?.length) {
      setFormError('No scheduled workout found for today.');
      return;
    }

    setActiveWorkout({
      id: todayScheduledWorkout?.id,
      title: todayScheduledWorkout?.title || todayScheduledWorkout?.splitName || 'Scheduled Workout',
      type: 'AI Plan',
      exercises: todayScheduledWorkout?.exercises || [],
      splitName: todayScheduledWorkout?.splitName || '',
      source: 'scheduled',
    });
    setTimerOpen(true);
    setFormError('');
  }

  function saveWorkout(durationOverride, detailedResult = null, meta = null) {
    const durationMinutes = Math.max(1, Math.floor(Number(durationOverride || form?.durationMinutes) || 0));

    if (!form?.title?.trim()) {
      setFormError('Name this workout before logging it.');
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
      setFormError('Duration must be at least 1 minute.');
      return;
    }

    const reward = getReward(durationMinutes, selectedTemplate);
    const workout = {
      id: `workout-${Date.now()}`,
      dateKey: todayKey(),
      title: meta?.title || form?.title?.trim(),
      type: meta?.type || selectedTemplate?.type,
      templateId: meta?.templateId || selectedTemplate?.id,
      exercises: meta?.exercises || selectedTemplate?.exercises,
      durationMinutes,
      notes: form?.notes?.trim(),
      reward,
      workoutSource: meta?.workoutSource || 'manual',
      summary: detailedResult
        ? {
            totalTimeSeconds: Number(detailedResult?.totalTimeSeconds || 0),
            setsCompleted: Number(detailedResult?.setsCompleted || 0),
            setsTotal: Number(detailedResult?.setsTotal || 0),
            exercisesDone: Number(detailedResult?.exercisesDone || 0),
            exercisesTotal: Number(detailedResult?.exercisesTotal || 0),
            totalReps: Number(detailedResult?.totalReps || 0),
            exerciseBreakdown: Array.isArray(detailedResult?.exerciseBreakdown) ? detailedResult?.exerciseBreakdown : [],
          }
        : null,
      completedAt: new Date().toISOString(),
    };
    const nextHistory = [workout, ...history].slice(0, 200);
    const saved = writeJSON(WORKOUT_HISTORY_KEY, nextHistory);

    if (!saved) {
      setFormError('Workout could not be saved locally.');
      toast?.error?.('Workout could not be saved locally.');
      return;
    }

    setHistory(nextHistory);
    const rpResult = addRP(reward?.rp, 'workout');
    const nextProfile = updateProfile?.({
      xp: Number(profile?.xp || 0) + reward?.xp,
      gold: Number(profile?.gold || 0) + reward?.gold,
      total_rp: rpResult?.totalRP,
    });
    emitEvent('workoutCompleted', { workout, reward });
    emitEvent('xpUpdated', { amount: reward?.xp, source: 'workout', totalXP: nextProfile?.xp });
    emitEvent('goldUpdated', { amount: reward?.gold, source: 'workout', totalGold: nextProfile?.gold });
    syncWorkout(user, workout);
    checkAchievements({
      totalRP: rpResult?.totalRP,
      workoutsCompleted: nextHistory?.length,
      goldEarned: nextProfile?.gold,
    });
    setTimerOpen(false);
    setActiveWorkout(null);
    toast?.success?.(`${workout?.title} logged: +${reward?.xp} XP, +${reward?.gold} gold, +${reward?.rp} RP.`);
  }

  function finishTimer(timerResult) {
    const seconds =
      typeof timerResult === 'number'
        ? Number(timerResult || 0)
        : Number(timerResult?.totalTimeSeconds || timerResult?.seconds || 0);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    updateField('durationMinutes', String(minutes));
    saveWorkout(
      minutes,
      timerResult,
      activeWorkout
        ? {
            title: activeWorkout?.title,
            type: activeWorkout?.type || 'AI Plan',
            templateId: selectedTemplate?.id,
            exercises: activeWorkout?.exercises,
            workoutSource: 'scheduled_plan',
          }
        : null,
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card error={error} loading={loading} subtitle="Use templates, timer, and local-first workout history." title="Workout Logger" icon={Dumbbell}>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBadge icon={Dumbbell} label="Today" value={`${todayWorkouts?.length} sessions`} />
          <StatBadge icon={Timer} label="Minutes" tone="purple" value={totalMinutes} />
          <StatBadge icon={Flame} label="History" value={history?.length} />
        </div>
      </Card>

      <Card
        empty={!todayScheduledWorkout?.title && !todayScheduledWorkout?.splitName}
        emptyText={`No split scheduled for ${getWeekdayName(new Date())}.`}
        subtitle="Loads the scheduled split from Workout Generator."
        title="Today Scheduled Workout"
        icon={Timer}
      >
        {todayScheduledWorkout?.title || todayScheduledWorkout?.splitName ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4">
              <p className="font-heading text-lg font-bold text-shadow-gold">{todayScheduledWorkout?.splitName || todayScheduledWorkout?.title}</p>
              <p className="mt-1 text-sm text-shadow-textSecondary">
                {todayScheduledWorkout?.isRest ? 'Rest or mobility day assigned from your weekly schedule.' : `${todayScheduledWorkout?.exercises?.length || 0} exercises loaded for today.`}
              </p>
            </div>
            {!todayScheduledWorkout?.isRest ? (
              <>
                <Button onClick={startScheduledWorkout} variant="secondary">
                  Start Workout
                </Button>
                <div className="space-y-2">
                  {todayScheduledWorkout?.exercises?.map((exercise) => (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" key={exercise?.id || exercise?.name}>
                      <p className="font-semibold text-shadow-text">{exercise?.name}</p>
                      <p className="text-xs text-shadow-textMuted">
                        {exercise?.sets || 3} x {exercise?.reps || 10}
                      </p>
                      {exercise?.guidance ? <p className="mt-2 text-xs leading-5 text-shadow-textSecondary">{exercise?.guidance}</p> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </Card>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card title="Templates" subtitle="Pick the training pattern for this log.">
          <div className="grid gap-3">
            {WORKOUT_TEMPLATES?.map((template) => (
              <button
                className={`rounded-2xl border p-4 text-left transition ${selectedTemplateId === template?.id ? 'border-shadow-gold/40 bg-shadow-gold/10 shadow-goldGlow' : 'border-white/10 bg-white/[0.03] hover:border-shadow-purple/40'}`}
                key={template?.id}
                onClick={() => chooseTemplate(template)}
                type="button"
              >
                <h3 className="font-heading text-lg font-bold text-shadow-gold">{template?.name}</h3>
                <p className="mt-1 text-sm text-shadow-textSecondary">{template?.type}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-shadow-purpleLight">{template?.exercises?.join(' / ')}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Log Session" subtitle="Rewards scale from duration and template intensity.">
          <div className="space-y-4">
            {formError ? <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{formError}</div> : null}
            <Field label="Workout Name" onChange={(event) => updateField('title', event?.target?.value || '')} value={form?.title} />
            <Field label="Duration Minutes" min="1" onChange={(event) => updateField('durationMinutes', event?.target?.value || '')} type="number" value={form?.durationMinutes} />
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Notes</span>
              <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" onChange={(event) => updateField('notes', event?.target?.value || '')} value={form?.notes} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setTimerOpen(true)} variant="secondary">
                <Timer className="h-4 w-4" aria-hidden="true" />
                Timer Overlay
              </Button>
              <Button onClick={() => saveWorkout()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Log Workout
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <Card empty={!history?.length} emptyText="No workouts logged yet." title="Workout History" icon={History}>
        <div className="space-y-3">
          {history?.map((workout) => (
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={workout?.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-shadow-gold">{workout?.title}</h3>
                  <p className="text-sm text-shadow-textSecondary">
                    {workout?.type} / {workout?.durationMinutes} min / {workout?.dateKey}
                  </p>
                </div>
                <span className="rounded-full border border-shadow-gold/30 bg-shadow-gold/10 px-3 py-1 text-xs font-semibold text-shadow-gold">
                  +{workout?.reward?.xp} XP
                </span>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <WorkoutTimer
        initialSeconds={Number(form?.durationMinutes || 0) * 60}
        onClose={() => {
          setTimerOpen(false);
          setActiveWorkout(null);
        }}
        onFinish={finishTimer}
        open={timerOpen}
        scheduledExercises={activeWorkout?.exercises || []}
        useAiPlanTimingDefault={Boolean(activeWorkout?.exercises?.length)}
        workoutTitle={activeWorkout?.title || form?.title}
      />
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">{label}</span>
      <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" {...props} />
    </label>
  );
}
