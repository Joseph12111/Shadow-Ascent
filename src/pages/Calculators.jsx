import { useEffect, useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Droplets, Dumbbell, Flame, Salad, Save } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { supabase } from '../lib/supabase.js';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
  { id: 'light', label: 'Light Activity', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderate Activity', multiplier: 1.55 },
  { id: 'active', label: 'Very Active', multiplier: 1.725 },
  { id: 'athlete', label: 'Athlete', multiplier: 1.9 },
];

const GOALS = [
  { id: 'cut', label: 'Fat Loss', offset: -350, proteinFactor: 2.2, fatFactor: 0.8 },
  { id: 'maintain', label: 'Maintain', offset: 0, proteinFactor: 1.8, fatFactor: 0.9 },
  { id: 'bulk', label: 'Lean Gain', offset: 300, proteinFactor: 1.9, fatFactor: 1 },
];

const CALCULATOR_STORAGE_KEY = 'shadowAscentCalculatorData';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPositive(value, fallback) {
  const safeValue = toNumber(value, fallback);
  return safeValue > 0 ? safeValue : fallback;
}

function calculateBMR({ sex, age, weightKg, heightCm }) {
  const safeAge = clampPositive(age, 25);
  const safeWeight = clampPositive(weightKg, 70);
  const safeHeight = clampPositive(heightCm, 170);
  const base = 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge;

  if (sex === 'male') {
    return base + 5;
  }

  if (sex === 'female') {
    return base - 161;
  }

  return base - 78;
}

function calculateTDEE(bmr, activityId) {
  const activity = ACTIVITY_LEVELS.find((entry) => entry?.id === activityId) || ACTIVITY_LEVELS[2];
  return bmr * Number(activity?.multiplier || 1);
}

function calculateMacroTargets({ calories, weightKg, goalId }) {
  const goal = GOALS.find((entry) => entry?.id === goalId) || GOALS[1];
  const safeCalories = clampPositive(calories, 2200);
  const safeWeight = clampPositive(weightKg, 70);
  const protein = Math.round(safeWeight * Number(goal?.proteinFactor || 1.8));
  const fat = Math.round(safeWeight * Number(goal?.fatFactor || 0.9));
  const carbsCalories = Math.max(0, safeCalories - protein * 4 - fat * 9);
  const carbs = Math.round(carbsCalories / 4);

  return { protein, carbs, fat };
}

function calculateOneRM(weightKg, reps) {
  const safeWeight = clampPositive(weightKg, 60);
  const safeReps = Math.max(1, Math.min(12, Math.floor(clampPositive(reps, 5))));
  return safeWeight * (1 + safeReps / 30);
}

function calculateHydrationLiters(weightKg, workoutMinutes) {
  const safeWeight = clampPositive(weightKg, 70);
  const safeMinutes = Math.max(0, toNumber(workoutMinutes, 30));
  const baseline = safeWeight * 0.033;
  const trainingExtra = (safeMinutes / 30) * 0.35;
  return baseline + trainingExtra;
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
    return true;
  } catch {
    return false;
  }
}

function buildCalculatorPayload(inputs, metrics) {
  const now = new Date().toISOString();

  return {
    sex: inputs?.sex || 'male',
    age: inputs?.age || '',
    heightCm: inputs?.heightCm || '',
    weightKg: inputs?.weightKg || '',
    activity: inputs?.activity || 'moderate',
    goal: inputs?.goal || 'maintain',
    liftWeightKg: inputs?.liftWeightKg || '',
    reps: inputs?.reps || '',
    workoutMinutes: inputs?.workoutMinutes || '',
    metrics: {
      ready: Boolean(metrics?.ready),
      bmr: metrics?.ready ? Math.round(Number(metrics?.bmr || 0)) : 0,
      tdee: metrics?.ready ? Math.round(Number(metrics?.tdee || 0)) : 0,
      goalCalories: metrics?.ready ? Math.round(Number(metrics?.goalCalories || 0)) : 0,
      macros: metrics?.macros || { protein: 0, carbs: 0, fat: 0 },
      oneRM: metrics?.oneRM ? Math.round(Number(metrics?.oneRM || 0)) : null,
      hydration: metrics?.hydration ? Number(metrics?.hydration?.toFixed?.(1) || metrics?.hydration) : 0,
    },
    updatedAt: now,
  };
}

