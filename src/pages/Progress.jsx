import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Award, CheckCircle2, Coins, Dumbbell, Flame, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import HeatmapGrid from '../components/features/HeatmapGrid.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { ACHIEVEMENTS, getUnlockedAchievements } from '../utils/achievementEngine.js';
import { getRPHistory } from '../utils/rankEngine.js';
import { ANALYTICS_PERIODS, buildGoldSeries, buildXPSeries, getXPLevelProgress } from '../utils/progressAnalytics.js';
import { loadProgressEvents, PROGRESS_HISTORY_UPDATED_EVENT, readProgressEvents } from '../utils/progressEvents.js';

const WORKOUT_HISTORY_KEY = 'shadowAscentWorkoutHistory';
const QUEST_HISTORY_KEY = 'shadowAscentQuestHistory';
const QUEST_STATE_KEY = 'shadowAscentDailyQuests';
const TASKS_KEY = 'shadowAscentChecklistTasks';
const HABITS_KEY = 'shadowAscentBadHabits';
const BRAIN_HISTORY_KEY = 'shadowAscentBrainQuestHistory';
const INVENTORY_KEY = 'shadowAscentInventory';
const DASHBOARD_FOCUS_KEY = 'shadowAscentDashboardFocus';

const SHOP_ITEM_PRICES = {
  'hood-initiate': 60,
  'cloak-violet': 120,
  'gauntlets-iron': 150,
  'boots-sprinter': 140,
  'band-focus': 90,
  'blade-shadow': 220,
  'ring-gold': 260,
  'crown-ascent': 500,
  'mat-recovery': 80,
  'rope-cardio': 110,
  'bells-dual': 240,
  'sigil-mind': 130,
  'badge-streak': 170,
  'armor-platinum': 360,
  'core-crystal': 700,
};

const CHART_COLORS = ['#f0c040', '#8b5cf6', '#22c55e', '#6ab0ff', '#ef4444', '#00d4ff'];
const CHART_GRID_STROKE = 'rgba(255,255,255,0.08)';
const CHART_AXIS_STROKE = '#8ba7c7';
const CHART_AXIS_PROPS = {
  axisLine: { stroke: CHART_AXIS_STROKE, strokeWidth: 2 },
  tick: { fill: '#9ca3af', fontSize: 12 },
  tickLine: { stroke: CHART_AXIS_STROKE, strokeWidth: 2 },
};
const TIGHT_CHART_MARGIN = { top: 8, right: 4, left: -18, bottom: 0 };
const VERTICAL_CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };
const ACHIEVEMENT_CHART_MARGIN = { top: 6, right: 0, left: -20, bottom: 0 };
const TOOLTIP_CONTENT_STYLE = {
  background: '#111118',
  border: '1px solid rgba(240,192,64,0.3)',
  borderRadius: '12px',
  color: '#ffffff',
};
const TOOLTIP_LABEL_STYLE = {
  color: '#ffffff',
  fontWeight: 700,
};
const TOOLTIP_ITEM_STYLE = {
  color: '#ffffff',
};

