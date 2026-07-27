import ProgressBar from '../ui/ProgressBar.jsx';

export default function XPBar({ xp = 0, nextLevelXP = 100, loading = false, error = null, empty = false }) {
  const safeXP = Math.max(0, Number(xp) || 0);
  const safeNext = Math.max(1, Number(nextLevelXP) || 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-shadow-textMuted">XP</span>
        <span className="text-sm font-semibold text-shadow-gold">
          {safeXP} / {safeNext}
        </span>
      </div>
      <ProgressBar empty={empty} error={error} loading={loading} max={safeNext} tone="purple" value={safeXP} />
    </div>
  );
}
