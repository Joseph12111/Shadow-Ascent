import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import Button from '../ui/Button.jsx';

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function toSeconds(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function getExerciseWorkSeconds(exercise, settings) {
  if (settings?.useAiPlanTiming && exercise?.timing?.workSeconds) {
    return toSeconds(exercise?.timing?.workSeconds, settings?.workSeconds);
  }
  return settings?.workSeconds;
}

function getExerciseSetRestSeconds(exercise, settings) {
  if (settings?.useAiPlanTiming && exercise?.timing?.restSeconds) {
    return toSeconds(exercise?.timing?.restSeconds, settings?.restSeconds);
  }
  return settings?.restSeconds;
}

function getExerciseTransitionRestSeconds(exercise, settings) {
  if (settings?.useAiPlanTiming && exercise?.timing?.exerciseRestSeconds) {
    return toSeconds(exercise?.timing?.exerciseRestSeconds, settings?.exerciseRestSeconds);
  }
  return settings?.exerciseRestSeconds;
}

function createBreakdown(exercises) {
  return (Array.isArray(exercises) ? exercises : []).map((exercise) => ({
    id: exercise?.id || `${exercise?.name || 'exercise'}`,
    name: exercise?.name || 'Exercise',
    sets: Number(exercise?.sets || 3),
    reps: Number(exercise?.reps || 10),
    weight: exercise?.weight || '',
    completedSets: 0,
    completed: false,
  }));
}

export default function WorkoutTimer({
  open = false,
  initialSeconds = 0,
  onClose,
  onFinish,
  loading = false,
  error = null,
  empty = false,
  scheduledExercises = [],
  workoutTitle = 'Workout',
  useAiPlanTimingDefault = false,
}) {
  const guidedMode = Array.isArray(scheduledExercises) && scheduledExercises?.length > 0;
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('settings');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(1);
  const [segment, setSegment] = useState('work');
  const [elapsedGuidedSeconds, setElapsedGuidedSeconds] = useState(0);
  const [setsCompleted, setSetsCompleted] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [exercisesDone, setExercisesDone] = useState(0);
  const [breakdown, setBreakdown] = useState([]);
  const [settings, setSettings] = useState({
    useAiPlanTiming: Boolean(useAiPlanTimingDefault),
    workSeconds: 45,
    restSeconds: 60,
    exerciseRestSeconds: 90,
  });

  const totalSets = useMemo(() => (Array.isArray(scheduledExercises) ? scheduledExercises.reduce((sum, exercise) => sum + Number(exercise?.sets || 3), 0) : 0), [scheduledExercises]);
  const currentExercise = guidedMode ? scheduledExercises?.[exerciseIndex] : null;
  const nextExercise = guidedMode ? scheduledExercises?.[exerciseIndex + 1] : null;
  const currentSetTotal = Number(currentExercise?.sets || 3);
  const currentCompletedSets = Number(breakdown?.[exerciseIndex]?.completedSets || 0);
  const thisSetWork = guidedMode && currentExercise ? getExerciseWorkSeconds(currentExercise, settings) : 0;
  const thisSetRest = guidedMode && currentExercise ? getExerciseSetRestSeconds(currentExercise, settings) : 0;
  const timerLabel = phase === 'exercise-rest' || segment === 'rest' ? 'Rest Timer' : 'This Set';

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    globalThis.__shadowAscentOverlayCount = Number(globalThis?.__shadowAscentOverlayCount || 0) + 1;
    globalThis?.dispatchEvent?.(new CustomEvent('shadowAscentOverlayChange', { detail: { count: globalThis?.__shadowAscentOverlayCount } }));

    return () => {
      globalThis.__shadowAscentOverlayCount = Math.max(0, Number(globalThis?.__shadowAscentOverlayCount || 0) - 1);
      globalThis?.dispatchEvent?.(new CustomEvent('shadowAscentOverlayChange', { detail: { count: globalThis?.__shadowAscentOverlayCount } }));
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSeconds(initialSeconds);
    setRunning(false);
    setElapsedGuidedSeconds(0);
    setSetsCompleted(0);
    setTotalReps(0);
    setExercisesDone(0);
    setExerciseIndex(0);
    setSetIndex(1);
    setSegment('work');
    setBreakdown(createBreakdown(scheduledExercises));
    setSettings((current) => ({
      ...current,
      useAiPlanTiming: Boolean(useAiPlanTimingDefault),
    }));
    if (guidedMode) {
      setPhase('settings');
      setSecondsLeft(0);
    } else {
      setPhase('stopwatch');
      setSecondsLeft(0);
    }
  }, [guidedMode, initialSeconds, open, scheduledExercises, useAiPlanTimingDefault]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    if (!guidedMode && phase === 'stopwatch') {
      const timer = globalThis?.setInterval?.(() => {
        setSeconds((currentSeconds) => currentSeconds + 1);
      }, 1000);
      return () => {
        globalThis?.clearInterval?.(timer);
      };
    }

    if (guidedMode && (phase === 'guided' || phase === 'exercise-rest')) {
      const timer = globalThis?.setInterval?.(() => {
        setElapsedGuidedSeconds((current) => current + 1);
        setSecondsLeft((current) => Math.max(0, current - 1));
      }, 1000);

      return () => {
        globalThis?.clearInterval?.(timer);
      };
    }

    return undefined;
  }, [guidedMode, phase, running]);

  useEffect(() => {
    if (!guidedMode || !running) {
      return;
    }

    if (secondsLeft > 0) {
      return;
    }

    if (phase === 'guided') {
      if (segment === 'rest') {
        setRunning(false);
        setSetIndex((current) => current + 1);
        setSegment('work');
        setSecondsLeft(getExerciseWorkSeconds(currentExercise, settings));
        setRunning(true);
        return;
      }

      setRunning(false);
      const reps = Number(currentExercise?.reps || 10);
      setSetsCompleted((current) => current + 1);
      setTotalReps((current) => current + reps);
      setBreakdown((current) =>
        current.map((item, index) => (index === exerciseIndex ? { ...item, completedSets: Number(item?.completedSets || 0) + 1 } : item)),
      );

      if (setIndex < currentSetTotal) {
        const nextRest = getExerciseSetRestSeconds(currentExercise, settings);
        if (nextRest > 0) {
          setSegment('rest');
          setSecondsLeft(nextRest);
          setRunning(true);
          return;
        }
        setSetIndex((current) => current + 1);
        setSegment('work');
        setSecondsLeft(getExerciseWorkSeconds(currentExercise, settings));
        setRunning(true);
        return;
      }

      setExercisesDone((current) => current + 1);
      setBreakdown((current) => current.map((item, index) => (index === exerciseIndex ? { ...item, completed: true } : item)));

      if (exerciseIndex < scheduledExercises?.length - 1) {
        const transitionRest = getExerciseTransitionRestSeconds(currentExercise, settings);
        if (transitionRest > 0) {
          setPhase('exercise-rest');
          setSecondsLeft(transitionRest);
          setRunning(true);
          return;
        }
        setPhase('exercise-ready');
        setSegment('work');
        setSecondsLeft(0);
        return;
      }

      setPhase('finished');
      return;
    }

    if (phase === 'exercise-rest') {
      setRunning(false);
      setPhase('exercise-ready');
      setSegment('work');
      setSecondsLeft(0);
    }
  }, [
    currentExercise,
    currentSetTotal,
    exerciseIndex,
    guidedMode,
    phase,
    running,
    scheduledExercises,
    secondsLeft,
    segment,
    setIndex,
    settings,
  ]);

  function startGuidedWorkout() {
    const firstExercise = scheduledExercises?.[0];
    if (!firstExercise) {
      return;
    }

    setExerciseIndex(0);
    setSetIndex(1);
    setSegment('work');
    setPhase('guided');
    setSecondsLeft(getExerciseWorkSeconds(firstExercise, settings));
    setRunning(true);
  }

  function resetGuidedWorkout() {
    setRunning(false);
    setElapsedGuidedSeconds(0);
    setSetsCompleted(0);
    setTotalReps(0);
    setExercisesDone(0);
    setExerciseIndex(0);
    setSetIndex(1);
    setSegment('work');
    setSecondsLeft(0);
    setBreakdown(createBreakdown(scheduledExercises));
    setPhase('settings');
  }

  function startNextExercise() {
    const nextIndex = exerciseIndex + 1;
    const upcomingExercise = scheduledExercises?.[nextIndex];

    if (!upcomingExercise) {
      setPhase('finished');
      setRunning(false);
      return;
    }

    setExerciseIndex(nextIndex);
    setSetIndex(1);
    setSegment('work');
    setPhase('guided');
    setSecondsLeft(getExerciseWorkSeconds(upcomingExercise, settings));
    setRunning(true);
  }

  function goToNextExerciseCheckpoint() {
    setRunning(false);

    if (exerciseIndex >= scheduledExercises?.length - 1) {
      setPhase('finished');
      return;
    }

    setPhase('exercise-ready');
    setSegment('work');
    setSecondsLeft(0);
  }

  const formatted = useMemo(() => formatTime(seconds), [seconds]);
  const formattedGuided = useMemo(() => formatTime(elapsedGuidedSeconds), [elapsedGuidedSeconds]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-3 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:px-5 sm:py-6 sm:pb-6">
      <section className="glass-card max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto p-4 pb-8 text-left sm:max-h-[calc(100dvh-3rem)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold text-shadow-gold">Workout Timer</h2>
          </div>
          <Button aria-label="Close timer" onClick={onClose} size="icon" variant="ghost">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {loading ? <div className="h-20 animate-pulse rounded-2xl bg-white/10" /> : null}
        {error ? <p className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">Timer unavailable.</p> : null}
        {empty ? <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-shadow-textSecondary">Start a workout to use the timer.</p> : null}

        {!loading && !error && !empty ? (
          <>
            {!guidedMode ? (
              <>
                <div className="rounded-3xl border border-shadow-gold/30 bg-shadow-gold/10 py-8 text-center shadow-goldGlow">
                  <p className="font-heading text-6xl font-bold text-shadow-gold">{formatted}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-shadow-textMuted">Elapsed</p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Button onClick={() => setRunning((isRunning) => !isRunning)} variant="secondary">
                    {running ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    {running ? 'Pause' : 'Start'}
                  </Button>
                  <Button onClick={() => setSeconds(0)} variant="ghost">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset
                  </Button>
                  <Button
                    onClick={() => {
                      setRunning(false);
                      onFinish?.({ seconds, totalTimeSeconds: seconds });
                    }}
                  >
                    Finish
                  </Button>
                </div>
              </>
            ) : null}

            {guidedMode && phase === 'settings' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4">
                  <p className="font-heading text-lg font-bold text-shadow-gold">{workoutTitle}</p>
                  <p className="text-sm text-shadow-textSecondary">{scheduledExercises?.length} exercises loaded from todayScheduledWorkout.</p>
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <span className="text-sm font-semibold text-shadow-text">Use AI Plan Timing</span>
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${settings?.useAiPlanTiming ? 'bg-shadow-gold text-black' : 'bg-white/10 text-shadow-textSecondary'}`}
                    onClick={() => setSettings((current) => ({ ...current, useAiPlanTiming: !current?.useAiPlanTiming }))}
                    type="button"
                  >
                    {settings?.useAiPlanTiming ? 'ON' : 'OFF'}
                  </button>
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <TimerField label="Work (sec)" value={settings?.workSeconds} onChange={(value) => setSettings((current) => ({ ...current, workSeconds: toSeconds(value, 45) }))} />
                  <TimerField label="Rest (sec)" value={settings?.restSeconds} onChange={(value) => setSettings((current) => ({ ...current, restSeconds: toSeconds(value, 60) }))} />
                  <TimerField
                    label="Between Exercises (sec)"
                    value={settings?.exerciseRestSeconds}
                    onChange={(value) => setSettings((current) => ({ ...current, exerciseRestSeconds: toSeconds(value, 90) }))}
                  />
                </div>

                <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-[#111118] via-[#111118] to-transparent px-4 pb-1 pt-4 sm:static sm:mx-0 sm:bg-none sm:p-0">
                  <Button className="min-h-12 w-full" onClick={startGuidedWorkout} variant="secondary">
                  Start Workout
                  </Button>
                </div>
              </div>
            ) : null}

            {guidedMode && (phase === 'guided' || phase === 'exercise-rest') ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-shadow-gold/30 bg-shadow-gold/10 p-6 text-center shadow-goldGlow">
                  <p className="text-xs uppercase tracking-[0.2em] text-shadow-textMuted">{timerLabel}</p>
                  <p className="mt-2 font-heading text-5xl font-bold text-shadow-gold">{formatTime(secondsLeft)}</p>
                  <p className="mt-2 text-sm text-shadow-textSecondary">Elapsed {formattedGuided}</p>
                </div>

                {phase === 'guided' ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-heading text-lg font-bold text-shadow-gold">{currentExercise?.name}</p>
                    {currentExercise?.guidance ? <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">{currentExercise?.guidance}</p> : null}
                    <p className="mt-2 text-sm text-shadow-textSecondary">
                      SET {currentCompletedSets} / {currentSetTotal}
                    </p>
                    {segment === 'rest' ? (
                      <p className="mt-2 text-sm text-shadow-textSecondary">Rest before set {Math.min(currentCompletedSets + 1, currentSetTotal)}: {thisSetRest} sec</p>
                    ) : (
                      <>
                        <p className="mt-2 text-sm text-shadow-textSecondary">Work: {thisSetWork} sec</p>
                        <p className="text-sm text-shadow-textSecondary">Rest after: {thisSetRest} sec</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-shadow-purpleLight">Rest Timer</p>
                    <p className="mt-1 font-heading text-lg font-bold text-shadow-gold">REST - {secondsLeft} SECONDS</p>
                    {nextExercise?.name ? <p className="mt-2 text-sm text-shadow-textSecondary">Next: {nextExercise?.name}</p> : null}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <Button onClick={() => setRunning((current) => !current)} variant="secondary">
                    {running ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    {running ? 'Pause' : 'Resume'}
                  </Button>
                  <Button onClick={resetGuidedWorkout} variant="ghost">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Restart
                  </Button>
                  <Button onClick={goToNextExerciseCheckpoint} variant="ghost">
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {guidedMode && phase === 'exercise-ready' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-shadow-textMuted">Exercise Complete</p>
                  <p className="mt-2 font-heading text-xl font-bold text-shadow-gold">{currentExercise?.name}</p>
                  <p className="mt-2 text-sm text-shadow-textSecondary">
                    Completed {currentSetTotal} / {currentSetTotal} sets.
                  </p>
                </div>

                <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-shadow-purpleLight">Up Next</p>
                  <p className="mt-1 font-heading text-lg font-bold text-shadow-gold">{nextExercise?.name || 'Workout finish'}</p>
                  {nextExercise?.guidance ? <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">{nextExercise?.guidance}</p> : null}
                </div>

                <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-3 bg-gradient-to-t from-[#111118] via-[#111118] to-transparent px-4 pb-1 pt-4 sm:static sm:mx-0 sm:bg-none sm:p-0">
                  <Button onClick={resetGuidedWorkout} variant="ghost">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Restart
                  </Button>
                  <Button className="min-h-12" onClick={startNextExercise} variant="secondary">
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {guidedMode && phase === 'finished' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-5">
                  <p className="font-heading text-2xl font-bold text-shadow-gold">WORKOUT COMPLETE</p>
                  <div className="mt-4 space-y-1 text-sm text-shadow-textSecondary">
                    <p>Total Time: {formattedGuided}</p>
                    <p>Sets Completed: {setsCompleted} / {totalSets}</p>
                    <p>Exercises Done: {exercisesDone} / {scheduledExercises?.length}</p>
                    <p>Total Reps: {totalReps}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Exercise Breakdown</p>
                  <div className="space-y-2">
                    {breakdown?.map((item) => (
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2" key={item?.id}>
                        <p className="text-sm text-shadow-text">{item?.name}</p>
                        <p className="text-xs text-shadow-textSecondary">
                          {item?.completedSets}/{item?.sets} sets {item?.completed ? 'OK' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={resetGuidedWorkout} variant="ghost">
                    Start Another
                  </Button>
                  <Button
                    onClick={() =>
                      onFinish?.({
                        totalTimeSeconds: elapsedGuidedSeconds,
                        setsCompleted,
                        setsTotal: totalSets,
                        exercisesDone,
                        exercisesTotal: scheduledExercises?.length,
                        totalReps,
                        exerciseBreakdown: breakdown,
                        seconds: elapsedGuidedSeconds,
                      })
                    }
                  >
                    Finish
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function TimerField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">{label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
        min="0"
        onChange={(event) => onChange(event?.target?.value || '0')}
        type="number"
        value={value}
      />
    </label>
  );
}

export { formatTime };