function Field({ label, value, onChange, type = 'number', min = '0', step = 'any' }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
        min={min}
        onChange={onChange}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

export default function Calculators() {
  const { user, loading, error, updateProfile } = useAuth();
  const toast = useToast();
  const [inputs, setInputs] = useState(() => {
    const stored = readJSON(CALCULATOR_STORAGE_KEY, {});
    const safeStored = stored && typeof stored === 'object' ? stored : {};
    return {
      sex: safeStored?.sex || 'male',
      age: safeStored?.age || '28',
      heightCm: safeStored?.heightCm || '178',
      weightKg: safeStored?.weightKg || '78',
      activity: safeStored?.activity || 'moderate',
      goal: safeStored?.goal || 'maintain',
      liftWeightKg: safeStored?.liftWeightKg || '',
      reps: safeStored?.reps || '',
      workoutMinutes: safeStored?.workoutMinutes || '45',
    };
  });
  const [localError, setLocalError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  function updateInput(field, value) {
    setInputs((current) => ({
      ...current,
      [field]: value,
    }));
    setLocalError('');
    setSaveStatus('');
  }

  useEffect(() => {
    writeJSON(CALCULATOR_STORAGE_KEY, inputs);
  }, [inputs]);

  const metrics = useMemo(() => {
    const age = toNumber(inputs?.age, 0);
    const heightCm = toNumber(inputs?.heightCm, 0);
    const weightKg = toNumber(inputs?.weightKg, 0);
    const liftWeightKg = toNumber(inputs?.liftWeightKg, 0);
    const reps = toNumber(inputs?.reps, 0);
    const workoutMinutes = toNumber(inputs?.workoutMinutes, 0);

    if (age <= 0 || heightCm <= 0 || weightKg <= 0) {
      return {
        ready: false,
        bmr: 0,
        tdee: 0,
        goalCalories: 0,
        macros: { protein: 0, carbs: 0, fat: 0 },
        oneRM: null,
        hydration: 0,
      };
    }

    const bmr = calculateBMR({
      sex: inputs?.sex,
      age,
      weightKg,
      heightCm,
    });
    const tdee = calculateTDEE(bmr, inputs?.activity);
    const goal = GOALS.find((entry) => entry?.id === inputs?.goal) || GOALS[1];
    const goalCalories = Math.max(1200, Math.round(tdee + Number(goal?.offset || 0)));
    const macros = calculateMacroTargets({ calories: goalCalories, weightKg, goalId: inputs?.goal });
    const oneRM = liftWeightKg > 0 && reps > 0 ? calculateOneRM(liftWeightKg, reps) : null;
    const hydration = calculateHydrationLiters(weightKg, workoutMinutes);

    return {
      ready: true,
      bmr,
      tdee,
      goalCalories,
      macros,
      oneRM,
      hydration,
    };
  }, [inputs]);

  const empty = false;

  function saveCalculatorData() {
    const age = toNumber(inputs?.age, 0);
    const heightCm = toNumber(inputs?.heightCm, 0);
    const weightKg = toNumber(inputs?.weightKg, 0);

    if (age <= 0 || heightCm <= 0 || weightKg <= 0) {
      setLocalError('Age, height, and weight must be positive before saving.');
      setSaveStatus('');
      return;
    }

    const payload = buildCalculatorPayload(inputs, metrics);
    const savedLocally = writeJSON(CALCULATOR_STORAGE_KEY, payload);

    if (!savedLocally) {
      setLocalError('Calculator data could not be saved locally.');
      setSaveStatus('');
      return;
    }

    setLocalError('');
    setSaveStatus(user?.id ? 'Saved locally. Syncing to Supabase...' : 'Saved locally. Sign in to sync with Supabase.');
    toast?.success?.('Calculator data saved locally.');

    updateProfile?.({
      sex: payload?.sex,
      age: Number(payload?.age || 0),
      height_cm: Number(payload?.heightCm || 0),
      weight_kg: Number(payload?.weightKg || 0),
    });

    emitEvent('statUpdated', { type: 'calculatorData', calculatorData: payload });

    if (!user?.id || !supabase) {
      return;
    }

    try {
      supabase
        .from('calculator_data')
        .upsert(
          {
            user_id: user?.id,
            data: payload,
            updated_at: payload?.updatedAt,
          },
          { onConflict: 'user_id' },
        )
        .then(({ error: syncError }) => {
          if (syncError) {
            setSaveStatus('Saved locally. Supabase sync will retry later.');
            return;
          }

          setSaveStatus('Saved locally and synced to Supabase.');
          toast?.success?.('Calculator data synced to Supabase.');
        })
        .catch(() => {
          setSaveStatus('Saved locally. Supabase sync will retry later.');
        });
    } catch {
      setSaveStatus('Saved locally. Supabase sync will retry later.');
    }
  }

  return (
    <div className="w-full space-y-6">
      <Card
        empty={empty}
        error={error}
        loading={loading}
        subtitle="BMR, TDEE, macro, one-rep max, and hydration targets."
        title="Calculators"
        icon={Calculator}
      >
        {localError ? <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}
        {saveStatus ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-shadow-green/30 bg-shadow-green/10 p-4 text-sm text-shadow-textSecondary">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-shadow-green" aria-hidden="true" />
            <span>{saveStatus}</span>
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Sex</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
              onChange={(event) => updateInput('sex', event?.target?.value || 'male')}
              value={inputs?.sex}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Field label="Age" min="1" onChange={(event) => updateInput('age', event?.target?.value || '')} value={inputs?.age} />
          <Field label="Height (cm)" min="1" onChange={(event) => updateInput('heightCm', event?.target?.value || '')} value={inputs?.heightCm} />
          <Field label="Weight (kg)" min="1" onChange={(event) => updateInput('weightKg', event?.target?.value || '')} value={inputs?.weightKg} />

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Activity</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
              onChange={(event) => updateInput('activity', event?.target?.value || 'moderate')}
              value={inputs?.activity}
            >
              {ACTIVITY_LEVELS.map((activity) => (
                <option key={activity?.id} value={activity?.id}>
                  {activity?.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Goal</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
              onChange={(event) => updateInput('goal', event?.target?.value || 'maintain')}
              value={inputs?.goal}
            >
              {GOALS.map((goal) => (
                <option key={goal?.id} value={goal?.id}>
                  {goal?.label}
                </option>
              ))}
            </select>
          </label>

          <Field label="Lift Weight (kg) - Optional" min="1" onChange={(event) => updateInput('liftWeightKg', event?.target?.value || '')} value={inputs?.liftWeightKg} />
          <Field label="Reps - Optional" max="12" min="1" onChange={(event) => updateInput('reps', event?.target?.value || '')} value={inputs?.reps} />
          <Field label="Workout Minutes" min="0" onChange={(event) => updateInput('workoutMinutes', event?.target?.value || '')} value={inputs?.workoutMinutes} />
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-shadow-gold/20 bg-shadow-gold/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-shadow-textSecondary">
            Save these values before generating workouts or meal plans so AI tools can use your latest body data.
          </p>
          <Button className="shrink-0" disabled={!metrics?.ready} onClick={saveCalculatorData}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Health Data
          </Button>
        </div>
      </Card>

      {!metrics?.ready ? (
        <Card empty emptyText="Enter positive values to calculate targets." title="Results" icon={Calculator} />
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          <Card title="Energy Targets" icon={Flame}>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="BMR" value={`${Math.round(metrics?.bmr)} kcal`} />
              <StatTile label="TDEE" value={`${Math.round(metrics?.tdee)} kcal`} />
              <StatTile label="Goal Calories" value={`${Math.round(metrics?.goalCalories)} kcal`} />
            </div>
          </Card>

          <Card title="Macro Split" icon={Salad}>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Protein" value={`${metrics?.macros?.protein} g`} />
              <StatTile label="Carbs" value={`${metrics?.macros?.carbs} g`} />
              <StatTile label="Fat" value={`${metrics?.macros?.fat} g`} />
            </div>
          </Card>

          <Card title="Strength Estimate" icon={Dumbbell}>
            <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Estimated 1RM</p>
              {metrics?.oneRM ? (
                <>
                  <p className="mt-2 font-heading text-4xl font-bold text-shadow-gold">{Math.round(metrics?.oneRM)} kg</p>
                  <p className="mt-2 text-sm text-shadow-textSecondary">Calculated with Epley formula from entered weight and reps.</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-shadow-textSecondary">Add optional Lift Weight and Reps to estimate 1RM.</p>
              )}
            </div>
          </Card>

          <Card title="Hydration" icon={Droplets}>
            <div className="rounded-2xl border border-shadow-cyan/30 bg-shadow-cyan/10 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Daily Water Target</p>
              <p className="mt-2 font-heading text-4xl font-bold text-shadow-gold">{metrics?.hydration?.toFixed(1)} L</p>
              <p className="mt-2 text-sm text-shadow-textSecondary">Includes baseline intake plus training-time adjustment.</p>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">{label}</p>
      <p className="mt-2 font-heading text-2xl font-bold text-shadow-gold">{value}</p>
    </article>
  );
}
