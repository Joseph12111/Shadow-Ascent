import { useMemo } from 'react';
import { Crown, History, Shield, TrendingUp } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import RankEmblem from '../components/game/RankEmblem.jsx';
import RankWidget from '../components/game/RankWidget.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { calculateRank, getNextRankInfo, getRPHistory, getTotalRP } from '../utils/rankEngine.js';
import { RANKS } from '../config/rankSystem.js';

export default function RankOverview() {
  const { profile, loading, error } = useAuth();
  const totalRP = Number(profile?.total_rp ?? getTotalRP());
  const rankData = useMemo(() => calculateRank(totalRP), [totalRP]);
  const nextRank = useMemo(() => getNextRankInfo(rankData), [rankData]);
  const history = getRPHistory();

  return (
    <div className="w-full space-y-6">
      <Card error={error} loading={loading} subtitle="Rank points, divisions, thresholds, and RP history." title="Rank Overview" icon={Crown}>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBadge icon={Crown} label="Current Rank" value={rankData?.rankName} />
          <StatBadge icon={TrendingUp} label="Total RP" tone="purple" value={rankData?.totalRP} />
          <StatBadge icon={Shield} label="Division" value={rankData?.division} />
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <RankWidget profile={profile} rankData={rankData} />

        <Card title="Next Rank" subtitle={nextRank?.isMaxRank ? 'You are at the apex.' : `${nextRank?.rpNeeded} RP remaining`}>
          <div className="flex items-center gap-5">
            <RankEmblem rankId={nextRank?.nextRank?.id || rankData?.rankId} size={96} />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-2xl font-bold text-shadow-gold">{nextRank?.nextRank?.name || 'Apex'}</h2>
              <p className="mt-1 text-sm text-shadow-textSecondary">{nextRank?.isMaxRank ? 'No higher rank available.' : `Unlocks at ${nextRank?.nextRank?.minRP} RP.`}</p>
              <div className="mt-5">
                <ProgressBar label="Progress" value={nextRank?.progressToNextRank} />
              </div>
            </div>
          </div>
        </Card>
      </section>

      <Card title="Rank Ladder" subtitle="All 10 ranks and their exact RP thresholds.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {RANKS?.map((rank) => {
            const active = rank?.id === rankData?.rankId;

            return (
              <article className={`rounded-2xl border p-4 ${active ? 'border-shadow-gold/40 bg-shadow-gold/10 shadow-goldGlow' : 'border-white/10 bg-white/[0.03]'}`} key={rank?.id}>
                <div className="flex items-center gap-3">
                  <RankEmblem rankId={rank?.id} size={56} />
                  <div>
                    <h3 className="font-heading text-lg font-bold text-shadow-gold">{rank?.name}</h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">
                      {rank?.minRP} RP - {rank?.maxRP ?? 'Apex'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {rank?.divisions?.map((division) => (
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs text-shadow-textSecondary" key={division?.id}>
                      {division?.label}: {division?.minRP}-{division?.maxRP ?? 'Apex'}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      <Card empty={!history?.length} emptyText="No RP history recorded yet. Complete quests, workouts, or brain quests to earn RP." title="RP History" icon={History}>
        <div className="space-y-3">
          {history?.map((entry) => (
            <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={entry?.id}>
              <div>
                <h3 className="font-heading text-lg font-bold text-shadow-gold">+{entry?.amount} RP</h3>
                <p className="text-sm text-shadow-textSecondary">
                  {entry?.source} / {entry?.rankId} {entry?.division}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-shadow-purpleLight">{entry?.totalRP} total</p>
                <p className="text-xs text-shadow-textMuted">{entry?.createdAt?.slice(0, 10)}</p>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
