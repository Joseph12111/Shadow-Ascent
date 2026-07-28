import { useEffect, useState } from 'react';
import { Camera, ImagePlus, ScanLine, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { syncFeatureUsage } from '../utils/usageTracker.js';
import { isOwner } from '../utils/ownerCheck.js';
import { callOpenAIResponse, GeneratedOutput, HistoryPanel, isAIServiceConfigured, saveAIHistory, UpgradeModal, UsageBanner } from './WorkoutGenerator.jsx';

const MEAL_SCANNER_HISTORY_KEY = 'shadowAscentMealScannerHistory';
const MAX_IMAGE_BYTES = 12_000_000;
const MAX_DATA_URL_LENGTH = 3_000_000;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp'];
const ACCEPTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function validateImageFile(file) {
  const mimeType = String(file?.type || '').toLowerCase();
  const fileName = String(file?.name || '');
  const supported = ACCEPTED_IMAGE_TYPES?.includes(mimeType) || ACCEPTED_IMAGE_EXTENSIONS?.test(fileName);

  if (!supported) {
    return 'Use a JPG, PNG, or WebP image.';
  }

  if (Number(file?.size || 0) <= 0) {
    return 'This image file is empty.';
  }

  if (Number(file?.size || 0) > MAX_IMAGE_BYTES) {
    return 'Image is too large. Choose an image smaller than 12 MB.';
  }

  return '';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new globalThis.FileReader();
      reader.onload = () => resolve(String(reader?.result || ''));
      reader.onerror = () => reject(new Error('file_read_failed'));
      reader.readAsDataURL(file);
    } catch {
      reject(new Error('file_read_failed'));
    }
  });
}

function loadHtmlImage(dataUrl) {
  return new Promise((resolve, reject) => {
    try {
      const image = new globalThis.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image_decode_failed'));
      image.src = dataUrl;
    } catch {
      reject(new Error('image_decode_failed'));
    }
  });
}

async function loadImageSource(file) {
  if (typeof globalThis?.createImageBitmap === 'function') {
    try {
      const bitmap = await globalThis.createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap?.width || 0,
        height: bitmap?.height || 0,
        close: () => bitmap?.close?.(),
      };
    } catch {
      try {
        const bitmap = await globalThis.createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap?.width || 0,
          height: bitmap?.height || 0,
          close: () => bitmap?.close?.(),
        };
      } catch {
        // FileReader and Image provide broader fallback support on older mobile browsers.
      }
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadHtmlImage(dataUrl);
  return {
    source: image,
    width: image?.naturalWidth || 0,
    height: image?.naturalHeight || 0,
    close: () => {},
  };
}

