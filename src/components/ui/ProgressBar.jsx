export default function ProgressBar({ value = 0, max = 100, label, loading = false, error = null, empty = false, tone = 'gold' }) {
  const safeMax = Math.max(1, Number(max) || 100);
  const safeValue = Math.min(safeMax, Math.max(0, Number(value) || 0));
  const percent = Math.round((safeValue / safeMax) * 100);
  const toneClass = tone === 'purple' ? 'from-shadow-purple to-shadow-purpleLight shadow-purpleGlow' : 'from-shadow-goldDark to-shadow-gold shadow-goldGlow';

  if (loading) {
    return <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />;
  }

  if (error) {
    return <p className="text-xs text-shadow-red">Progress unavailable.</p>;
  }

  if (empty) {
    return <p className="text-xs text-shadow-textMuted">No progress yet.</p>;
  }

  return (
    <div className="w-full">
      {label ? (
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-shadow-textMuted sm:text-xs sm:tracking-[0.18em]">
          <span className="min-w-0 truncate">{label}</span>
          <span className="shrink-0">{percent}%</span>
        </div>
      ) : null}
      <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/40">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneClass} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
