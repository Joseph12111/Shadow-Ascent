import { useEffect, useState } from 'react';
import { Camera, ImagePlus, ScanLine, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { recordFeatureUsage } from '../utils/usageTracker.js';
import { isOwner } from '../utils/ownerCheck.js';
import { callOpenAIResponse, GeneratedOutput, HistoryPanel, isAIServiceConfigured, saveAIHistory, UpgradeModal, UsageBanner } from './WorkoutGenerator.jsx';

const MEAL_SCANNER_HISTORY_KEY = 'shadowAscentMealScannerHistory';

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve({ ok: true, dataUrl: String(reader?.result || '') });
      reader.onerror = () => resolve({ ok: false, dataUrl: '' });
      reader.readAsDataURL(file);
    } catch {
      resolve({ ok: false, dataUrl: '' });
    }
  });
}

export default function MealScanner() {
  const { user, loading, error } = useAuth();
  const toast = useToast();
  const owner = isOwner(user);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [target, setTarget] = useState('Estimate calories, protein, carbs, fats, and practical swaps.');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState(() => {
    const storedHistory = readJSON(MEAL_SCANNER_HISTORY_KEY, []);
    return Array.isArray(storedHistory) ? storedHistory : [];
  });
  const [scanning, setScanning] = useState(false);
  const [localError, setLocalError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const empty = !isAIServiceConfigured();

  useEffect(() => {
    if (owner && upgradeOpen) {
      setUpgradeOpen(false);
    }
  }, [owner, upgradeOpen]);

  async function handleImageChange(event) {
    const file = event?.target?.files?.[0];
    setLocalError('');
    setResult('');

    if (!file) {
      setImageDataUrl('');
      setImageName('');
      return;
    }

    if (!file?.type?.startsWith('image/')) {
      setLocalError('Choose an image file for scanning.');
      return;
    }

    const converted = await fileToDataUrl(file);

    if (!converted?.ok || !converted?.dataUrl) {
      setLocalError('Image could not be prepared for scanning.');
      return;
    }

    setImageDataUrl(converted?.dataUrl);
    setImageName(file?.name || 'meal image');
  }

  async function scanMeal(event) {
    event.preventDefault();
    setLocalError('');

    if (empty) {
      return;
    }

    if (!imageDataUrl) {
      setLocalError('Upload a meal image before scanning.');
      return;
    }

    const usage = recordFeatureUsage('mealScanner', user);

    if (!usage?.success) {
      if (!usage?.owner && usage?.reason === 'limit_reached') {
        setUpgradeOpen(true);
      } else {
        setLocalError(usage?.message || 'Usage could not be updated right now.');
      }
      return;
    }

    setScanning(true);
    const response = await callOpenAIResponse({
      instructions: 'You are a careful nutrition image assistant. Provide estimates and uncertainty. Do not claim medical certainty.',
      text: `Analyze this meal image for Shadow Ascent.
User target: ${target || 'general nutrition scan'}

Return sections: visible foods, estimated calories, estimated macros, confidence level, improvement suggestions.`,
      imageDataUrl,
    });
    setScanning(false);

    if (!response?.ok) {
      setLocalError(response?.message || 'Meal scan could not be completed.');
      return;
    }

    const entry = {
      id: `meal-scan-${Date.now()}`,
      feature: 'mealScanner',
      input: {
        target,
        imageName,
      },
      output: response?.text,
      createdAt: new Date().toISOString(),
    };
    const saved = saveAIHistory({ key: MEAL_SCANNER_HISTORY_KEY, entry, user, table: 'ai_meal_scans' });

    if (!saved?.saved) {
      setLocalError('Meal scan completed, but could not be saved locally.');
      return;
    }

    setHistory(saved?.history);
    setResult(response?.text);
    toast?.success?.('Meal image scanned.');
  }

  return (
    <div className="w-full space-y-6">
      <Card empty={empty} emptyText="Connect Supabase to enable the secure AI service." error={error} loading={loading} subtitle="Secure image analysis with usage limits." title="Meal Scanner" icon={ScanLine}>
        {!empty ? <UsageBanner feature="mealScanner" title="Meal Vision Scan" user={user} /> : null}
        {!empty && localError ? <div className="mt-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}

        {!empty ? (
          <form className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]" onSubmit={scanMeal}>
            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-shadow-purple/40 bg-black/20 p-5 text-center transition hover:border-shadow-gold/40">
              {imageDataUrl ? (
                <img alt="Selected meal" className="max-h-64 rounded-2xl object-contain" src={imageDataUrl} />
              ) : (
                <>
                  <ImagePlus className="h-10 w-10 text-shadow-purpleLight" aria-hidden="true" />
                  <p className="mt-4 font-heading text-xl font-bold text-shadow-gold">Upload Meal Image</p>
                  <p className="mt-2 text-sm text-shadow-textSecondary">PNG, JPG, or WebP</p>
                </>
              )}
              <input accept="image/*" className="sr-only" onChange={handleImageChange} type="file" />
            </label>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Scan Target</span>
                <textarea
                  className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40"
                  onChange={(event) => setTarget(event?.target?.value || '')}
                  value={target}
                />
              </label>
              <Button className="w-full" loading={scanning} size="lg" type="submit">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Scan Meal
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <section className="grid gap-5 sm:grid-cols-3">
        <StatBadge icon={ScanLine} label="Saved Scans" value={history?.length} />
        <StatBadge icon={ImagePlus} label="Image" tone="purple" value={imageName || 'None'} />
        <StatBadge icon={Sparkles} label="Mode" value="Vision" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <GeneratedOutput empty={!result} text={result} title="Meal Scan Result" />
        <HistoryPanel history={history} title="Scan History" />
      </section>

      <UpgradeModal featureName="Meal Scanner" onClose={() => setUpgradeOpen(false)} open={!owner && upgradeOpen} />
    </div>
  );
}
