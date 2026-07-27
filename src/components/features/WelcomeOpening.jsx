import { useEffect, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import Button from '../ui/Button.jsx';
import AppLogo from '../layout/AppLogo.jsx';
import welcomeVideo from '../../assets/shadow-ascent-welcome.mp4';

export default function WelcomeOpening({ open = false, onFinish, displayName = 'Ascendant' }) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    setVideoReady(false);
    setVideoError(false);
    setFinishing(false);
    globalThis.__shadowAscentOverlayCount = Number(globalThis?.__shadowAscentOverlayCount || 0) + 1;
    globalThis?.dispatchEvent?.(new CustomEvent('shadowAscentOverlayChange', { detail: { count: globalThis?.__shadowAscentOverlayCount } }));

    const fallbackTimer = globalThis?.setTimeout?.(() => {
      setFinishing(true);
    }, 8500);

    return () => {
      if (fallbackTimer) {
        globalThis?.clearTimeout?.(fallbackTimer);
      }
      globalThis.__shadowAscentOverlayCount = Math.max(0, Number(globalThis?.__shadowAscentOverlayCount || 0) - 1);
      globalThis?.dispatchEvent?.(new CustomEvent('shadowAscentOverlayChange', { detail: { count: globalThis?.__shadowAscentOverlayCount } }));
    };
  }, [open]);

  useEffect(() => {
    if (!finishing) {
      return undefined;
    }

    const finishTimer = globalThis?.setTimeout?.(() => {
      onFinish?.();
    }, 450);

    return () => {
      if (finishTimer) {
        globalThis?.clearTimeout?.(finishTimer);
      }
    };
  }, [finishing, onFinish]);

  if (!open) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-[2147483646] overflow-hidden bg-shadow-primary transition-opacity duration-500 ${finishing ? 'opacity-0' : 'opacity-100'}`} role="dialog" aria-modal="true">
      <video
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady && !videoError ? 'opacity-85' : 'opacity-0'}`}
        muted
        onCanPlay={() => setVideoReady(true)}
        onEnded={() => setFinishing(true)}
        onError={() => setVideoError(true)}
        playsInline
        src={welcomeVideo}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(139,92,246,0.2),transparent_34%),linear-gradient(180deg,rgba(10,10,15,0.2),rgba(10,10,15,0.58)_48%,#0a0a0f_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-shadow-primary via-shadow-primary/70 to-transparent" />

      <section className="relative z-10 flex min-h-screen items-end justify-center px-5 pb-10 pt-8 sm:items-center sm:pb-8">
        <div className="w-full max-w-2xl text-center">
          <AppLogo className="mx-auto h-16 w-16" />

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.34em] text-shadow-purpleLight">Welcome to Shadow Ascent</p>
          <h1 className="mt-3 font-heading text-4xl font-bold text-shadow-gold sm:text-6xl">
            Rise, {displayName}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-shadow-textSecondary sm:text-lg">
            Every step through shadow becomes a vow. Keep moving, and the summit will learn your name.
          </p>

          <div className="mx-auto mt-7 flex w-fit items-center gap-3 rounded-full border border-shadow-gold/25 bg-black/40 px-5 py-3 text-sm font-semibold text-shadow-text backdrop-blur-md">
            <LoaderCircle className="h-5 w-5 animate-spin text-shadow-gold" aria-hidden="true" />
            <span>{videoReady || videoError ? 'Preparing your ascent' : 'Summoning your path'}</span>
          </div>

          <Button className="mx-auto mt-6 min-w-44" onClick={() => setFinishing(true)} variant="secondary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Enter Ascent
          </Button>
        </div>
      </section>
    </div>
  );
}
