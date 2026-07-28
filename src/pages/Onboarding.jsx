import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Dumbbell, Flame, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLogo from '../components/layout/AppLogo.jsx';
import BetaBadge from '../components/ui/BetaBadge.jsx';
import Button from '../components/ui/Button.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';

const ONBOARDING_STORAGE_KEY = 'shadowAscentOnboarding';

const steps = [
  {
    key: 'goal',
    eyebrow: 'Choose your path',
    title: 'What brings you to the ascent?',
    options: [
      { value: 'build_strength', label: 'Build Strength', text: 'Become physically stronger and more capable.', icon: Dumbbell },
      { value: 'build_consistency', label: 'Build Consistency', text: 'Create a routine you can trust yourself to keep.', icon: ShieldCheck },
      { value: 'improve_wellbeing', label: 'Improve Wellbeing', text: 'Support energy, health, and everyday confidence.', icon: Sparkles },
      { value: 'return_to_training', label: 'Return to Training', text: 'Rebuild momentum after time away.', icon: Flame },
    ],
  },
  {
    key: 'fitnessLevel',
    eyebrow: 'Set your starting rank',
    title: 'What is your current fitness level?',
    options: [
      { value: 'beginner', label: 'Beginner', text: 'New to training or returning after a long break.', icon: ShieldCheck },
      { value: 'intermediate', label: 'Intermediate', text: 'Training consistently for six months to two years.', icon: Dumbbell },
      { value: 'advanced', label: 'Advanced', text: 'Training seriously for two years or longer.', icon: Trophy },
    ],
  },
  {
    key: 'mainObjective',
    eyebrow: 'Name the main quest',
    title: 'What is your primary objective?',
    options: [
      { value: 'lose_fat', label: 'Lose Fat', text: 'Reduce body fat while protecting strength and energy.', icon: Flame },
      { value: 'gain_muscle', label: 'Gain Muscle', text: 'Build lean mass through structured progression.', icon: Dumbbell },
      { value: 'improve_discipline', label: 'Improve Discipline', text: 'Strengthen habits, consistency, and follow-through.', icon: Target },
    ],
  },
];

