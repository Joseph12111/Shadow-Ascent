import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Dumbbell, Flame, History, Plus, Timer } from 'lucide-react';
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
  parseWorkoutPlanFromText,
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

function isGeneratedSectionLabel(value) {
  return /^(?:warm[\s-]*up|main workout|cool[\s-]*down|rest)(?:\s*\([^)]*\))?\s*:?\s*$/i.test(String(value || '').trim());
}

function sanitizeScheduledWorkout(workout) {
  if (!workout || typeof workout !== 'object') {
    return workout;
  }

  let exercises = Array.isArray(workout?.exercises)
    ? workout?.exercises.filter((exercise) => exercise?.name && !isGeneratedSectionLabel(exercise?.name))
    : [];

  if (!exercises?.length && workout?.fallbackText) {
    const recoveredPlan = parseWorkoutPlanFromText(workout?.fallbackText);
    const targetName = String(workout?.splitName || workout?.title || '').trim().toLowerCase();
    const recoveredSplit =
      recoveredPlan?.splits?.find((split) => String(split?.name || '').trim().toLowerCase() === targetName) ||
      recoveredPlan?.splits?.[0];
    exercises = Array.isArray(recoveredSplit?.exercises)
      ? recoveredSplit?.exercises.filter((exercise) => exercise?.name && !isGeneratedSectionLabel(exercise?.name))
      : [];
  }

  return { ...workout, exercises };
}

function getExercisePrescription(exercise) {
  if (exercise?.prescription) {
    return exercise?.prescription;
  }

  if (exercise?.setsText || exercise?.repsText) {
    const sets = exercise?.setsText || exercise?.sets || 1;
    const reps = exercise?.repsText || exercise?.reps || 1;
    return `${sets} x ${reps}`;
  }

  if (exercise?.timing?.workSeconds) {
    return `${exercise?.timing?.workSeconds} seconds`;
  }

  return 'Prescription in full plan';
}