async function fileToDataUrl(file) {
  const validationError = validateImageFile(file);

  if (validationError) {
    return { ok: false, dataUrl: '', message: validationError };
  }

  let imageSource = null;

  try {
    imageSource = await loadImageSource(file);
    const sourceWidth = Number(imageSource?.width || 0);
    const sourceHeight = Number(imageSource?.height || 0);

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return { ok: false, dataUrl: '', message: 'This image could not be opened. Try a different JPG, PNG, or WebP image.' };
    }

    const canvas = globalThis?.document?.createElement?.('canvas');
    const context = canvas?.getContext?.('2d', { alpha: false });

    if (!canvas || !context) {
      return { ok: false, dataUrl: '', message: 'Image preparation is not supported by this browser.' };
    }

    let maxDimension = 1600;
    let quality = 0.84;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));

      canvas.width = width;
      canvas.height = height;
      context.fillStyle = '#0a0a0f';
      context.fillRect(0, 0, width, height);
      context.drawImage(imageSource?.source, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      if (dataUrl && dataUrl?.length <= MAX_DATA_URL_LENGTH) {
        return { ok: true, dataUrl, message: '' };
      }

      maxDimension = Math.max(720, Math.round(maxDimension * 0.82));
      quality = Math.max(0.58, quality - 0.06);
    }

    return { ok: false, dataUrl: '', message: 'Image could not be compressed for scanning. Try a smaller image.' };
  } catch {
    return { ok: false, dataUrl: '', message: 'This image could not be opened. Try a different JPG, PNG, or WebP image.' };
  } finally {
    imageSource?.close?.();
  }
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
  const [preparingImage, setPreparingImage] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [localError, setLocalError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const empty = !isAIServiceConfigured();

  useEffect(() => {
    if (owner && upgradeOpen) {
      setUpgradeOpen(false);
    }
  }, [owner, upgradeOpen]);

  async function handleImageChange(event, source = 'upload') {
    const file = event?.target?.files?.[0];
    const input = event?.target;
    setLocalError('');
    setResult('');

    if (!file) {
      return;
    }

    setPreparingImage(true);
    const converted = await fileToDataUrl(file);
    setPreparingImage(false);

    if (input) {
      input.value = '';
    }

    if (!converted?.ok || !converted?.dataUrl) {
      setLocalError(converted?.message || 'Image could not be prepared for scanning.');
      return;
    }

    setImageDataUrl(converted?.dataUrl);
    setImageName(source === 'camera' ? file?.name || 'camera meal photo' : file?.name || 'meal image');
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

    setScanning(true);
    const response = await callOpenAIResponse({
      endpoint: '/api/generate-meal',
      mode: 'scanner',
      text: `Analyze this meal image for Shadow Ascent.
User target: ${target || 'general nutrition scan'}

Return sections: visible foods, estimated calories, estimated macros, confidence level, improvement suggestions.`,
      imageDataUrl,
    });
    setScanning(false);

    if (!response?.ok) {
      if (response?.code === 'usage_limit_reached') {
        setUpgradeOpen(true);
      }
      setLocalError(response?.message || 'Meal scan could not be completed.');
      return;
    }

    syncFeatureUsage('mealScanner', response?.usage);
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
            <label className={`flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-shadow-purple/40 bg-black/20 p-5 text-center transition ${preparingImage || scanning ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-shadow-gold/40'}`}>
              {preparingImage ? (
                <>
                  <span className="h-9 w-9 animate-spin rounded-full border-2 border-shadow-purpleLight border-t-transparent" aria-hidden="true" />
                  <p className="mt-4 font-semibold text-shadow-text">Preparing image...</p>
                </>
              ) : imageDataUrl ? (
                <>
                  <img alt="Selected meal preview" className="max-h-56 max-w-full rounded-2xl object-contain" src={imageDataUrl} />
                  <p className="mt-3 max-w-full break-words text-sm font-semibold text-shadow-text">{imageName}</p>
                  <p className="mt-1 text-xs text-shadow-textMuted">Tap to choose another image</p>
                </>
              ) : (
                <>
                  <ImagePlus className="h-10 w-10 text-shadow-purpleLight" aria-hidden="true" />
                  <p className="mt-4 font-heading text-xl font-bold text-shadow-gold">Upload Meal Image</p>
                  <p className="mt-2 text-sm text-shadow-textSecondary">JPG, PNG, or WebP up to 12 MB</p>
                </>
              )}
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={preparingImage || scanning}
                onChange={(event) => handleImageChange(event, 'upload')}
                type="file"
              />
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
              <label className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-shadow-purple/40 bg-shadow-purple/20 px-5 py-3 text-base font-semibold text-shadow-purpleLight transition duration-200 focus-within:ring-2 focus-within:ring-shadow-gold/70 ${preparingImage || scanning ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-shadow-purple/30'}`}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                Take Photo
                <input
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  disabled={preparingImage || scanning}
                  onChange={(event) => handleImageChange(event, 'camera')}
                  type="file"
                />
              </label>
              <Button className="w-full" disabled={preparingImage} loading={scanning} size="lg" type="submit">
                <Camera className="h-4 w-4" aria-hidden="true" />
                Scan Meal
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <section className="grid gap-5 sm:grid-cols-3">
        <StatBadge icon={ScanLine} label="Saved Scans" value={history?.length} />
        <StatBadge icon={ImagePlus} label="Image" tone="purple" value={imageName || 'None'} valueClassName="break-words leading-6" />
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
