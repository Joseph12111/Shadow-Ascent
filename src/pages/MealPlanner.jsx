import { useEffect, useMemo, useState } from 'react';
import { ChefHat, Sparkles, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { recordFeatureUsage } from '../utils/usageTracker.js';
import { isOwner } from '../utils/ownerCheck.js';
import { callOpenAIResponse, Field, GeneratedOutput, HistoryPanel, isAIServiceConfigured, saveAIHistory, UpgradeModal, UsageBanner } from './WorkoutGenerator.jsx';

const MEAL_PLANNER_HISTORY_KEY = 'shadowAscentMealPlannerHistory';
const CALCULATOR_STORAGE_KEY = 'shadowAscentCalculatorData';

const MEAL_GOALS = [
  { id: 'lose_weight', label: '📉 Lose Weight (Calorie Deficit)', description: 'Eat less than you burn to lose fat', adjustment: -500 },
  { id: 'gain_muscle', label: '📈 Gain Muscle (Calorie Surplus)', description: 'Eat more than you burn to build mass', adjustment: 300 },
  { id: 'recomp', label: '✂️  Body Recomposition (Toned)', description: 'Lose fat and build muscle simultaneously', adjustment: -250 },
  { id: 'maintain', label: '❤️  Maintain Weight (Healthy Eating)', description: 'Eat exactly what you burn to stay the same', adjustment: 0 },
  { id: 'performance', label: '⚡ Maximize Performance (Athlete Fuel)', description: 'Optimise energy for training and recovery', adjustment: 250 },
  { id: 'gut_health', label: '🧘 Gut Health & Digestive Wellness', description: 'Focus on clean whole foods and digestion', adjustment: 0 },
  { id: 'blood_sugar', label: '🩸 Blood Sugar Control', description: 'Low glycaemic, stable energy throughout day', adjustment: -150 },
  { id: 'heart_health', label: '🫀 Heart Health', description: 'Low sodium, high fibre, omega-3 focused', adjustment: -100 },
  { id: 'hormone_balance', label: '💊 Hormone Balance', description: 'Anti-inflammatory, nutrient-dense whole foods', adjustment: 0 },
  { id: 'clean_reset', label: '🌱 Clean Eating Reset', description: 'Eliminate processed foods, refined sugar, alcohol', adjustment: -200 },
];

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
  { id: 'light', label: 'Lightly Active', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderately Active', multiplier: 1.55 },
  { id: 'active', label: 'Very Active', multiplier: 1.725 },
  { id: 'athlete', label: 'Athlete', multiplier: 1.9 },
];

const MEALS_PER_DAY_OPTIONS = [
  { id: '2', label: '2 meals', icon: '🌅🌙', description: 'Intermittent Fasting style', note: 'Large meals, long fasting window' },
  { id: '3', label: '3 meals', icon: '🌅☀️🌙', description: 'Classic breakfast, lunch, dinner', note: 'Most traditional and sustainable' },
  { id: '4', label: '4 meals', icon: '🌅🕛☀️🌙', description: '3 meals + 1 snack', note: 'Good for steady energy' },
  { id: '5', label: '5 meals', icon: '🌅🕙☀️🕓🌙', description: '3 meals + 2 snacks', note: 'Popular for muscle building' },
  { id: '6', label: '6 meals', icon: '🌅🕙☀️🕓🌆🌙', description: 'Every 2-3 hours', note: 'Traditional bodybuilder approach' },
];

const EATING_PATTERNS = [
  { id: 'omnivore', label: '🍖 Omnivore', description: 'Eat everything including meat and dairy' },
  { id: 'pescatarian', label: '🐟 Pescatarian', description: 'Fish and seafood but no other meat' },
  { id: 'vegetarian', label: '🥚 Vegetarian', description: 'No meat but includes eggs and dairy' },
  { id: 'vegan', label: '🌱 Vegan', description: 'No animal products whatsoever' },
  { id: 'carnivore', label: '🥩 Carnivore', description: 'Meat and animal products only' },
];

const DIET_APPROACHES = [
  { id: 'balanced', label: '⚖️  Balanced', description: 'Standard macro split, no restrictions' },
  { id: 'keto', label: '🥑 Keto / Low Carb', description: 'Under 50g carbs per day, high fat' },
  { id: 'mediterranean', label: '🏛️  Mediterranean', description: 'Olive oil, fish, vegetables, whole grains' },
  { id: 'paleo', label: '🦴 Paleo', description: 'Whole foods only, no grains or dairy' },
  { id: 'high_carb', label: '🍚 High Carb / Low Fat', description: 'Endurance athlete focused' },
  { id: 'high_protein', label: '🥩 High Protein', description: 'Prioritise protein above all macros' },
  { id: 'iifym', label: '🍱 IIFYM (Flexible Dieting)', description: 'Hit macros with any foods you choose' },
  { id: 'whole_food_plant', label: '🌾 Whole Foods Plant Based', description: 'Plants only, minimally processed' },
];

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readCalculatorData(profile) {
  const calculatorData = readJSON(CALCULATOR_STORAGE_KEY, {});
  const safeCalculatorData = calculatorData && typeof calculatorData === 'object' ? calculatorData : {};

  const sex = String(safeCalculatorData?.sex || profile?.sex || '').toLowerCase();
  const age = toNumber(safeCalculatorData?.age || profile?.age);
  const weightKg = toNumber(safeCalculatorData?.weightKg || profile?.weight_kg || profile?.weightKg);
  const heightCm = toNumber(safeCalculatorData?.heightCm || profile?.height_cm || profile?.heightCm);
  const activity = safeCalculatorData?.activity || '';

  return {
    sex,
    age,
    weightKg,
    heightCm,
    activity,
  };
}

function calculateGoalCalories({ sex, age, weightKg, heightCm, activity, mealGoal }) {
  if (!sex || age <= 0 || weightKg <= 0 || heightCm <= 0 || !activity) {
    return { ready: false, calories: 0, tdee: 0 };
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === 'male' ? base + 5 : base - 161;
  const activityMultiplier = ACTIVITY_OPTIONS.find((option) => option?.id === activity)?.multiplier || 0;

  if (!activityMultiplier) {
    return { ready: false, calories: 0, tdee: 0 };
  }

  const tdee = bmr * activityMultiplier;
  const goalAdjustment = MEAL_GOALS.find((goal) => goal?.id === mealGoal)?.adjustment || 0;
  const calories = Math.max(1200, Math.round(tdee + goalAdjustment));

  return { ready: true, calories, tdee: Math.round(tdee) };
}

function validateMealForm(form, calculatorReady) {
  const errors = {};

  if (!form?.mealGoal) {
    errors.mealGoal = 'Select a meal goal.';
  }

  if (!calculatorReady) {
    errors.calories = 'Complete calculators data first.';
  }

  if (!form?.calories || Number(form?.calories) < 800) {
    errors.calories = 'Calories must be at least 800.';
  }

  if (!form?.mealsPerDay || Number(form?.mealsPerDay) < 2) {
    errors.mealsPerDay = 'Pick a meals-per-day option.';
  }

  if (!form?.eatingPattern) {
    errors.eatingPattern = 'Choose an eating pattern.';
  }

  if (!form?.dietApproach) {
    errors.dietApproach = 'Choose a diet approach.';
  }

  return errors;
}

export default function MealPlanner() {
  const { user, profile, loading, error } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const owner = isOwner(user);
  const [form, setForm] = useState({
    mealGoal: 'maintain',
    activity: 'moderate',
    calories: '',
    mealsPerDay: '4',
    includeSnacks: false,
    eatingPattern: 'omnivore',
    dietApproach: 'balanced',
    allergies: '',
    prepTime: '30 minutes',
  });
  const [caloriesEdited, setCaloriesEdited] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [result, setResult] = useState('');
  const [history, setHistory] = useState(() => {
    const storedHistory = readJSON(MEAL_PLANNER_HISTORY_KEY, []);
    return Array.isArray(storedHistory) ? storedHistory : [];
  });
  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const empty = !isAIServiceConfigured();
  const hasErrors = useMemo(() => Object.keys(formErrors || {})?.length > 0, [formErrors]);

  const calculatorData = useMemo(() => readCalculatorData(profile), [profile]);
  const calorieData = useMemo(
    () =>
      calculateGoalCalories({
        sex: calculatorData?.sex,
        age: calculatorData?.age,
        weightKg: calculatorData?.weightKg,
        heightCm: calculatorData?.heightCm,
        activity: form?.activity,
        mealGoal: form?.mealGoal,
      }),
    [calculatorData?.age, calculatorData?.heightCm, calculatorData?.sex, calculatorData?.weightKg, form?.activity, form?.mealGoal],
  );

  useEffect(() => {
    if (owner && upgradeOpen) {
      setUpgradeOpen(false);
    }
  }, [owner, upgradeOpen]);

  useEffect(() => {
    if (calorieData?.ready && !caloriesEdited) {
      setForm((currentForm) => ({
        ...currentForm,
        calories: String(calorieData?.calories || ''),
      }));
    }
  }, [calorieData?.calories, calorieData?.ready, caloriesEdited]);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }));
    setLocalError('');
  }

  async function generateMealPlan(event) {
    event.preventDefault();
    const errors = validateMealForm(form, calorieData?.ready);
    setFormErrors(errors);
    setLocalError('');

    if (Object.keys(errors || {})?.length > 0 || empty) {
      return;
    }

    const usage = recordFeatureUsage('mealPlanner', user);

    if (!usage?.success) {
      if (!usage?.owner && usage?.reason === 'limit_reached') {
        setUpgradeOpen(true);
      } else {
        setLocalError(usage?.message || 'Usage could not be updated right now.');
      }
      return;
    }

    setGenerating(true);

    const selectedGoal = MEAL_GOALS.find((entry) => entry?.id === form?.mealGoal);
    const selectedMeals = MEALS_PER_DAY_OPTIONS.find((entry) => entry?.id === form?.mealsPerDay);
    const selectedPattern = EATING_PATTERNS.find((entry) => entry?.id === form?.eatingPattern);
    const selectedApproach = DIET_APPROACHES.find((entry) => entry?.id === form?.dietApproach);
    const selectedActivity = ACTIVITY_OPTIONS.find((entry) => entry?.id === form?.activity);

    const response = await callOpenAIResponse({
      instructions: 'You are a practical nutrition planner inside a fantasy RPG app. Provide general educational meal planning only, not medical advice.',
      text: `Create a one-day meal plan.
Meal goal: ${selectedGoal?.label || form?.mealGoal}
Calories target: ${form?.calories}
Meals per day: ${selectedMeals?.label || form?.mealsPerDay}
Include snacks: ${form?.includeSnacks ? 'Yes' : 'No'}
Eating pattern: ${selectedPattern?.label || form?.eatingPattern}
Diet approach: ${selectedApproach?.label || form?.dietApproach}
Activity level: ${selectedActivity?.label || form?.activity}
Allergies or exclusions: ${form?.allergies || 'none provided'}
Prep time: ${form?.prepTime || 'not specified'}
Estimated TDEE reference: ${calorieData?.tdee || 'n/a'}

Return sections: overview, meals with ingredients, protein estimate, shopping list, prep notes.`,
    });
    setGenerating(false);

    if (!response?.ok) {
      setLocalError(response?.message || 'Meal plan could not be generated.');
      return;
    }

    const entry = {
      id: `meal-plan-${Date.now()}`,
      feature: 'mealPlanner',
      input: {
        ...form,
        mealGoal: selectedGoal?.label || form?.mealGoal,
        eatingPattern: selectedPattern?.label || form?.eatingPattern,
        dietApproach: selectedApproach?.label || form?.dietApproach,
      },
      output: response?.text,
      createdAt: new Date().toISOString(),
    };
    const saved = saveAIHistory({ key: MEAL_PLANNER_HISTORY_KEY, entry, user, table: 'ai_meal_plans' });

    if (!saved?.saved) {
      setLocalError('Meal plan was generated, but could not be saved locally.');
      return;
    }

    setHistory(saved?.history);
    setResult(response?.text);
    toast?.success?.('Meal plan generated.');
  }

  return (
    <div className="w-full space-y-6">
      <Card empty={empty} emptyText="Connect Supabase to enable the secure AI service." error={error} loading={loading} subtitle="Secure AI meal planning with usage limits." title="Meal Planner" icon={ChefHat}>
        {!empty ? <UsageBanner feature="mealPlanner" title="Nutrition Forge" user={user} /> : null}
        {!empty && localError ? <div className="mt-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}
        {!empty && hasErrors ? <div className="mt-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">Fix the highlighted fields to generate a plan.</div> : null}

        {!empty ? (
          <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={generateMealPlan}>
            <div className="space-y-3 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Meal Goal</p>
              <SelectionGrid error={formErrors?.mealGoal} onSelect={(value) => updateField('mealGoal', value)} options={MEAL_GOALS} selected={form?.mealGoal} columns="sm:grid-cols-2" />
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Activity</span>
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
                onChange={(event) => updateField('activity', event?.target?.value || 'moderate')}
                value={form?.activity}
              >
                {ACTIVITY_OPTIONS?.map((activity) => (
                  <option key={activity?.id} value={activity?.id}>
                    {activity?.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <Field
                error={formErrors?.calories}
                label="Calories (Auto-calculated)"
                min="800"
                onChange={(event) => {
                  setCaloriesEdited(true);
                  updateField('calories', event?.target?.value || '');
                }}
                type="number"
                value={form?.calories}
              />
              <Button
                className="w-full"
                disabled={!calorieData?.ready}
                onClick={() => {
                  setCaloriesEdited(false);
                  updateField('calories', String(calorieData?.calories || ''));
                }}
                type="button"
                variant="ghost"
              >
                Use Auto Calories
              </Button>
            </div>

            {!calorieData?.ready ? (
              <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 lg:col-span-2">
                <p className="text-sm text-shadow-textSecondary">Complete the Health Calculators page first to auto-calculate calories from age, weight, height, sex, and activity.</p>
                <Button className="mt-3" onClick={() => navigate('/calculators')} type="button">
                  Go to Calculators
                </Button>
              </div>
            ) : null}

            <div className="space-y-3 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Meals Per Day</p>
              <SelectionGrid
                error={formErrors?.mealsPerDay}
                onSelect={(value) => updateField('mealsPerDay', value)}
                options={MEALS_PER_DAY_OPTIONS}
                selected={form?.mealsPerDay}
                columns="sm:grid-cols-2 xl:grid-cols-3"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Include Snacks?</p>
              <div className="grid max-w-sm grid-cols-2 overflow-hidden rounded-xl border border-white/10">
                <button
                  className={`px-4 py-2 text-sm font-semibold transition ${!form?.includeSnacks ? 'bg-shadow-gold text-black' : 'bg-black/20 text-shadow-textSecondary hover:text-shadow-text'}`}
                  onClick={() => updateField('includeSnacks', false)}
                  type="button"
                >
                  OFF
                </button>
                <button
                  className={`px-4 py-2 text-sm font-semibold transition ${form?.includeSnacks ? 'bg-shadow-gold text-black' : 'bg-black/20 text-shadow-textSecondary hover:text-shadow-text'}`}
                  onClick={() => updateField('includeSnacks', true)}
                  type="button"
                >
                  ON
                </button>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Eating Pattern (Pick One)</p>
              <SelectionGrid
                error={formErrors?.eatingPattern}
                onSelect={(value) => updateField('eatingPattern', value)}
                options={EATING_PATTERNS}
                selected={form?.eatingPattern}
                columns="sm:grid-cols-2"
              />
            </div>

            <div className="space-y-3 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Diet Approach (Pick One)</p>
              <SelectionGrid
                error={formErrors?.dietApproach}
                onSelect={(value) => updateField('dietApproach', value)}
                options={DIET_APPROACHES}
                selected={form?.dietApproach}
                columns="sm:grid-cols-2"
              />
            </div>

            <Field label="Allergies" onChange={(event) => updateField('allergies', event?.target?.value || '')} placeholder="Optional" value={form?.allergies} />
            <Field label="Prep Time" onChange={(event) => updateField('prepTime', event?.target?.value || '')} value={form?.prepTime} />

            <div className="lg:col-span-2">
              <Button className="w-full" loading={generating} size="lg" type="submit">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate Meal Plan
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <section className="grid gap-5 sm:grid-cols-3">
        <StatBadge icon={Utensils} label="Saved Plans" value={history?.length} />
        <StatBadge icon={ChefHat} label="Target" tone="purple" value={form?.calories || 'n/a'} />
        <StatBadge icon={Sparkles} label="Meals" value={form?.mealsPerDay} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <GeneratedOutput empty={!result} text={result} title="Generated Meal Plan" />
        <HistoryPanel history={history} title="Meal Plan History" />
      </section>

      <UpgradeModal featureName="Meal Planner" onClose={() => setUpgradeOpen(false)} open={!owner && upgradeOpen} />
    </div>
  );
}

function SelectionGrid({ options, selected, onSelect, error, columns = 'sm:grid-cols-2' }) {
  return (
    <>
      <div className={`grid gap-3 ${columns}`}>
        {options?.map((option) => {
          const isSelected = selected === option?.id;
          return (
            <button
              className={`rounded-2xl border p-4 text-left transition ${isSelected ? 'border-shadow-gold/50 bg-shadow-gold/10 shadow-goldGlow text-shadow-text' : 'border-white/10 bg-black/20 text-shadow-textSecondary hover:border-shadow-gold/30'}`}
              key={option?.id}
              onClick={() => onSelect(option?.id)}
              type="button"
            >
              <p className="font-semibold text-shadow-text">{option?.label}</p>
              {option?.icon ? <p className="mt-1 text-lg">{option?.icon}</p> : null}
              {option?.description ? <p className="mt-1 text-xs text-shadow-textMuted">{option?.description}</p> : null}
              {option?.note ? <p className="mt-1 text-xs text-shadow-textMuted">{option?.note}</p> : null}
            </button>
          );
        })}
      </div>
      {error ? <span className="mt-2 block text-sm text-shadow-red">{error}</span> : null}
    </>
  );
}
