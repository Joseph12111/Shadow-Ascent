import { Crown, Gift, Sparkles, TrendingUp } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import RankEmblem from '../game/RankEmblem.jsx';

export default function RankUpCelebrationModal({ open = false, onClose, rankUpData = null, loading = false, error = null }) {
  const nextRank = rankUpData?.nextRank;
  const previousRank = rankUpData?.previousRank;
  const nextRankId = nextRank?.rankId || nextRank?.id || '';
  const previousRankName = previousRank?.rankName || previousRank?.name || 'Previous Rank';
  const nextRankName = nextRank?.rankName || nextRank?.name || 'Ascended Rank';
  const totalRP = Number(rankUpData?.totalRP || 0);
  const source = String(rankUpData?.source || 'progress');
  const rankGift = rankUpData?.rankGift;
  const empty = !nextRankId;

  return (
    <Modal
      description="You crossed a new RP threshold."
      empty={empty}
      emptyText="No rank change detected."
      error={error}
      loading={loading}
      onClose={onClose}
      open={open}
      title="Rank Up"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-shadow-gold/35 bg-shadow-gold/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-shadow-purpleLight">Ascension Complete</p>
              <h3 className="mt-2 font-heading text-3xl font-bold text-shadow-gold">{nextRankName}</h3>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-shadow-gold/35 bg-shadow-secondary/70 shadow-goldGlow">
              <Sparkles className="h-5 w-5 text-shadow-gold" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[0.6fr_1.4fr]">
            <div className="flex justify-center sm:justify-start">
              <RankEmblem rankId={nextRankId} size={88} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-shadow-textSecondary">
                Advanced from <span className="font-semibold text-shadow-purpleLight">{previousRankName}</span> to{' '}
                <span className="font-semibold text-shadow-gold">{nextRankName}</span>.
              </p>
              <p className="text-sm text-shadow-textSecondary">Total RP: {totalRP}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Source: {source}</p>
            </div>
          </div>
        </div>

        {rankGift?.id ? (
          <div className="rounded-2xl border border-shadow-purple/35 bg-shadow-purple/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-shadow-purpleLight">Rank Gift Awarded</p>
            <p className="mt-2 flex items-center gap-2 font-heading text-xl font-bold text-shadow-gold">
              <Gift className="h-5 w-5" aria-hidden="true" />
              {rankGift?.name}
            </p>
            <p className="mt-2 text-sm text-shadow-textSecondary">This chest was earned from the rank upgrade and cannot be purchased.</p>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Rank Shift</p>
            <p className="mt-2 flex items-center gap-2 font-semibold text-shadow-gold">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              {previousRankName}
              {' -> '}
              {nextRankName}
            </p>
          </div>
          <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Status</p>
            <p className="mt-2 flex items-center gap-2 font-semibold text-shadow-gold">
              <Crown className="h-4 w-4" aria-hidden="true" />
              New Division Unlocked
            </p>
          </div>
        </div>

        <Button className="w-full" onClick={onClose}>
          Continue Ascent
        </Button>
      </div>
    </Modal>
  );
}