function getExerciseSectionLabel(section) {
  const labels = {
    activation: 'Activation',
    accessories: 'Accessories',
    'accessory block': 'Accessory Block',
    conditioning: 'Conditioning',
    'conditioning block': 'Conditioning',
    core: 'Core',
    'core block': 'Core',
    cooldown: 'Cool-down',
    finisher: 'Finisher',
    'main lifts': 'Main Lifts',
    'main workout': 'Main Workout',
    'strength block': 'Strength Block',
    warmup: 'Warm-up',
  };
  return labels?.[section] || '';
}

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
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
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
    const storedToday = sanitizeScheduledWorkout(readStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, null));
    const today = todayKey();
    if (!weeklySchedule?.planId) {
      return storedToday?.dateKey === today ? storedToday : null;
    }

    const linkedPlan = savedPlans.find((plan) => plan?.id === weeklySchedule?.planId);
    if (!linkedPlan) {
      return storedToday?.dateKey === today ? storedToday : null;
    }

    const reparsedPlan = linkedPlan?.sourceText
      ? parseWorkoutPlanFromText(linkedPlan?.sourceText, linkedPlan?.estimatedMinutes)
      : null;
    const currentPlan = reparsedPlan?.splits?.length
      ? { ...linkedPlan, splits: reparsedPlan?.splits }
      : linkedPlan;

    const computed = buildTodayScheduledWorkout({
      plan: currentPlan,
      schedule: weeklySchedule?.assignments || {},
      dateValue: new Date(),
    });

    if (computed?.title || computed?.splitName) {
      writeStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, computed);
      return sanitizeScheduledWorkout(computed);
    }
    return storedToday?.dateKey === today ? storedToday : null;
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

  useEffect(() => {
    setPlanDetailsOpen(false);
  }, [todayScheduledWorkout?.id]);

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
            <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-heading text-lg font-bold text-shadow-gold">
                  {todayScheduledWorkout?.splitName || todayScheduledWorkout?.title}
                </p>
                <p className="mt-1 text-sm text-shadow-textSecondary">
                  {todayScheduledWorkout?.isRest
                    ? 'Rest or mobility day assigned from your weekly schedule.'
                    : todayScheduledWorkout?.exercises?.length
                      ? `${todayScheduledWorkout?.exercises?.length} exercise${todayScheduledWorkout?.exercises?.length === 1 ? '' : 's'} loaded for today.`
                      : 'Workout plan found, but exercises could not be parsed.'}
                </p>
              </div>
              {!todayScheduledWorkout?.isRest && todayScheduledWorkout?.exercises?.length ? (
                <Button className="w-full shrink-0 shadow-goldGlowStrong sm:w-auto" onClick={startScheduledWorkout}>
                  <Timer className="h-4 w-4" aria-hidden="true" />
                  Start Workout
                </Button>
              ) : null}
            </div>
            {!todayScheduledWorkout?.isRest ? (
              <>
                {todayScheduledWorkout?.notes?.length ? (
                  <div className="space-y-1 rounded-xl border border-shadow-purple/20 bg-shadow-purple/5 p-3">
                    {todayScheduledWorkout?.notes?.map((note) => (
                      <p className="text-xs leading-5 text-shadow-textSecondary" key={note}>{note}</p>
                    ))}
                  </div>
                ) : null}
                {todayScheduledWorkout?.exercises?.length ? (
                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    {todayScheduledWorkout?.exercises?.map((exercise) => {
                      const sectionLabel = getExerciseSectionLabel(exercise?.section);
                      return (
                        <article className="min-w-0 rounded-xl border border-shadow-border bg-black/20 p-4" key={exercise?.id || exercise?.name}>
                          {sectionLabel ? (
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-shadow-purpleLight">{sectionLabel}</p>
                          ) : null}
                          <h3 className="mt-1 break-words font-semibold text-shadow-text">{exercise?.name}</h3>
                          <dl className="mt-3 grid min-w-0 gap-2 text-xs sm:grid-cols-2">
                            <div className="min-w-0 rounded-lg border border-shadow-border bg-shadow-card/60 p-2.5">
                              <dt className="uppercase tracking-[0.12em] text-shadow-textMuted">Sets / reps or time</dt>
                              <dd className="mt-1 break-words font-semibold text-shadow-gold">{getExercisePrescription(exercise)}</dd>
                            </div>
                            <div className="min-w-0 rounded-lg border border-shadow-border bg-shadow-card/60 p-2.5">
                              <dt className="uppercase tracking-[0.12em] text-shadow-textMuted">Rest</dt>
                              <dd className="mt-1 font-semibold text-shadow-textSecondary">
                                {exercise?.timing?.restSeconds ? `${exercise?.timing?.restSeconds} seconds` : 'Use session default'}
                              </dd>
                            </div>
                          </dl>
                          {exercise?.guidance ? (
                            <p className="mt-3 break-words text-xs leading-5 text-shadow-textSecondary">{exercise?.guidance}</p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-shadow-gold/30 bg-shadow-gold/5 p-4 text-sm leading-6 text-shadow-textSecondary">
                    Workout plan found, but exercises could not be parsed.
                  </div>
                )}
              </>
            ) : null}
            {todayScheduledWorkout?.fallbackText ? (
              <div className="min-w-0 overflow-hidden rounded-xl border border-shadow-border bg-black/20">
                <button
                  aria-expanded={planDetailsOpen}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-shadow-text transition hover:bg-shadow-purple/10 hover:text-shadow-purpleLight"
                  onClick={() => setPlanDetailsOpen((current) => !current)}
                  type="button"
                >
                  <span>{planDetailsOpen ? 'Hide full plan details' : 'View full plan details'}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${planDetailsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {planDetailsOpen ? (
                  <div className="border-t border-shadow-border px-4 py-4">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-shadow-textSecondary">
                      {todayScheduledWorkout?.fallbackText}
                    </p>
                  </div>
                ) : null}
              </div>
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
