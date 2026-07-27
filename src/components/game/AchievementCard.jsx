import { Award, Lock } from 'lucide-react';

export default function AchievementCard({ achievement, loading = false, error = null, empty = false }) {
  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />;
  }

  if (error) {
    return <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">Achievement unavailable.</div>;
  }

  if (empty || !achievement?.id) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-shadow-textMuted">No achievement selected.</div>;
  }

  const unlocked = Boolean(achievement?.unlocked || achievement?.unlockedAt);

  return (
    <article className={`rounded-2xl border p-4 transition ${unlocked ? 'border-shadow-gold/30 bg-shadow-gold/10 shadow-goldGlow' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${unlocked ? 'border-shadow-gold/30 text-shadow-gold' : 'border-white/10 text-shadow-textMuted'}`}>
          {unlocked ? <Award className="h-5 w-5" aria-hidden="true" /> : <Lock className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-bold text-shadow-gold">{achievement?.title}</h3>
          <p className="mt-1 text-sm leading-5 text-shadow-textSecondary">{achievement?.description}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-shadow-purpleLight">+{achievement?.xpReward || 100} XP</p>
        </div>
      </div>
    </article>
  );
}
