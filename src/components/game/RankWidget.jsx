import { calculateRank, getNextRankInfo } from '../../utils/rankEngine.js';
import Card from '../ui/Card.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import RankEmblem from './RankEmblem.jsx';

export default function RankWidget({ profile, rankData, compact = false, loading = false, error = null, empty = false }) {
  const totalRP = Number(rankData?.totalRP ?? profile?.total_rp ?? profile?.totalRP ?? 0);
  const currentRank = rankData || calculateRank(totalRP);
  const nextRank = getNextRankInfo(currentRank);

  if (compact) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <RankEmblem error={error} loading={loading} rankId={currentRank?.rankId} size={58} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-bold text-shadow-gold">{currentRank?.rankName}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">Division {currentRank?.division}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar empty={empty} error={error} label={nextRank?.isMaxRank ? 'Apex' : `${nextRank?.rpNeeded} RP to next`} loading={loading} value={nextRank?.progressToNextRank} />
        </div>
      </div>
    );
  }

  return (
    <Card empty={empty} error={error} loading={loading} subtitle={`${currentRank?.totalRP} total RP`} title="Rank">
      <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="scale-90 sm:scale-100">
          <RankEmblem rankId={currentRank?.rankId} size={92} />
        </div>
        <div className="w-full min-w-0 flex-1">
          <h3 className="break-words font-heading text-2xl font-bold text-shadow-gold sm:text-3xl">{currentRank?.rankName}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-shadow-purpleLight sm:text-sm">Division {currentRank?.division}</p>
          <div className="mt-5">
            <ProgressBar label={nextRank?.isMaxRank ? 'Apex rank' : `${nextRank?.rpNeeded} RP to ${nextRank?.nextRank?.name}`} value={nextRank?.progressToNextRank} />
          </div>
        </div>
      </div>
    </Card>
  );
}
