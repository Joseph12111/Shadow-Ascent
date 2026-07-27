export default function StatBadge({ icon: Icon, label, value, tone = 'gold', loading = false, error = null, empty = false }) {
  const toneClass = tone === 'purple' ? 'border-shadow-purple/30 text-shadow-purpleLight' : 'border-shadow-gold/30 text-shadow-gold';

  if (loading) {
    return <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />;
  }

  if (error) {
    return <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-3 text-sm text-shadow-textSecondary">Unavailable</div>;
  }

  if (empty) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-shadow-textMuted">Empty</div>;
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl border bg-white/[0.03] p-3 ${toneClass}`}>
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-[0.18em] text-shadow-textMuted">{label}</p>
        <p className="truncate text-lg font-bold text-shadow-text">{value}</p>
      </div>
    </div>
  );
}