function readStoredOnboarding() {
  try {
    const stored = globalThis?.localStorage?.getItem(ONBOARDING_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeStoredOnboarding(value) {
  try {
    globalThis?.localStorage?.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, user, updateProfile } = useAuth();
  const toast = useToast();
  const stored = useMemo(() => readStoredOnboarding(), []);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    goal: stored?.goal || profile?.onboarding_goal || '',
    fitnessLevel: stored?.fitnessLevel || profile?.fitness_level || '',
    mainObjective: stored?.mainObjective || profile?.main_objective || '',
    weeklyTrainingDays: Number(stored?.weeklyTrainingDays || profile?.weekly_training_days || 3),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const currentStep = steps?.[step];
  const isTrainingStep = step === steps?.length;
  const progress = ((step + 1) / (steps?.length + 1)) * 100;
  const selectedValue = currentStep?.key ? form?.[currentStep?.key] : null;

  useEffect(() => {
    writeStoredOnboarding(form);
  }, [form]);

  function selectOption(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function goNext() {
    if (!selectedValue) {
      setError('Choose one path before continuing.');
      return;
    }
    setStep((current) => Math.min(steps?.length, current + 1));
    setError('');
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
    setError('');
  }

  function finishOnboarding() {
    const weeklyTrainingDays = Number(form?.weeklyTrainingDays || 0);
    if (weeklyTrainingDays < 1 || weeklyTrainingDays > 7) {
      setError('Choose between one and seven training days.');
      return;
    }

    setSaving(true);
    const completedAt = new Date().toISOString();
    const localData = { ...form, weeklyTrainingDays, completedAt };
    writeStoredOnboarding(localData);
    updateProfile?.({
      onboarding_goal: form?.goal,
      fitness_level: form?.fitnessLevel,
      main_objective: form?.mainObjective,
      weekly_training_days: weeklyTrainingDays,
      onboarding_completed: true,
      onboarding_completed_at: completedAt,
    });
    toast?.success?.('Your path is set. Welcome to the beta.');
    navigate('/dashboard', { replace: true });
  }

  if (!user?.id) {
    return (
      <section className="glass-card mx-auto w-full max-w-xl p-6 text-center">
        <p className="text-sm text-shadow-textSecondary">Your session is required to begin onboarding.</p>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <AppLogo className="h-12 w-12 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-heading text-xl font-bold text-shadow-gold">Shadow Ascent</p>
            <p className="text-xs uppercase text-shadow-textMuted">Forge your starting path</p>
          </div>
        </div>
        <BetaBadge compact />
      </header>

      <section className="glass-card min-w-0 overflow-hidden">
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase text-shadow-purpleLight">
              Step {step + 1} of {steps?.length + 1}
            </span>
            <span className="text-xs text-shadow-textMuted">{Math.round(progress)}%</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress} />
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {!isTrainingStep ? (
            <>
              <p className="text-xs font-semibold uppercase text-shadow-purpleLight">{currentStep?.eyebrow}</p>
              <h1 className="mt-3 font-heading text-2xl font-bold text-shadow-gold sm:text-3xl">{currentStep?.title}</h1>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {currentStep?.options?.map((option) => {
                  const Icon = option?.icon;
                  const selected = selectedValue === option?.value;
                  return (
                    <button
                      className={`min-w-0 rounded-xl border p-4 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-shadow-gold/70 ${
                        selected
                          ? 'border-shadow-gold/55 bg-shadow-gold/10 shadow-goldGlow'
                          : 'border-white/10 bg-black/20 hover:border-shadow-purple/40 hover:bg-shadow-purple/10'
                      }`}
                      key={option?.value}
                      onClick={() => selectOption(currentStep?.key, option?.value)}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${selected ? 'border-shadow-gold/40 text-shadow-gold' : 'border-shadow-purple/30 text-shadow-purpleLight'}`}>
                          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold text-shadow-text">
                            {option?.label}
                            {selected ? <Check className="h-4 w-4 text-shadow-green" aria-hidden="true" /> : null}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-shadow-textSecondary">{option?.text}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase text-shadow-purpleLight">Choose your weekly rhythm</p>
              <h1 className="mt-3 font-heading text-2xl font-bold text-shadow-gold sm:text-3xl">How many days can you train each week?</h1>
              <p className="mt-3 text-sm leading-6 text-shadow-textSecondary">Choose a sustainable target. You can adjust this later from your profile and generators.</p>
              <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[1, 2, 3, 4, 5, 6, 7]?.map((day) => {
                  const selected = Number(form?.weeklyTrainingDays) === day;
                  return (
                    <button
                      className={`flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-shadow-gold/70 ${
                        selected
                          ? 'border-shadow-gold/55 bg-shadow-gold/15 text-shadow-gold shadow-goldGlow'
                          : 'border-white/10 bg-black/20 text-shadow-textSecondary hover:border-shadow-purple/40'
                      }`}
                      key={day}
                      onClick={() => selectOption('weeklyTrainingDays', day)}
                      type="button"
                    >
                      <span className="text-xl font-bold">{day}</span>
                      <span className="text-[0.6rem] uppercase">{day === 1 ? 'day' : 'days'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {error ? <p className="mt-5 rounded-xl border border-shadow-red/30 bg-shadow-red/10 p-3 text-sm text-shadow-textSecondary">{error}</p> : null}

          <div className="mt-7 flex items-center justify-between gap-3">
            <Button disabled={step === 0 || saving} onClick={goBack} variant="ghost">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
            {!isTrainingStep ? (
              <Button onClick={goNext}>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button loading={saving} onClick={finishOnboarding}>
                Begin Ascent
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
