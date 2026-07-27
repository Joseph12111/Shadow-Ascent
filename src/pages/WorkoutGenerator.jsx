import { useEffect, useMemo, useState } from 'react';
import { Brain, ChevronDown, Crown, Dumbbell, Lock, Save, Sparkles, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Modal from '../components/ui/Modal.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getUsageSnapshot, recordFeatureUsage } from '../utils/usageTracker.js';
import { isOwner } from '../utils/ownerCheck.js';
import { supabase } from '../lib/supabase.js';
import {
  buildDefaultScheduleForPlan,
  buildTodayScheduledWorkout,
  parseWorkoutPlanFromText,
  readJSON as readStoredJSON,
  REST_DAY_VALUE,
  SAVED_WORKOUT_PLANS_KEY,
  TODAY_SCHEDULED_WORKOUT_KEY,
  WEEK_DAY_SHORT_NAMES,
  WEEK_DAYS,
  WEEKLY_WORKOUT_SCHEDULE_KEY,
  writeJSON as writeStoredJSON,
} from '../utils/workoutPlanEngine.js';

const WORKOUT_AI_HISTORY_KEY = 'shadowAscentWorkoutGeneratorHistory';
const WORKOUT_HISTORY_ACTIVE_SOURCE_KEY = 'shadowAscentActiveWorkoutGeneratorHistoryId';

const WORKOUT_GOALS = [
  { id: 'lose_weight', label: '📉 Lose Weight & Burn Fat' },
  { id: 'build_muscle', label: '📈 Build Muscle & Bulk Up' },
  { id: 'toned_lean', label: '✂️  Get Toned & Lean' },
  { id: 'general_fitness', label: '❤️  General Health & Fitness' },
  { id: 'cardio', label: '🏃 Improve Cardio & Endurance' },
  { id: 'strength', label: '💪 Increase Strength & Power' },
  { id: 'mobility', label: '🤸 Improve Flexibility & Mobility' },
  { id: 'athletic', label: '⚡ Athletic Performance' },
  { id: 'mental_health', label: '🧘 Stress Relief & Mental Health' },
  { id: 'rehab', label: '🦴 Injury Recovery & Rehabilitation' },
];

const EXPERIENCE_LEVELS = [
  { id: 'complete_beginner', label: '🌱 Complete Beginner', description: 'Never trained before or returning after 1+ year break' },
  { id: 'beginner', label: '🔰 Beginner', description: 'Training for less than 6 months' },
  { id: 'intermediate', label: '📗 Intermediate', description: 'Training consistently for 6 months to 2 years' },
  { id: 'advanced', label: '📘 Advanced', description: 'Training consistently for 2 to 5 years' },
  { id: 'elite', label: '💎 Elite', description: 'Competitive athlete or 5+ years serious training' },
];

const DAYS_PER_WEEK_OPTIONS = [
  { id: '1', label: '1 day', description: 'Minimal (just getting started)' },
  { id: '2', label: '2 days', description: 'Light (busy schedule)' },
  { id: '3', label: '3 days', description: 'Moderate (most recommended for beginners)' },
  { id: '4', label: '4 days', description: 'Active (intermediate sweet spot)' },
  { id: '5', label: '5 days', description: 'Dedicated (advanced training)' },
  { id: '6', label: '6 days', description: 'Intense (serious athlete)' },
  { id: '7', label: '7 days', description: 'Every day (include active recovery days)' },
];

const LIMITATION_GROUPS = [
  {
    id: 'upperBody',
    title: 'Upper Body',
    options: [
      '🦴 Shoulder injury or pain',
      '💪 Rotator cuff issues',
      '🤝 Wrist pain or carpal tunnel',
      "🦾 Elbow pain (tennis/golfer's elbow)",
      '🔙 Upper back pain',
      '🦒 Neck pain or stiffness',
    ],
  },
  {
    id: 'lowerBody',
    title: 'Lower Body',
    options: [
      '🦵 Knee pain or injury',
      '🦶 Ankle injury or weakness',
      '🍑 Hip pain or tightness',
      '🦴 Lower back pain (most common)',
      '🦿 ACL or meniscus issues',
      '👣 Plantar fasciitis (foot pain)',
    ],
  },
  {
    id: 'healthConditions',
    title: 'Health Conditions',
    options: [
      '❤️  Heart condition',
      '🫁 Asthma or breathing issues',
      '🩸 High blood pressure',
      '💉 Diabetes (Type 1 or 2)',
      '⚖️  Obesity (BMI over 30)',
      '🤰 Pregnancy or postpartum',
      '🦴 Osteoporosis or bone density issues',
      '🧠 Epilepsy or seizure disorder',
    ],
  },
  {
    id: 'equipmentEnvironment',
    title: 'Equipment & Environment',
    options: [
      '🚫 No jumping (downstairs, joint issues)',
      '🔇 No loud exercises (apartment, noise restriction)',
      '🪑 Seated exercises only (mobility limitation)',
      '🌍 Limited space (small room)',
    ],
  },
];

const SESSION_MINUTE_OPTIONS = [
  { id: '10', label: '10 minutes', description: 'Quick reset or mobility work' },
  { id: '20', label: '20 minutes', description: 'Short focused session' },
  { id: '30', label: '30 minutes', description: 'Efficient daily workout' },
  { id: '45', label: '45 minutes', description: 'Balanced training session' },
  { id: '60', label: '60 minutes', description: 'Full workout block' },
  { id: '75', label: '75 minutes', description: 'Extended strength session' },
  { id: '90', label: '90 minutes', description: 'Advanced training block' },
];

const WORKOUT_FORM_STEPS = [
  'goal',
  'experience',
  'daysPerWeek',
  'sessionMinutes',
  'upperBody',
  'lowerBody',
  'healthConditions',
  'equipmentEnvironment',
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

function getOpenAIConfig() {
  return {
    apiKey: import.meta.env?.VITE_OPENAI_API_KEY || '',
    baseUrl: import.meta.env?.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: import.meta.env?.VITE_OPENAI_MODEL || 'gpt-5.5',
  };
}

function extractResponseText(data) {
  if (data?.output_text) {
    return data?.output_text;
  }

  const parts = data?.output
    ?.flatMap((item) => item?.content || [])
    ?.map((content) => content?.text || content?.value || '')
    ?.filter(Boolean);

  return parts?.join('\n\n') || '';
}

export async function callOpenAIResponse({ instructions, text, imageDataUrl }) {
  const config = getOpenAIConfig();

  if (!config?.apiKey) {
    return {
      ok: false,
      text: '',
      message: 'AI tools are not configured yet.',
    };
  }

  const content = [{ type: 'input_text', text }];

  if (imageDataUrl) {
    content.push({ type: 'input_image', image_url: imageDataUrl });
  }

  try {
    const response = await fetch(`${config?.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config?.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config?.model,
        instructions,
        input: [
          {
            role: 'user',
            content,
          },
        ],
      }),
    });

    if (!response?.ok) {
      return {
        ok: false,
        text: '',
        message: 'The AI forge could not complete that request.',
      };
    }

    const data = await response.json();
    const outputText = extractResponseText(data);

    if (!outputText?.trim()) {
      return {
        ok: false,
        text: '',
        message: 'The AI forge returned an empty result.',
      };
    }

    return {
      ok: true,
      text: outputText?.trim(),
      message: '',
    };
  } catch {
    return {
      ok: false,
      text: '',
      message: 'The AI forge is unreachable right now.',
    };
  }
}

export function saveAIHistory({ key, entry, user, table }) {
  const history = readJSON(key, []);
  const nextHistory = [entry, ...(Array.isArray(history) ? history : [])].slice(0, 40);
  const saved = writeJSON(key, nextHistory);

  if (saved && user?.id && supabase && table) {
    try {
      supabase
        .from(table)
        .upsert({ ...entry, user_id: user?.id }, { onConflict: 'id' })
        .then(() => undefined)
        .catch(() => undefined);
    } catch {
      return { saved, history: nextHistory };
    }
  }

  return { saved, history: nextHistory };
}

export function UpgradeModal({ open, onClose, featureName }) {
  return (
    <Modal description="The free daily limit has been reached for this tool." onClose={onClose} open={open} title="Upgrade Required">
      <div className="space-y-4">
        <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-shadow-gold" aria-hidden="true" />
            <p className="font-heading text-lg font-bold text-shadow-gold">{featureName}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">
            You have used today free allowance. Owner accounts bypass this gate automatically.
          </p>
        </div>
        <Button className="w-full" onClick={onClose}>
          Continue Training
        </Button>
      </div>
    </Modal>
  );
}

export function UsageBanner({ feature, user, title }) {
  const usage = getUsageSnapshot(user)?.[feature];
  const owner = isOwner(user);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4">
      <div>
        <p className="font-heading text-lg font-bold text-shadow-gold">{title}</p>
        <p className="text-sm text-shadow-textSecondary">
          {owner ? 'Owner access: unlimited generations.' : `${usage?.remaining ?? 0} of ${usage?.limit ?? 0} free uses remaining today.`}
        </p>
      </div>
      {owner ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-shadow-gold/30 bg-shadow-gold/10 px-3 py-1 text-xs font-semibold text-shadow-gold">
          <Crown className="h-4 w-4" aria-hidden="true" />
          Owner
        </span>
      ) : (
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-shadow-textSecondary">
          {usage?.used || 0}/{usage?.limit || 0}
        </span>
      )}
    </div>
  );
}

function validateWorkoutForm(form) {
  const errors = {};

  if (!form?.goal) {
    errors.goal = 'Choose a training goal.';
  }

  if (!form?.experience) {
    errors.experience = 'Choose your experience level.';
  }

  if (!form?.daysPerWeek) {
    errors.daysPerWeek = 'Training days must be at least 1.';
  }

  if (!form?.sessionMinutes || Number(form?.sessionMinutes) < 10) {
    errors.sessionMinutes = 'Sessions must be at least 10 minutes.';
  }

  return errors;
}

function normalizeScheduleAssignments(assignments) {
  const source = assignments && typeof assignments === 'object' ? assignments : {};
  const normalized = {};
  WEEK_DAYS.forEach((dayName) => {
    const value = source?.[dayName];
    if (!value || value === REST_DAY_VALUE) {
      normalized[dayName] = REST_DAY_VALUE;
      return;
    }
    const safeValue = String(value);
    normalized[dayName] = safeValue.startsWith('id:') || safeValue.startsWith('name:') ? safeValue : `id:${safeValue}`;
  });
  return normalized;
}

function formatWorkoutDayLabels(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const match = String(line || '').match(/^(\s*(?:#{1,6}\s*)?)(?!(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*[-–—]\s*)Day\s*([1-7])(\b.*)$/i);
      const dayNumber = match?.[2] ? Number(match?.[2]) : 0;
      const weekday = dayNumber > 0 ? WEEK_DAY_SHORT_NAMES?.[dayNumber - 1] : '';

      if (!match?.[0] || !weekday) {
        return line;
      }

      return `${match?.[1] || ''}${weekday} - Day ${dayNumber}${match?.[3] || ''}`;
    })
    .join('\n');
}

export default function WorkoutGenerator() {
  const { user, profile, loading, error } = useAuth();
  const toast = useToast();
  const owner = isOwner(user);
  const [form, setForm] = useState({
    goal: 'general_fitness',
    experience: 'intermediate',
    daysPerWeek: '3',
    sessionMinutes: '45',
    equipment: '',
    selectedLimitations: [],
    limitationNotes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [result, setResult] = useState('');
  const [history, setHistory] = useState(() => {
    const storedHistory = readJSON(WORKOUT_AI_HISTORY_KEY, []);
    return Array.isArray(storedHistory) ? storedHistory : [];
  });
  const [savedPlans, setSavedPlans] = useState(() => {
    const storedPlans = readStoredJSON(SAVED_WORKOUT_PLANS_KEY, []);
    return Array.isArray(storedPlans) ? storedPlans : [];
  });
  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    const storedSchedule = readStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, null);
    return typeof storedSchedule?.planId === 'string' ? storedSchedule?.planId : '';
  });
  const [scheduleAssignments, setScheduleAssignments] = useState(() => {
    const storedSchedule = readStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, null);
    return storedSchedule?.assignments && typeof storedSchedule?.assignments === 'object' ? normalizeScheduleAssignments(storedSchedule?.assignments) : {};
  });
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState({});
  const [usedHistoryId, setUsedHistoryId] = useState(() => {
    const storedUsedId = readStoredJSON(WORKOUT_HISTORY_ACTIVE_SOURCE_KEY, '');
    return typeof storedUsedId === 'string' ? storedUsedId : '';
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activeFormStep, setActiveFormStep] = useState('goal');
  const empty = !getOpenAIConfig()?.apiKey;
  const hasErrors = useMemo(() => Object.keys(formErrors || {})?.length > 0, [formErrors]);
  const activePlan = useMemo(() => {
    if (!savedPlans?.length || !selectedPlanId) {
      return null;
    }
    return savedPlans.find((plan) => plan?.id === selectedPlanId) || null;
  }, [savedPlans, selectedPlanId]);
  const usedHistoryEntry = useMemo(() => history.find((entry) => entry?.id === usedHistoryId) || null, [history, usedHistoryId]);
  const usedHistorySplits = useMemo(() => {
    if (!usedHistoryEntry?.output) {
      return [];
    }
    const parsed = parseWorkoutPlanFromText(usedHistoryEntry?.output, usedHistoryEntry?.input?.sessionMinutes);
    return Array.isArray(parsed?.splits) ? parsed?.splits : [];
  }, [usedHistoryEntry]);
  const splitCatalog = useMemo(() => {
    const catalog = {};

    const addSplits = (splits, prefix) => {
      (Array.isArray(splits) ? splits : []).forEach((split, index) => {
        const splitName = String(split?.name || '').trim();
        if (!splitName) {
          return;
        }
        const byId = split?.id ? `id:${split?.id}` : '';
        const byName = `name:${splitName.toLowerCase()}`;
        const key = byId || `${prefix}:${index}:${byName}`;
        if (!catalog?.[key]) {
          catalog[key] = { ...split, name: splitName };
        }
        if (!catalog?.[byName]) {
          catalog[byName] = { ...split, name: splitName };
        }
      });
    };

    addSplits(usedHistorySplits, 'used');
    addSplits(activePlan?.splits, 'active');
    (Array.isArray(savedPlans) ? savedPlans : []).forEach((plan) => addSplits(plan?.splits, plan?.id || 'saved'));
    return catalog;
  }, [activePlan?.splits, savedPlans, usedHistorySplits]);
  const scheduleOptions = useMemo(() => {
    const options = [{ value: REST_DAY_VALUE, label: 'Rest Day' }];
    const seen = new Set([REST_DAY_VALUE]);

    const addOptions = (splits, prefix) => {
      (Array.isArray(splits) ? splits : []).forEach((split) => {
        const splitName = String(split?.name || '').trim();
        if (!splitName) {
          return;
        }
        const key = splitName.toLowerCase();
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        options.push({
          value: split?.id ? `id:${split?.id}` : `name:${key}`,
          label: splitName,
        });
      });
    };

    // 1) Prioritize the currently USED history plan splits
    addOptions(usedHistorySplits, 'used');
    // 2) Then active plan splits
    addOptions(activePlan?.splits, 'active');
    // 3) Keep additional suggestions from all saved plans
    (Array.isArray(savedPlans) ? savedPlans : []).forEach((plan) => addOptions(plan?.splits, plan?.id || 'saved'));

    return options;
  }, [activePlan?.splits, savedPlans, usedHistorySplits]);

  useEffect(() => {
    if (owner && upgradeOpen) {
      setUpgradeOpen(false);
    }
  }, [owner, upgradeOpen]);

  useEffect(() => {
    if (!savedPlans?.length) {
      return;
    }

    if (selectedPlanId && !savedPlans.some((plan) => plan?.id === selectedPlanId)) {
      setSelectedPlanId(savedPlans?.[0]?.id || '');
    }
  }, [savedPlans, selectedPlanId]);

  useEffect(() => {
    if (!activePlan?.splits?.length) {
      return;
    }

    const hasAnyDaySet = WEEK_DAYS.some((day) => Boolean(scheduleAssignments?.[day]));
    if (!hasAnyDaySet) {
      setScheduleAssignments(normalizeScheduleAssignments(buildDefaultScheduleForPlan(activePlan)));
    }
  }, [activePlan, scheduleAssignments]);

  useEffect(() => {
    if (!activePlan?.splits?.length) {
      return;
    }

    const optionValues = new Set((scheduleOptions || []).map((option) => option?.value));
    const values = WEEK_DAYS.map((dayName) => scheduleAssignments?.[dayName]).filter(Boolean);
    if (!values?.length) {
      return;
    }

    const nonRestValues = values.filter((value) => value !== REST_DAY_VALUE);
    if (!nonRestValues?.length) {
      return;
    }

    const validCount = nonRestValues.filter((value) => optionValues.has(value)).length;
    const invalidCount = nonRestValues.length - validCount;

    if (invalidCount > 0 && validCount === 0) {
      setScheduleAssignments(normalizeScheduleAssignments(buildDefaultScheduleForPlan(activePlan)));
    }
  }, [activePlan, scheduleAssignments, scheduleOptions]);

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

  function moveToNextFormStep(stepId) {
    const currentIndex = WORKOUT_FORM_STEPS.findIndex((entry) => entry === stepId);
    const nextStep = currentIndex >= 0 ? WORKOUT_FORM_STEPS?.[currentIndex + 1] : '';
    setActiveFormStep(nextStep || '');
  }

  function selectFormOption(field, value, stepId) {
    updateField(field, value);
    moveToNextFormStep(stepId);
  }

  function toggleLimitation(optionLabel) {
    setForm((currentForm) => {
      const selected = Array.isArray(currentForm?.selectedLimitations) ? currentForm?.selectedLimitations : [];
      const exists = selected.some((entry) => entry === optionLabel);
      return {
        ...currentForm,
        selectedLimitations: exists ? selected.filter((entry) => entry !== optionLabel) : [...selected, optionLabel],
      };
    });
    setLocalError('');
  }

  function selectLimitationOption(optionLabel, stepId) {
    toggleLimitation(optionLabel);
    moveToNextFormStep(stepId);
  }

  function saveGeneratedWorkoutPlan() {
    if (!result?.trim()) {
      setLocalError('Generate a workout plan first.');
      return;
    }

    const fullOutput = formatWorkoutDayLabels(result);
    const existingEntry = history.find((entry) => entry?.output === fullOutput);

    if (existingEntry?.id) {
      setExpandedHistory((current) => ({
        ...(current || {}),
        [existingEntry?.id]: true,
      }));
      setResult(fullOutput);
      setLocalError('');
      toast?.success?.('Workout plan is already saved in history.');
      return;
    }

    const entry = {
      id: `workout-ai-${Date.now()}`,
      feature: 'workoutGenerator',
      input: form,
      output: fullOutput,
      createdAt: new Date().toISOString(),
    };
    const saved = saveAIHistory({ key: WORKOUT_AI_HISTORY_KEY, entry, user, table: 'ai_workout_generations' });

    if (!saved?.saved) {
      setLocalError('Workout plan could not be saved locally.');
      return;
    }

    setResult(fullOutput);
    setHistory(saved?.history);
    setExpandedHistory((current) => ({
      ...(current || {}),
      [entry?.id]: true,
    }));
    setLocalError('');
    toast?.success?.('Workout plan saved to history.');
  }

  function createPlanFromHistoryEntry(entry) {
    const parsed = parseWorkoutPlanFromText(entry?.output || '', entry?.input?.sessionMinutes);
    if (!parsed?.splits?.length) {
      return null;
    }

    return {
      id: `saved-plan-${Date.now()}-${entry?.id || 'history'}`,
      createdAt: new Date().toISOString(),
      title: `Plan ${new Date(entry?.createdAt || Date.now()).toLocaleDateString('en-GB')}`,
      sourceText: entry?.output || '',
      estimatedMinutes: Number(entry?.input?.sessionMinutes || parsed?.estimatedMinutes || 45),
      originHistoryId: entry?.id || '',
      splits: parsed?.splits,
    };
  }

  function useHistoryPlan(entry) {
    if (!entry?.id) {
      return;
    }

    let nextPlans = Array.isArray(savedPlans) ? [...savedPlans] : [];
    let linkedPlan = nextPlans.find((plan) => plan?.originHistoryId === entry?.id);
    const refreshedPlan = createPlanFromHistoryEntry(entry);

    if (!refreshedPlan) {
      setLocalError('This generated result does not contain usable workout splits.');
      return;
    }

    if (linkedPlan) {
      linkedPlan = {
        ...linkedPlan,
        sourceText: refreshedPlan?.sourceText,
        estimatedMinutes: refreshedPlan?.estimatedMinutes,
        splits: refreshedPlan?.splits,
        updatedAt: new Date().toISOString(),
      };
      nextPlans = nextPlans.map((plan) => (plan?.id === linkedPlan?.id ? linkedPlan : plan));
    } else {
      linkedPlan = refreshedPlan;
      nextPlans = [linkedPlan, ...nextPlans].slice(0, 30);
    }

    const planSaved = writeStoredJSON(SAVED_WORKOUT_PLANS_KEY, nextPlans);
    if (!planSaved) {
      setLocalError('Could not activate this plan right now.');
      return;
    }
    setSavedPlans(nextPlans);

    const assignments = normalizeScheduleAssignments(buildDefaultScheduleForPlan(linkedPlan));
    const payload = {
      planId: linkedPlan?.id,
      assignments,
      updatedAt: new Date().toISOString(),
    };

    const scheduleSaved = writeStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, payload);
    if (!scheduleSaved) {
      setLocalError('Could not update weekly schedule right now.');
      return;
    }

    const todayScheduledWorkout = buildTodayScheduledWorkout({
      plan: linkedPlan,
      schedule: assignments,
      dateValue: new Date(),
    });
    writeStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, todayScheduledWorkout);
    writeStoredJSON(WORKOUT_HISTORY_ACTIVE_SOURCE_KEY, entry?.id);
    setSelectedPlanId(linkedPlan?.id);
    setScheduleAssignments(assignments);
    setUsedHistoryId(entry?.id);
    setLocalError('');
    try {
      globalThis?.dispatchEvent?.(new CustomEvent('workoutScheduleUpdated', { detail: { schedule: payload, todayScheduledWorkout } }));
    } catch {
      undefined;
    }
    toast?.success?.('Plan is now in use for today schedule.');
  }

  function unuseHistoryPlan(entry) {
    if (!entry?.id) {
      return;
    }
    if (usedHistoryId !== entry?.id) {
      return;
    }

    writeStoredJSON(WORKOUT_HISTORY_ACTIVE_SOURCE_KEY, '');
    writeStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, null);
    writeStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, null);
    setUsedHistoryId('');
    setSelectedPlanId('');
    setScheduleAssignments({});
    setLocalError('');
    try {
      globalThis?.dispatchEvent?.(new CustomEvent('workoutScheduleUpdated', { detail: { schedule: null, todayScheduledWorkout: null } }));
    } catch {
      undefined;
    }
    toast?.success?.('Plan removed from active schedule.');
  }

  function updateSchedule(dayName, splitId) {
    setScheduleAssignments((current) => ({
      ...(current || {}),
      [dayName]: splitId || REST_DAY_VALUE,
    }));
  }

  function saveSchedule() {
    if (!activePlan?.id) {
      setLocalError('Save a plan first.');
      return;
    }

    const fullAssignments = normalizeScheduleAssignments(scheduleAssignments);
    const hasAllDays = WEEK_DAYS.every((dayName) => Boolean(fullAssignments?.[dayName]));

    if (!hasAllDays) {
      setLocalError('Every weekday needs a schedule assignment.');
      return;
    }

    const payload = {
      planId: activePlan?.id,
      assignments: fullAssignments,
      updatedAt: new Date().toISOString(),
    };
    const scheduleSaved = writeStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, payload);

    if (!scheduleSaved) {
      setLocalError('Schedule could not be saved locally.');
      return;
    }

    const todayDate = new Date();
    const todayDayName = todayDate.toLocaleDateString('en-GB', { weekday: 'long' });
    const todaySelection = fullAssignments?.[todayDayName];
    let todayScheduledWorkout = null;

    if (todaySelection && todaySelection !== REST_DAY_VALUE) {
      const selectedSplit = splitCatalog?.[todaySelection] || null;
      if (selectedSplit?.name) {
        todayScheduledWorkout = {
          id: `today-${activePlan?.id}-${selectedSplit?.id || todaySelection}-${todayDate.toISOString().slice(0, 10)}`,
          dateKey: todayDate.toISOString().slice(0, 10),
          dayName: todayDayName,
          planId: activePlan?.id,
          splitId: selectedSplit?.id || todaySelection,
          splitName: selectedSplit?.name,
          title: selectedSplit?.name,
          isRest: Boolean(selectedSplit?.isRest),
          exercises: selectedSplit?.exercises || [],
          source: 'generator_plan',
        };
      }
    }

    if (!todayScheduledWorkout) {
      todayScheduledWorkout = buildTodayScheduledWorkout({
        plan: activePlan,
        schedule: fullAssignments,
        dateValue: todayDate,
      });
    }
    writeStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, todayScheduledWorkout);
    setScheduleAssignments(fullAssignments);
    try {
      globalThis?.dispatchEvent?.(new CustomEvent('workoutScheduleUpdated', { detail: { schedule: payload, todayScheduledWorkout } }));
    } catch {
      undefined;
    }
    toast?.success?.('Weekly workout schedule saved.');
  }

  function toggleHistoryExpanded(id) {
    setExpandedHistory((current) => ({
      ...(current || {}),
      [id]: !current?.[id],
    }));
  }

  function expandAllHistory() {
    const nextExpanded = {};
    history?.forEach((entry) => {
      nextExpanded[entry?.id] = true;
    });
    setExpandedHistory(nextExpanded);
  }

  function collapseAllHistory() {
    const nextExpanded = {};
    history?.forEach((entry) => {
      nextExpanded[entry?.id] = false;
    });
    setExpandedHistory(nextExpanded);
  }

  function confirmDeleteHistory() {
    if (!deleteTarget?.id) {
      setDeleteTarget(null);
      return;
    }

    const nextHistory = history.filter((entry) => entry?.id !== deleteTarget?.id);
    const saved = writeJSON(WORKOUT_AI_HISTORY_KEY, nextHistory);
    if (!saved) {
      setLocalError('History entry could not be removed locally.');
      return;
    }

    setHistory(nextHistory);
    if (usedHistoryId === deleteTarget?.id) {
      writeStoredJSON(WORKOUT_HISTORY_ACTIVE_SOURCE_KEY, '');
      writeStoredJSON(TODAY_SCHEDULED_WORKOUT_KEY, null);
      writeStoredJSON(WEEKLY_WORKOUT_SCHEDULE_KEY, null);
      setUsedHistoryId('');
    }
    setDeleteTarget(null);
    toast?.success?.('Plan deleted from history.');
  }

  async function generateWorkout(event) {
    event.preventDefault();
    const errors = validateWorkoutForm(form);
    setFormErrors(errors);
    setLocalError('');

    if (Object.keys(errors || {})?.length > 0 || empty) {
      return;
    }

    const usage = recordFeatureUsage('workoutGenerator', user);

    if (!usage?.success) {
      if (!usage?.owner && usage?.reason === 'limit_reached') {
        setUpgradeOpen(true);
      } else {
        setLocalError(usage?.message || 'Usage could not be updated right now.');
      }
      return;
    }

    setGenerating(true);
    const selectedGoal = WORKOUT_GOALS.find((goal) => goal?.id === form?.goal)?.label || form?.goal;
    const selectedExperience = EXPERIENCE_LEVELS.find((level) => level?.id === form?.experience)?.label || form?.experience;
    const selectedDays = DAYS_PER_WEEK_OPTIONS.find((entry) => entry?.id === form?.daysPerWeek);
    const selectedLimitations = Array.isArray(form?.selectedLimitations) ? form?.selectedLimitations : [];
    const limitationSummary = selectedLimitations?.length ? selectedLimitations.join('; ') : 'none selected';
    const prompt = `Create a safe, progressive workout plan for Shadow Ascent.
Goal: ${selectedGoal}
Experience: ${selectedExperience}
Days per week: ${selectedDays?.label || form?.daysPerWeek} (${selectedDays?.description || 'custom schedule'})
Session length: ${form?.sessionMinutes} minutes
Equipment: ${form?.equipment || 'bodyweight only'}
Limitations selected: ${limitationSummary}
Additional limitation notes: ${form?.limitationNotes || 'none provided'}

Return complete sections: weekly split, warmup, day-by-day workout, progression rules, recovery notes.
Use weekday labels exactly like Mon - Day 1, Tue - Day 2, Wed - Day 3, Thu - Day 4, Fri - Day 5, Sat - Day 6, Sun - Day 7 wherever day headings appear.
Do not omit exercise details, coaching notes, progression rules, or recovery notes.`;
    const response = await callOpenAIResponse({
      instructions: 'You are a careful fitness coach inside a fantasy RPG app. Provide practical text only, no markdown tables, no medical diagnosis.',
      text: prompt,
    });
    setGenerating(false);

    if (!response?.ok) {
      setLocalError(response?.message || 'Workout could not be generated.');
      return;
    }

    setResult(formatWorkoutDayLabels(response?.text));
    toast?.success?.('Workout plan generated. Save it to history when ready.');
  }

  return (
    <div className="min-w-0 w-full overflow-x-hidden space-y-6">
      <Card empty={empty} emptyText="Add VITE_OPENAI_API_KEY to enable the workout generator." error={error} loading={loading} subtitle="Responses API text generation only." title="Workout Generator" icon={Dumbbell}>
        {!empty ? <UsageBanner feature="workoutGenerator" title="AI Training Forge" user={user} /> : null}
        {!empty && localError ? <div className="mt-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}
        {!empty && hasErrors ? <div className="mt-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">Fix the highlighted fields to generate a plan.</div> : null}

        {!empty ? (
          <form className="mt-6 space-y-4" onSubmit={generateWorkout}>
            <StepDropdown
              error={formErrors?.goal}
              isOpen={activeFormStep === 'goal'}
              onToggle={() => setActiveFormStep(activeFormStep === 'goal' ? '' : 'goal')}
              options={WORKOUT_GOALS}
              selected={form?.goal}
              stepNumber="01"
              title="Goals (Primary Goal)"
              onSelect={(value) => selectFormOption('goal', value, 'goal')}
            />

            <StepDropdown
              error={formErrors?.experience}
              isOpen={activeFormStep === 'experience'}
              onToggle={() => setActiveFormStep(activeFormStep === 'experience' ? '' : 'experience')}
              options={EXPERIENCE_LEVELS}
              selected={form?.experience}
              stepNumber="02"
              title="Experience Level"
              onSelect={(value) => selectFormOption('experience', value, 'experience')}
            />

            <StepDropdown
              error={formErrors?.daysPerWeek}
              isOpen={activeFormStep === 'daysPerWeek'}
              onToggle={() => setActiveFormStep(activeFormStep === 'daysPerWeek' ? '' : 'daysPerWeek')}
              options={DAYS_PER_WEEK_OPTIONS}
              selected={form?.daysPerWeek}
              stepNumber="03"
              title="Days Per Week"
              onSelect={(value) => selectFormOption('daysPerWeek', value, 'daysPerWeek')}
            />

            <StepDropdown
              error={formErrors?.sessionMinutes}
              isOpen={activeFormStep === 'sessionMinutes'}
              onToggle={() => setActiveFormStep(activeFormStep === 'sessionMinutes' ? '' : 'sessionMinutes')}
              options={SESSION_MINUTE_OPTIONS}
              selected={form?.sessionMinutes}
              stepNumber="04"
              title="Session Minutes"
              onSelect={(value) => selectFormOption('sessionMinutes', value, 'sessionMinutes')}
            />

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Limitations (Injuries & Health Conditions)</p>
                <p className="mt-1 text-sm text-shadow-textSecondary">Pick any that apply. Each choice moves you to the next section.</p>
              </div>

              {LIMITATION_GROUPS.map((group, index) => (
                <StepDropdown
                  allowNone
                  isMulti
                  isOpen={activeFormStep === group?.id}
                  key={group?.id}
                  noneLabel={`No ${String(group?.title || '').toLowerCase()} limitation`}
                  onNone={() => moveToNextFormStep(group?.id)}
                  onToggle={() => setActiveFormStep(activeFormStep === group?.id ? '' : group?.id)}
                  options={group?.options?.map((option) => ({ id: option, label: option }))}
                  selectedValues={form?.selectedLimitations}
                  stepNumber={`0${index + 5}`}
                  title={group?.title}
                  onSelect={(value) => selectLimitationOption(value, group?.id)}
                />
              ))}

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Additional Limitation Notes</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
                  onChange={(event) => updateField('limitationNotes', event?.target?.value || '')}
                  placeholder="Optional notes for injuries, mobility, medical clearance, equipment access, or custom equipment."
                  value={form?.limitationNotes}
                />
              </label>

              <Field label="Equipment You Have" onChange={(event) => updateField('equipment', event?.target?.value || '')} placeholder="Optional: dumbbells, bands, pull-up bar, bodyweight only..." value={form?.equipment} />
            </div>

            <div>
              <Button className="w-full" loading={generating} size="lg" type="submit">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate Workout
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 space-y-5">
          <GeneratedOutput empty={!result} text={result} title="Generated Workout" />
          <div className="flex min-w-0 flex-wrap gap-3">
            <Button className="max-w-full whitespace-normal text-center" disabled={!result?.trim()} onClick={saveGeneratedWorkoutPlan} variant="secondary">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Workout Plan
            </Button>
          </div>

          {activePlan?.id ? (
            <Card title="Set Your Weekly Schedule" subtitle="Assign each generated split to a day of the week.">
              <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="block min-w-0 w-full sm:max-w-xs">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Saved Plan</span>
                  <select
                    className="mt-2 min-h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
                    onChange={(event) => setSelectedPlanId(event?.target?.value || '')}
                    value={activePlan?.id || ''}
                  >
                    {savedPlans?.map((plan) => (
                      <option key={plan?.id} value={plan?.id}>
                        {plan?.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Button className="w-full sm:w-auto" onClick={() => setScheduleOpen((current) => !current)} type="button" variant="ghost">
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${scheduleOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  {scheduleOpen ? 'Hide' : 'Show All'}
                </Button>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${scheduleOpen ? 'max-h-[1400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-3">
                  {WEEK_DAYS?.map((dayName) => (
                    <label className="grid min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[140px_minmax(0,1fr)]" key={dayName}>
                      <span className="font-semibold text-shadow-text">{dayName}</span>
                      <select
                        className="min-h-11 min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
                        onChange={(event) => updateSchedule(dayName, event?.target?.value || REST_DAY_VALUE)}
                        value={scheduleAssignments?.[dayName] || REST_DAY_VALUE}
                      >
                        {scheduleOptions?.map((option) => (
                          <option key={option?.value} value={option?.value}>
                            {option?.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <Button onClick={saveSchedule}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Save Schedule
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <WorkoutGeneratorHistoryPanel
          collapsedTitle="Show All"
          expandedHistory={expandedHistory}
          history={history}
          isUsed={(entryId) => usedHistoryId === entryId}
          onCollapseAll={collapseAllHistory}
          onDelete={setDeleteTarget}
          onExpandAll={expandAllHistory}
          onToggle={toggleHistoryExpanded}
          onUnuse={unuseHistoryPlan}
          onUse={useHistoryPlan}
          title="Workout History"
        />
      </section>

      <UpgradeModal featureName="Workout Generator" onClose={() => setUpgradeOpen(false)} open={!owner && upgradeOpen} />
      <Modal description="Delete this plan? This cannot be undone." onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)} title="Delete Plan">
        <div className="flex justify-end gap-3">
          <Button onClick={() => setDeleteTarget(null)} variant="ghost">
            Cancel
          </Button>
          <Button onClick={confirmDeleteHistory} variant="danger">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function WorkoutGeneratorHistoryPanel({
  title,
  history,
  expandedHistory,
  isUsed,
  onToggle,
  onExpandAll,
  onCollapseAll,
  onDelete,
  onUse,
  onUnuse,
  collapsedTitle,
}) {
  return (
    <Card empty={!history?.length} emptyText="No saved generations yet." title={title}>
      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        <Button className="max-w-full whitespace-normal text-center" onClick={onExpandAll} type="button" variant="ghost">
          Expand All
        </Button>
        <Button className="max-w-full whitespace-normal text-center" onClick={onCollapseAll} type="button" variant="ghost">
          Collapse All
        </Button>
      </div>

      <div className="min-w-0 space-y-3">
        {history?.map((entry) => {
          const expanded = Boolean(expandedHistory?.[entry?.id]);
          const used = Boolean(isUsed?.(entry?.id));
          const preview = entry?.output?.slice(0, 180) || '';
          return (
            <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={entry?.id}>
              <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-heading text-lg font-bold text-shadow-gold">{entry?.input?.goal || 'AI Result'}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-shadow-textMuted">{entry?.createdAt?.slice(0, 10)}</p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {used ? (
                    <Button className="max-w-full whitespace-normal text-center" onClick={() => onUnuse?.(entry)} type="button" variant="ghost">
                      UNUSE
                    </Button>
                  ) : (
                    <Button className="max-w-full whitespace-normal text-center" onClick={() => onUse?.(entry)} type="button" variant="secondary">
                      USE
                    </Button>
                  )}
                  <Button className="max-w-full whitespace-normal text-center" onClick={() => onDelete(entry)} type="button" variant="danger">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </div>

              {!expanded ? <p className="mb-3 break-words text-sm leading-6 text-shadow-textSecondary">{preview}{entry?.output?.length > 180 ? '...' : ''}</p> : null}

              <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="min-h-0 overflow-hidden">
                  <p className="max-w-full whitespace-pre-wrap break-words text-sm leading-6 text-shadow-textSecondary [overflow-wrap:anywhere]">{entry?.output}</p>
                </div>
              </div>

              <div className="mt-3">
                <button className="inline-flex items-center gap-2 text-sm font-semibold text-shadow-purpleLight transition hover:text-shadow-gold" onClick={() => onToggle(entry?.id)} type="button">
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  {expanded ? 'Hide' : collapsedTitle}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}

function StepDropdown({
  title,
  stepNumber,
  options,
  selected,
  selectedValues,
  isOpen,
  isMulti = false,
  allowNone = false,
  noneLabel = 'None',
  error,
  onToggle,
  onSelect,
  onNone,
}) {
  const selectedList = Array.isArray(selectedValues) ? selectedValues : [];
  const selectedOption = (Array.isArray(options) ? options : []).find((option) => option?.id === selected);
  const selectedCount = (Array.isArray(options) ? options : []).filter((option) => selectedList.some((entry) => entry === option?.id)).length;
  const summary = isMulti
    ? selectedCount > 0
      ? `${selectedCount} selected`
      : 'No limitations selected'
    : selectedOption?.label || 'Choose an option';

  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border bg-black/20 transition ${isOpen ? 'border-shadow-gold/40 shadow-goldGlow' : 'border-white/10 hover:border-shadow-purple/40'} ${error ? 'border-shadow-red/50' : ''}`}>
      <button className="flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left" onClick={onToggle} type="button">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-shadow-gold/30 bg-shadow-gold/10 text-xs font-bold text-shadow-gold">
            {stepNumber}
          </span>
          <span className="min-w-0">
            <span className="block font-heading text-lg font-bold text-shadow-gold">{title}</span>
            <span className="mt-1 block truncate text-sm text-shadow-textSecondary">{summary}</span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-shadow-purpleLight transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="grid min-w-0 gap-2 border-t border-white/10 p-4 sm:grid-cols-2">
          {allowNone ? (
            <button
              className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-sm font-semibold text-shadow-textSecondary transition hover:border-shadow-gold/30 hover:text-shadow-gold"
              onClick={onNone}
              type="button"
            >
              {noneLabel}
            </button>
          ) : null}

          {(Array.isArray(options) ? options : []).map((option) => {
            const optionSelected = isMulti ? selectedList.some((entry) => entry === option?.id) : selected === option?.id;
            return (
              <button
                className={`min-w-0 rounded-xl border px-3 py-3 text-left text-sm transition ${optionSelected ? 'border-shadow-purple/60 bg-shadow-purple/20 text-shadow-text shadow-purpleGlow' : 'border-white/10 bg-black/20 text-shadow-textSecondary hover:border-shadow-gold/30 hover:text-shadow-text'}`}
                key={option?.id}
                onClick={() => onSelect?.(option?.id)}
                type="button"
              >
                <span className="block break-words font-semibold">{option?.label}</span>
                {option?.description ? <span className="mt-1 block break-words text-xs text-shadow-textMuted">{option?.description}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <span className="block px-4 pb-4 text-sm text-shadow-red">{error}</span> : null}
    </section>
  );
}

function SelectionGrid({ options, selected, onSelect, error, columns = 'sm:grid-cols-2' }) {
  return (
    <>
      <div className={`grid min-w-0 gap-3 ${columns}`}>
        {options?.map((option) => {
          const isSelected = selected === option?.id;
          return (
            <button
              className={`min-w-0 rounded-2xl border p-4 text-left transition ${isSelected ? 'border-shadow-gold/50 bg-shadow-gold/10 shadow-goldGlow text-shadow-text' : 'border-white/10 bg-black/20 text-shadow-textSecondary hover:border-shadow-gold/30'}`}
              key={option?.id}
              onClick={() => onSelect(option?.id)}
              type="button"
            >
              <p className="font-semibold text-shadow-text">{option?.label}</p>
              {option?.description ? <p className="mt-1 text-xs text-shadow-textMuted">{option?.description}</p> : null}
            </button>
          );
        })}
      </div>
      {error ? <span className="mt-2 block text-sm text-shadow-red">{error}</span> : null}
    </>
  );
}

export function Field({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">{label}</span>
      <input
        className={`mt-2 min-h-12 w-full rounded-2xl border bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40 ${error ? 'border-shadow-red/40' : 'border-white/10'}`}
        {...props}
      />
      {error ? <span className="mt-2 block text-sm text-shadow-red">{error}</span> : null}
    </label>
  );
}

export function GeneratedOutput({ title, text, empty }) {
  return (
    <Card empty={empty} emptyText="Your generated result will appear here." title={title}>
      <div className="min-w-0 whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-shadow-textSecondary">{text}</div>
    </Card>
  );
}

export function HistoryPanel({ title, history }) {
  return (
    <Card empty={!history?.length} emptyText="No saved generations yet." title={title}>
      <div className="space-y-3">
        {history?.map((entry) => (
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={entry?.id}>
            <p className="font-heading text-lg font-bold text-shadow-gold">{entry?.input?.goal || entry?.input?.target || entry?.input?.mealGoal || 'AI Result'}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-shadow-textMuted">{entry?.createdAt?.slice(0, 10)}</p>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-shadow-textSecondary">{entry?.output}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}
