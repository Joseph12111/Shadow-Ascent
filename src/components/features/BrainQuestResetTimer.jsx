import { useEffect, useState } from 'react';

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return { hours, minutes, seconds };
}

export default function BrainQuestResetTimer({ loading = false, error = null, empty = false }) {
  const [remaining, setRemaining] = useState(() => getTimeUntilMidnight());

  useEffect(() => {
    const timer = globalThis?.setInterval?.(() => {
      setRemaining(getTimeUntilMidnight());
    }, 1000);

    return () => {
      globalThis?.clearInterval?.(timer);
    };
  }, []);

  if (loading) {
    return <span className="inline-flex h-8 w-28 animate-pulse rounded-full bg-white/10" />;
  }

  if (error) {
    return <span className="text-xs text-shadow-red">Reset unavailable</span>;
  }

  if (empty) {
    return <span className="text-xs text-shadow-textMuted">No quest today</span>;
  }

  return (
    <span className="rounded-full border border-shadow-purple/30 bg-shadow-purple/10 px-3 py-1 text-xs font-semibold text-shadow-purpleLight">
      Resets in {String(remaining?.hours).padStart(2, '0')}:{String(remaining?.minutes).padStart(2, '0')}:{String(remaining?.seconds).padStart(2, '0')}
    </span>
  );
}