function renderAchievementTick({ x, y, payload }) {
  const words = String(payload?.value || '').split(' ');
  const firstLine = words?.[0] || '';
  const secondLine = words?.slice(1)?.join(' ') || '';

  return (
    <text fill="#9ca3af" fontSize={11} textAnchor="end" x={x} y={y}>
      <tspan x={x} dy={secondLine ? -3 : 4}>
        {firstLine}
      </tspan>
      {secondLine ? (
        <tspan x={x} dy={13}>
          {secondLine}
        </tspan>
      ) : null}
    </text>
  );
}

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function toDateKey(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

function makeRecentDays(days = 42) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

function groupByDate(entries, dateGetter, valueGetter) {
  return entries.reduce((acc, entry) => {
    const dateKey = dateGetter(entry);

    if (!dateKey) {
      return acc;
    }

    return {
      ...acc,
      [dateKey]: Number(acc?.[dateKey] || 0) + Number(valueGetter(entry) || 0),
    };
  }, {});
}

function getStoredProgressData(profile, userId) {
  const workouts = readJSON(WORKOUT_HISTORY_KEY, []);
  const questHistory = readJSON(QUEST_HISTORY_KEY, []);
  const questState = readJSON(QUEST_STATE_KEY, {});
  const tasks = readJSON(TASKS_KEY, []);
  const habits = readJSON(HABITS_KEY, []);
  const brainHistory = readJSON(BRAIN_HISTORY_KEY, []);
  const inventory = readJSON(INVENTORY_KEY, []);
  const dashboardFocus = readJSON(DASHBOARD_FOCUS_KEY, null);
  const rpHistory = getRPHistory();
  const unlockedAchievements = getUnlockedAchievements();

  return {
    workouts: Array.isArray(workouts) ? workouts : [],
    questHistory: Array.isArray(questHistory) ? questHistory : [],
    questState: questState && typeof questState === 'object' ? questState : {},
    tasks: Array.isArray(tasks) ? tasks : [],
    habits: Array.isArray(habits) ? habits : [],
    brainHistory: Array.isArray(brainHistory) ? brainHistory : [],
    inventory: Array.isArray(inventory) ? inventory : [],
    dashboardFocus: dashboardFocus && typeof dashboardFocus === 'object' ? dashboardFocus : null,
    rpHistory,
    unlockedAchievements,
    profile: profile || {},
    progressEvents: readProgressEvents(userId),
    shopItemPrices: SHOP_ITEM_PRICES,
  };
}

function buildRadarData(data) {
  const questCount = data?.questHistory?.length || 0;
  const workoutMinutes = data?.workouts?.reduce((total, workout) => total + Number(workout?.durationMinutes || 0), 0);
  const brainScore = data?.brainHistory?.reduce((total, entry) => total + Number(entry?.score || 0), 0);
  const completedTasks = data?.tasks?.filter((task) => task?.completed)?.length || 0;
  const bestHabit = data?.habits?.reduce((best, habit) => Math.max(best, Number(habit?.bestStreak || habit?.streak || 0)), 0);

  const values = [
    { label: 'Quests', value: questCount },
    { label: 'Workout', value: workoutMinutes },
    { label: 'Brain', value: brainScore },
    { label: 'Tasks', value: completedTasks },
    { label: 'Habits', value: bestHabit },
  ];

  return values.filter((entry) => entry?.value > 0);
}

function buildPieData(data) {
  const entries = [
    { name: 'Quests', value: data?.questHistory?.length || 0 },
    { name: 'Workouts', value: data?.workouts?.length || 0 },
    { name: 'Brain', value: data?.brainHistory?.length || 0 },
    { name: 'Tasks', value: data?.tasks?.filter((task) => task?.completed)?.length || 0 },
    { name: 'Habits', value: data?.habits?.filter((habit) => habit?.lastResistedDate)?.length || 0 },
  ];

  return entries.filter((entry) => entry?.value > 0);
}

function buildWorkoutFrequency(data) {
  const grouped = groupByDate(data?.workouts || [], (workout) => workout?.dateKey || toDateKey(workout?.completedAt), () => 1);

  return Object.keys(grouped)
    .sort()
    .map((date) => ({
      date,
      workouts: grouped?.[date],
      minutes: data?.workouts
        ?.filter((workout) => (workout?.dateKey || toDateKey(workout?.completedAt)) === date)
        ?.reduce((total, workout) => total + Number(workout?.durationMinutes || 0), 0),
    }));
}

function buildHeatmapData(data) {
  const recentDays = makeRecentDays(42);
  const questByDate = groupByDate(data?.questHistory || [], (entry) => toDateKey(entry?.completedAt), () => 1);
  const workoutByDate = groupByDate(data?.workouts || [], (entry) => entry?.dateKey || toDateKey(entry?.completedAt), () => 1);
  const brainByDate = groupByDate(data?.brainHistory || [], (entry) => entry?.dateKey || toDateKey(entry?.completedAt), () => 1);
  const habitByDate = data?.habits?.reduce((acc, habit) => {
    const dateKey = habit?.lastResistedDate;

    if (!dateKey) {
      return acc;
    }

    return {
      ...acc,
      [dateKey]: Number(acc?.[dateKey] || 0) + 1,
    };
  }, {});

  return recentDays.map((date) => ({
    date,
    value: Number(questByDate?.[date] || 0) + Number(workoutByDate?.[date] || 0) + Number(brainByDate?.[date] || 0) + Number(habitByDate?.[date] || 0),
  }));
}

function buildHabitDiscipline(data) {
  return data?.habits
    ?.filter((habit) => Number(habit?.streak || habit?.bestStreak || 0) > 0 || habit?.lastResistedDate)
    ?.map((habit) => ({
      name: habit?.title,
      current: Number(habit?.streak || 0),
      best: Number(habit?.bestStreak || habit?.streak || 0),
    }));
}

function buildAchievementProgress(data) {
  return ACHIEVEMENTS.map((achievement) => ({
    name: achievement?.title,
    unlocked: data?.unlockedAchievements?.some((entry) => entry?.id === achievement?.id) ? 1 : 0,
    locked: data?.unlockedAchievements?.some((entry) => entry?.id === achievement?.id) ? 0 : 1,
  }));
}

function ProgressChart({ children, empty, emptyText = 'No chart data recorded yet.' }) {
  if (empty) {
    return <div className="flex h-72 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-shadow-textSecondary">{emptyText}</div>;
  }

  return <div className="h-72 w-full">{children}</div>;
}

function ChartPeriodSelector({ label, onChange, value }) {
  return (
    <div aria-label={`${label} range`} className="mb-4 grid grid-cols-4 rounded-xl border border-white/10 bg-black/20 p-1" role="group">
      {ANALYTICS_PERIODS.map((period) => (
        <button
          aria-pressed={value === period?.id}
          className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition ${
            value === period?.id ? 'bg-shadow-gold text-black' : 'text-shadow-textSecondary hover:bg-white/[0.05] hover:text-white'
          }`}
          key={period?.id}
          onClick={() => onChange?.(period?.id)}
          type="button"
        >
          {period?.label}
        </button>
      ))}
    </div>
  );
}

export default function Progress() {
  const { user, profile, loading, error } = useAuth();
  const [progressData, setProgressData] = useState(() => getStoredProgressData(profile, user?.id));
  const [xpPeriod, setXPPeriod] = useState('daily');
  const [goldPeriod, setGoldPeriod] = useState('daily');

  useEffect(() => {
    let active = true;

    function refreshProgressData() {
      setProgressData(getStoredProgressData(profile, user?.id));
    }

    refreshProgressData();
    if (user?.id) {
      loadProgressEvents(user?.id).then((events) => {
        if (active) {
          setProgressData({ ...getStoredProgressData(profile, user?.id), progressEvents: events });
        }
      });
    }

    const events = ['statUpdated', 'rpUpdated', 'xpUpdated', 'goldUpdated', PROGRESS_HISTORY_UPDATED_EVENT, 'brainQuestCompleted', 'dailyQuestUpdated', 'workoutCompleted', 'achievementUnlocked', 'rankUp'];
    events.forEach((eventName) => globalThis?.addEventListener?.(eventName, refreshProgressData));

    return () => {
      active = false;
      events.forEach((eventName) => globalThis?.removeEventListener?.(eventName, refreshProgressData));
    };
  }, [profile, user?.id]);

  const xpProgression = useMemo(() => buildXPSeries(progressData, xpPeriod), [progressData, xpPeriod]);
  const radarData = useMemo(() => buildRadarData(progressData), [progressData]);
  const pieData = useMemo(() => buildPieData(progressData), [progressData]);
  const workoutFrequency = useMemo(() => buildWorkoutFrequency(progressData), [progressData]);
  const heatmapData = useMemo(() => buildHeatmapData(progressData), [progressData]);
  const habitDiscipline = useMemo(() => buildHabitDiscipline(progressData), [progressData]);
  const goldEconomy = useMemo(() => buildGoldSeries(progressData, goldPeriod), [goldPeriod, progressData]);
  const xpLevel = useMemo(() => getXPLevelProgress(progressData?.profile), [progressData?.profile]);
  const achievementProgress = useMemo(() => buildAchievementProgress(progressData), [progressData]);
  const totalWorkouts = progressData?.workouts?.length || 0;
  const totalQuests = progressData?.questHistory?.length || 0;
  const totalAchievements = progressData?.unlockedAchievements?.length || 0;
  const totalActivity = heatmapData.reduce((total, day) => total + Number(day?.value || 0), 0);

  return (
    <div className="w-full space-y-6">
      <Card error={error} loading={loading} subtitle="Charts render only from stored quest, workout, habit, gold, rank, and achievement data." title="Progress" icon={TrendingUp}>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatBadge icon={Dumbbell} label="Workouts" value={totalWorkouts} />
          <StatBadge icon={CheckCircle2} label="Quests" tone="purple" value={totalQuests} />
          <StatBadge icon={Award} label="Achievements" value={`${totalAchievements}/${ACHIEVEMENTS?.length}`} />
          <StatBadge icon={Activity} label="42 Day Activity" tone="purple" value={totalActivity} />
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card title="XP Progression" icon={TrendingUp}>
          <ChartPeriodSelector label="XP progression" onChange={setXPPeriod} value={xpPeriod} />
          <ProgressChart empty={!xpProgression?.length}>
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={xpProgression} margin={TIGHT_CHART_MARGIN}>
                <defs>
                  <linearGradient id="xpGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" height={28} minTickGap={18} tickMargin={6} {...CHART_AXIS_PROPS} />
                <YAxis tickMargin={4} width={42} {...CHART_AXIS_PROPS} />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                <ReferenceLine label={{ fill: '#f0c040', fontSize: 11, position: 'insideTopRight', value: `Level ${xpLevel?.level + 1}` }} stroke="rgba(240,192,64,0.45)" strokeDasharray="4 4" y={xpLevel?.nextLevelXP} />
                <Area dataKey="xp" fill="url(#xpGradient)" stroke="#f0c040" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ProgressChart>
        </Card>

        <Card title="Stat Radar" icon={Activity}>
          <ProgressChart empty={!radarData?.length}>
            <ResponsiveContainer height="100%" width="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="label" stroke="#9ca3af" />
                <Radar dataKey="value" fill="#8b5cf6" fillOpacity={0.34} stroke="#f0c040" strokeWidth={2} />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          </ProgressChart>
        </Card>

        <Card title="Activity Mix" icon={PieChartIcon}>
          <ProgressChart empty={!pieData?.length}>
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={55} nameKey="name" outerRadius={95} paddingAngle={4}>
                  {pieData?.map((entry, index) => (
                    <Cell fill={CHART_COLORS?.[index % CHART_COLORS?.length]} key={entry?.name} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </ProgressChart>
        </Card>

        <Card title="Workout Frequency" icon={Dumbbell}>
          <ProgressChart empty={!workoutFrequency?.length}>
            <ResponsiveContainer height="100%" width="100%">
              <BarChart barCategoryGap="48%" barGap={5} data={workoutFrequency} margin={TIGHT_CHART_MARGIN}>
                <CartesianGrid stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="date" height={28} interval={0} minTickGap={4} tickMargin={6} {...CHART_AXIS_PROPS} />
                <YAxis tickMargin={4} width={34} {...CHART_AXIS_PROPS} />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                <Bar barSize={14} dataKey="workouts" fill="#8b5cf6" maxBarSize={18} radius={[5, 5, 0, 0]} />
                <Bar barSize={14} dataKey="minutes" fill="#f0c040" maxBarSize={18} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ProgressChart>
        </Card>

        <Card title="Habit Discipline" icon={Flame}>
          <ProgressChart empty={!habitDiscipline?.length}>
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={habitDiscipline}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                <Bar dataKey="current" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="best" fill="#f0c040" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ProgressChart>
        </Card>

        <Card title="Gold Economy" icon={Coins}>
          <ChartPeriodSelector label="Gold economy" onChange={setGoldPeriod} value={goldPeriod} />
          <ProgressChart empty={!goldEconomy?.length}>
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={goldEconomy} margin={TIGHT_CHART_MARGIN}>
                <CartesianGrid stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" height={28} minTickGap={18} tickMargin={6} {...CHART_AXIS_PROPS} />
                <YAxis tickMargin={4} width={34} {...CHART_AXIS_PROPS} />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                <Legend />
                <Line activeDot={{ fill: '#f0c040', r: 6, stroke: '#0a0a0f', strokeWidth: 2 }} dataKey="earned" dot={{ fill: '#f0c040', r: 4, strokeWidth: 0 }} name="earned" stroke="#f0c040" strokeWidth={3} type="monotone" />
                <Line activeDot={{ fill: '#ef4444', r: 6, stroke: '#0a0a0f', strokeWidth: 2 }} dataKey="spent" dot={{ fill: '#ef4444', r: 4, strokeWidth: 0 }} name="spent" stroke="#ef4444" strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </ProgressChart>
        </Card>
      </section>

      <Card title="42 Day Heatmap" icon={Activity}>
        <HeatmapGrid data={heatmapData} empty={!heatmapData?.some((day) => Number(day?.value || 0) > 0)} />
      </Card>

      <Card bodyClassName="px-2 py-5 sm:px-4" title="Achievement Progress" icon={Award}>
        <ProgressChart empty={!achievementProgress?.length}>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart barCategoryGap="22%" data={achievementProgress} layout="vertical" margin={ACHIEVEMENT_CHART_MARGIN}>
              <CartesianGrid stroke={CHART_GRID_STROKE} />
              <XAxis domain={[0, 1]} height={24} tickMargin={2} ticks={[0, 0.25, 0.5, 0.75, 1]} type="number" {...CHART_AXIS_PROPS} />
              <YAxis dataKey="name" interval={0} tick={renderAchievementTick} tickMargin={1} type="category" width={76} axisLine={{ stroke: CHART_AXIS_STROKE, strokeWidth: 2 }} tickLine={{ stroke: CHART_AXIS_STROKE, strokeWidth: 2 }} />
              <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              <Bar barSize={10} dataKey="unlocked" fill="#22c55e" maxBarSize={12} radius={[0, 6, 6, 0]} />
              <Bar barSize={10} dataKey="locked" fill="#6b7280" maxBarSize={12} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ProgressChart>
      </Card>
    </div>
  );
}
