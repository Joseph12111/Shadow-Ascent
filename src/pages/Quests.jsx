import { useMemo, useState } from 'react';
import { Brain, CheckCircle2, Flame, ScrollText, ShieldCheck, Trophy } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import BrainQuestModal from '../components/features/BrainQuestModal.jsx';
import BrainQuestResetTimer from '../components/features/BrainQuestResetTimer.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { addRP } from '../utils/rankEngine.js';
import { checkAchievements } from '../utils/achievementEngine.js';
import { supabase } from '../lib/supabase.js';

const QUEST_STATE_KEY = 'shadowAscentDailyQuests';
const QUEST_HISTORY_KEY = 'shadowAscentQuestHistory';

const DAILY_QUESTS = [
  { id: 'hydrate', title: 'Hydration Sigil', description: 'Drink water with intention before your next meal.', icon: ShieldCheck, reward: { xp: 15, gold: 8, rp: 10 } },
  { id: 'move', title: 'Movement Rite', description: 'Complete at least 10 minutes of movement.', icon: Flame, reward: { xp: 20, gold: 10, rp: 15 } },
  { id: 'protein', title: 'Forge Fuel', description: 'Eat a protein-centered meal.', icon: Trophy, reward: { xp: 15, gold: 8, rp: 10 } },
  { id: 'plan', title: 'Tactical Plan', description: 'Write or review today top priority.', icon: ScrollText, reward: { xp: 10, gold: 6, rp: 8 } },
  { id: 'mind', title: 'Mind Trial', description: 'Complete the daily brain quest.', icon: Brain, reward: { xp: 25, gold: 12, rp: 20 }, brainQuest: true },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    globalThis?.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function emitEvent(eventName, detail) {
  try {
    globalThis?.dispatchEvent?.(new CustomEvent(eventName, { detail }));
  } catch {
    return false;
  }

  return true;
}

function syncQuestCompletion(user, payload) {
  if (!user?.id || !supabase) {
    return;
  }

  try {
    supabase
      .from('daily_quest_history')
      .upsert({ ...payload, user_id: user?.id }, { onConflict: 'user_id,date_key,quest_id' })
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return;
  }
}

function getQuestState() {
  const state = readJSON(QUEST_STATE_KEY, {});
  const dateKey = todayKey();

  return {
    ...state,
    [dateKey]: state?.[dateKey] || { completed: {}, streak: 0 },
  };
}

export default function Quests() {
  const { user, profile, loading, error, updateProfile } = useAuth();
  const toast = useToast();
  const [questState, setQuestState] = useState(() => getQuestState());
  const [brainOpen, setBrainOpen] = useState(false);
  const dateKey = todayKey();
  const todayState = questState?.[dateKey] || { completed: {}, streak: 0 };
  const completedCount = useMemo(() => Object.values(todayState?.completed || {}).filter(Boolean)?.length, [todayState?.completed]);
  const empty = DAILY_QUESTS?.length === 0;

  function completeQuest(quest) {
    if (todayState?.completed?.[quest?.id]) {
      toast?.warning?.('That quest reward has already been claimed today.');
      return;
    }

    if (quest?.brainQuest) {
      setBrainOpen(true);
      return;
    }

    applyQuestReward(quest, quest?.reward);
  }

  function applyQuestReward(quest, reward) {
    const nextCompleted = {
      ...(todayState?.completed || {}),
      [quest?.id]: true,
    };
    const nextCompletedCount = Object.values(nextCompleted || {}).filter(Boolean)?.length;
    const nextDailyState = {
      ...todayState,
      completed: nextCompleted,
      streak: nextCompletedCount === DAILY_QUESTS?.length ? Number(todayState?.streak || 0) + 1 : Number(todayState?.streak || 0),
      updatedAt: new Date().toISOString(),
    };
    const nextState = {
      ...questState,
      [dateKey]: nextDailyState,
    };
    const history = readJSON(QUEST_HISTORY_KEY, []);
    const historyEntry = {
      id: `${dateKey}-${quest?.id}`,
      dateKey,
      questId: quest?.id,
      reward,
      completedAt: nextDailyState?.updatedAt,
    };
    const savedState = writeJSON(QUEST_STATE_KEY, nextState);
    const savedHistory = writeJSON(QUEST_HISTORY_KEY, [historyEntry, ...(Array.isArray(history) ? history : [])].slice(0, 250));

    if (!savedState || !savedHistory) {
      toast?.error?.('Quest progress could not be saved locally.');
      return;
    }

    setQuestState(nextState);
    const rpResult = addRP(reward?.rp || 0, `quest:${quest?.id}`);
    const nextProfile = updateProfile?.({
      xp: Number(profile?.xp || 0) + Number(reward?.xp || 0),
      gold: Number(profile?.gold || 0) + Number(reward?.gold || 0),
      total_rp: rpResult?.totalRP,
    });
    emitEvent('dailyQuestUpdated', { questId: quest?.id, completed: true, dateKey, reward });
    emitEvent('xpUpdated', { amount: reward?.xp, source: 'dailyQuest', totalXP: nextProfile?.xp });
    emitEvent('goldUpdated', { amount: reward?.gold, source: 'dailyQuest', totalGold: nextProfile?.gold });
    syncQuestCompletion(user, { date_key: dateKey, quest_id: quest?.id, reward, completed_at: historyEntry?.completedAt });
    checkAchievements({
      totalRP: rpResult?.totalRP,
      dailyQuestsCompleted: nextCompletedCount,
      goldEarned: nextProfile?.gold,
    });
    toast?.success?.(`${quest?.title} complete: +${reward?.xp} XP, +${reward?.gold} gold, +${reward?.rp} RP.`);
  }

  function handleBrainComplete(result) {
    const mindQuest = DAILY_QUESTS.find((quest) => quest?.id === 'mind');
    const reward = {
      xp: Number(mindQuest?.reward?.xp || 0) + Number(result?.pointsAwarded || 0),
      gold: mindQuest?.reward?.gold || 0,
      rp: Number(mindQuest?.reward?.rp || 0) + Number(result?.pointsAwarded || 0),
    };

    if (!todayState?.completed?.mind) {
      applyQuestReward(mindQuest, reward);
    }
  }

  return (
    <div className="w-full space-y-6">
      <Card empty={empty} error={error} loading={loading} subtitle="Five daily quests. Rewards can be claimed once per day." title="Daily Quests" icon={ScrollText}>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBadge icon={CheckCircle2} label="Completed" value={`${completedCount}/5`} />
          <StatBadge icon={Flame} label="Streak" tone="purple" value={todayState?.streak || 0} />
          <div className="flex items-center justify-center rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-3">
            <BrainQuestResetTimer />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {DAILY_QUESTS?.map((quest) => {
          const Icon = quest?.icon;
          const completed = Boolean(todayState?.completed?.[quest?.id]);

          return (
            <article className={`glass-card p-5 transition ${completed ? 'border-shadow-green/30' : 'hover:border-shadow-gold/30'}`} key={quest?.id}>
              <div className="flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${completed ? 'border-shadow-green/30 text-shadow-green' : 'border-shadow-purple/30 text-shadow-purpleLight'}`}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-xl font-bold text-shadow-gold">{quest?.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-shadow-textSecondary">{quest?.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-shadow-purpleLight">
                    +{quest?.reward?.xp} XP / +{quest?.reward?.gold} Gold / +{quest?.reward?.rp} RP
                  </p>
                </div>
              </div>
              <Button className="mt-5 w-full" disabled={completed} onClick={() => completeQuest(quest)} variant={completed ? 'ghost' : 'primary'}>
                {completed ? 'Reward Claimed' : quest?.brainQuest ? 'Open Brain Quest' : 'Complete Quest'}
              </Button>
            </article>
          );
        })}
      </div>

      <BrainQuestModal onClose={() => setBrainOpen(false)} onComplete={handleBrainComplete} open={brainOpen} />
    </div>
  );
}
