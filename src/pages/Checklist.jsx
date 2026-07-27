import { useMemo, useState } from 'react';
import { Ban, Bell, CheckCircle2, Clock, Flame, ListChecks, Plus, Trash2, Volume2 } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { checkAchievements } from '../utils/achievementEngine.js';
import {
  getDefaultTaskReminder,
  getLocalDateKey,
  PRIORITY_OPTIONS,
  REPEAT_OPTIONS,
  SOUND_OPTIONS,
  WEEKDAY_OPTIONS,
} from '../utils/notificationSystem.js';
import { supabase } from '../lib/supabase.js';

const TASKS_KEY = 'shadowAscentChecklistTasks';
const HABITS_KEY = 'shadowAscentBadHabits';
const MILESTONES = [3, 7, 14, 30];

function todayKey() {
  return getLocalDateKey(new Date());
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

function normalizeReminder(reminder) {
  const defaults = getDefaultTaskReminder();
  const nextReminder = {
    ...defaults,
    ...(reminder || {}),
    repeat: Array.isArray(reminder?.repeat) ? reminder?.repeat : defaults?.repeat,
    skippedDates: Array.isArray(reminder?.skippedDates) ? reminder?.skippedDates : defaults?.skippedDates,
  };

  if (nextReminder?.notificationsEnabled && !nextReminder?.reminderDate) {
    nextReminder.reminderDate = todayKey();
  }

  return nextReminder;
}

function formatReminderSummary(reminder) {
  if (!reminder?.notificationsEnabled) {
    return 'Reminder off';
  }

  const repeatLabel = REPEAT_OPTIONS.find((option) => option?.id === reminder?.repeatType)?.label || 'Once';
  return `${reminder?.reminderTime || '18:30'} - ${repeatLabel}`;
}

function syncRow(user, table, payload) {
  if (!user?.id || !supabase) {
    return;
  }

  try {
    supabase
      .from(table)
      .upsert({ ...payload, user_id: user?.id }, { onConflict: 'id' })
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return;
  }
}

function deleteRemoteTask(user, taskId) {
  if (!user?.id || !taskId || !supabase) {
    return;
  }

  try {
    supabase
      .from('checklist_tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user?.id)
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return;
  }
}

function defaultHabits() {
  return [
    { id: 'habit-sugar', title: 'Avoid sugar spiral', streak: 0, lastResistedDate: '', milestonesClaimed: [] },
    { id: 'habit-scroll', title: 'No late doom scrolling', streak: 0, lastResistedDate: '', milestonesClaimed: [] },
    { id: 'habit-skip', title: 'Do not skip planned movement', streak: 0, lastResistedDate: '', milestonesClaimed: [] },
  ];
}

export default function Checklist() {
  const { user, profile, loading, error, updateProfile } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState(() => {
    const storedTasks = readJSON(TASKS_KEY, []);
    return Array.isArray(storedTasks) ? storedTasks : [];
  });
  const [habits, setHabits] = useState(() => {
    const storedHabits = readJSON(HABITS_KEY, defaultHabits());
    return Array.isArray(storedHabits) && storedHabits?.length ? storedHabits : defaultHabits();
  });
  const [taskTitle, setTaskTitle] = useState('');
  const [reminderDraft, setReminderDraft] = useState(() => getDefaultTaskReminder());
  const [editingReminderId, setEditingReminderId] = useState('');
  const [editingReminderDraft, setEditingReminderDraft] = useState(() => getDefaultTaskReminder());
  const [habitTitle, setHabitTitle] = useState('');
  const [localError, setLocalError] = useState('');
  const openTasks = useMemo(() => tasks.filter((task) => !task?.completed)?.length, [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task?.completed)?.length, [tasks]);
  const bestHabitStreak = useMemo(() => habits.reduce((best, habit) => Math.max(best, Number(habit?.streak || 0)), 0), [habits]);
  const editingTask = useMemo(() => tasks.find((task) => task?.id === editingReminderId), [editingReminderId, tasks]);

  function saveTasks(nextTasks) {
    const saved = writeJSON(TASKS_KEY, nextTasks);

    if (!saved) {
      setLocalError('Tasks could not be saved locally.');
      return false;
    }

    setTasks(nextTasks);
    emitEvent('statUpdated', { type: 'tasks', tasks: nextTasks });
    return true;
  }

  function saveHabits(nextHabits) {
    const saved = writeJSON(HABITS_KEY, nextHabits);

    if (!saved) {
      setLocalError('Habits could not be saved locally.');
      return false;
    }

    setHabits(nextHabits);
    emitEvent('statUpdated', { type: 'habits', habits: nextHabits });
    return true;
  }

  function addTask(event) {
    event.preventDefault();
    const title = taskTitle?.trim();

    if (!title) {
      setLocalError('Write a task before adding it.');
      return;
    }

    const task = {
      id: `task-${Date.now()}`,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString(),
      reminder: normalizeReminder(reminderDraft),
    };
    const nextTasks = [task, ...tasks];

    if (saveTasks(nextTasks)) {
      setTaskTitle('');
      setReminderDraft(getDefaultTaskReminder());
      setLocalError('');
      syncRow(user, 'checklist_tasks', task);
    }
  }

  function updateTask(task, updates, toastMessage = '') {
    const nextTask = {
      ...(task || {}),
      ...(updates || {}),
      updatedAt: new Date().toISOString(),
    };
    const nextTasks = tasks.map((entry) => (entry?.id === task?.id ? nextTask : entry));

    if (saveTasks(nextTasks)) {
      syncRow(user, 'checklist_tasks', nextTask);
      if (toastMessage) {
        toast?.success?.(toastMessage);
      }
    }
  }

  function saveTaskReminder(task, reminder, closeEditor = true, toastMessage = 'Reminder saved.') {
    updateTask(task, { reminder: normalizeReminder(reminder) }, toastMessage);
    if (closeEditor) {
      setEditingReminderId('');
      setEditingReminderDraft(getDefaultTaskReminder());
    }
  }

  function openReminderEditor(task) {
    setEditingReminderId(task?.id || '');
    setEditingReminderDraft(normalizeReminder(task?.reminder));
  }

  function closeReminderEditor() {
    setEditingReminderId('');
    setEditingReminderDraft(getDefaultTaskReminder());
  }

  function saveReminderEditor() {
    const task = tasks.find((entry) => entry?.id === editingReminderId);

    if (!task?.id) {
      closeReminderEditor();
      return;
    }

    saveTaskReminder(task, editingReminderDraft, true, 'Reminder saved.');
  }

  function toggleTask(task) {
    const completed = !task?.completed;
    const nextTask = {
      ...task,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    };
    const nextTasks = tasks.map((entry) => (entry?.id === task?.id ? nextTask : entry));

    if (saveTasks(nextTasks)) {
      syncRow(user, 'checklist_tasks', nextTask);
      if (completed) {
        const nextProfile = updateProfile?.({
          xp: Number(profile?.xp || 0) + 5,
          gold: Number(profile?.gold || 0) + 2,
        });
        emitEvent('xpUpdated', { amount: 5, source: 'taskComplete', totalXP: nextProfile?.xp });
        emitEvent('goldUpdated', { amount: 2, source: 'taskComplete', totalGold: nextProfile?.gold });
        toast?.success?.('Quest Complete - +5 XP, +2 gold.');
      }
    }
  }

  function deleteTask(taskId) {
    const nextTasks = tasks.filter((task) => task?.id !== taskId);
    if (saveTasks(nextTasks)) {
      deleteRemoteTask(user, taskId);
      toast?.warning?.('Task deleted and reminder cancelled.');
    }
  }

  function addHabit(event) {
    event.preventDefault();
    const title = habitTitle?.trim();

    if (!title) {
      setLocalError('Name the habit you are resisting.');
      return;
    }

    const habit = {
      id: `habit-${Date.now()}`,
      title,
      streak: 0,
      lastResistedDate: '',
      milestonesClaimed: [],
      createdAt: new Date().toISOString(),
    };
    const nextHabits = [habit, ...habits];

    if (saveHabits(nextHabits)) {
      setHabitTitle('');
      setLocalError('');
      syncRow(user, 'bad_habits', habit);
    }
  }

  function resistHabit(habit) {
    const dateKey = todayKey();

    if (habit?.lastResistedDate === dateKey) {
      toast?.warning?.('Already marked resisted today.');
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const nextStreak = habit?.lastResistedDate === yesterdayKey ? Number(habit?.streak || 0) + 1 : 1;
    const newlyReachedMilestone = MILESTONES.find((milestone) => nextStreak >= milestone && !(habit?.milestonesClaimed || [])?.includes(milestone));
    const nextHabit = {
      ...habit,
      streak: nextStreak,
      bestStreak: Math.max(Number(habit?.bestStreak || 0), nextStreak),
      lastResistedDate: dateKey,
      milestonesClaimed: newlyReachedMilestone ? [...(habit?.milestonesClaimed || []), newlyReachedMilestone] : habit?.milestonesClaimed || [],
      updatedAt: new Date().toISOString(),
    };
    const nextHabits = habits.map((entry) => (entry?.id === habit?.id ? nextHabit : entry));

    if (saveHabits(nextHabits)) {
      const milestoneReward = newlyReachedMilestone ? newlyReachedMilestone * 10 : 8;
      const nextProfile = updateProfile?.({
        xp: Number(profile?.xp || 0) + milestoneReward,
        gold: Number(profile?.gold || 0) + Math.ceil(milestoneReward / 3),
      });
      emitEvent('xpUpdated', { amount: milestoneReward, source: 'habitResisted', totalXP: nextProfile?.xp });
      emitEvent('goldUpdated', { amount: Math.ceil(milestoneReward / 3), source: 'habitResisted', totalGold: nextProfile?.gold });
      syncRow(user, 'bad_habits', nextHabit);
      checkAchievements({ badHabitStreak: nextStreak, goldEarned: nextProfile?.gold });
      toast?.success?.(
        newlyReachedMilestone ? `${newlyReachedMilestone} day milestone reached: +${milestoneReward} XP.` : `Habit resisted: streak ${nextStreak}.`,
      );
    }
  }

  function deleteHabit(habitId) {
    const nextHabits = habits.filter((habit) => habit?.id !== habitId);
    saveHabits(nextHabits);
  }

  return (
    <div className="w-full space-y-6">
      <Card error={error} loading={loading} subtitle="Tasks and bad-habit discipline, stored locally first." title="Checklist" icon={ListChecks}>
        {localError ? <div className="mb-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBadge icon={ListChecks} label="Open Tasks" value={openTasks} />
          <StatBadge icon={CheckCircle2} label="Done" tone="purple" value={completedTasks} />
          <StatBadge icon={Flame} label="Best Streak" value={bestHabitStreak} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>
            My Tasks
          </TabButton>
          <TabButton active={activeTab === 'habits'} onClick={() => setActiveTab('habits')}>
            Bad Habits
          </TabButton>
        </div>
      </Card>

      {activeTab === 'tasks' ? (
        <Card title="My Tasks">
          <form className="mb-5 space-y-4" onSubmit={addTask}>
            <div className="flex flex-col gap-3">
              <input className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" onChange={(event) => setTaskTitle(event?.target?.value || '')} placeholder="Add a task" value={taskTitle} />
            </div>
            <div className="rounded-2xl border border-shadow-purple/20 bg-shadow-purple/5 p-2.5">
              <ReminderFields value={reminderDraft} onChange={setReminderDraft} />
              <Button className="mt-3 w-full" type="submit">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {!tasks?.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-shadow-textSecondary">No tasks yet. Add one to start your vow list.</div> : null}
            {tasks?.map((task) => {
              const reminder = normalizeReminder(task?.reminder);
              const reminderEnabled = Boolean(reminder?.notificationsEnabled);

              return (
                <article className={`rounded-2xl border p-4 ${task?.completed ? 'border-shadow-green/30 bg-shadow-green/10' : 'border-white/10 bg-white/[0.03]'}`} key={task?.id}>
                  <div className="flex items-center gap-3">
                    <button className="text-shadow-gold" onClick={() => toggleTask(task)} type="button" aria-label={task?.completed ? 'Reopen task' : 'Complete task'}>
                      <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${task?.completed ? 'text-shadow-green line-through' : 'text-shadow-text'}`}>{task?.title}</p>
                      <p className="text-xs text-shadow-textMuted">{task?.completedAt ? `Completed ${task?.completedAt?.slice(0, 10)}` : 'Open'}</p>
                    </div>
                    <button className="rounded-xl border border-white/10 p-2 text-shadow-textMuted transition hover:border-shadow-red/40 hover:text-shadow-red" onClick={() => deleteTask(task?.id)} type="button" aria-label="Delete task">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className={`mt-3 rounded-xl border px-3 py-2 ${reminderEnabled ? 'border-shadow-gold/25 bg-shadow-gold/10' : 'border-white/10 bg-black/20'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Bell className={reminderEnabled ? 'h-4 w-4 shrink-0 text-shadow-gold' : 'h-4 w-4 shrink-0 text-shadow-textMuted'} aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-shadow-text">{formatReminderSummary(reminder)}</p>
                          {reminderEnabled ? <p className="truncate text-[11px] text-shadow-textMuted">{reminder?.message || 'Quest Reminder'}</p> : null}
                        </div>
                      </div>
                      <button className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-shadow-purpleLight transition hover:border-shadow-purple/40" onClick={() => openReminderEditor(task)} type="button">
                        Edit
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card title="Bad Habits">
          <form className="mb-5 flex flex-col gap-3 sm:flex-row" onSubmit={addHabit}>
            <input className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" onChange={(event) => setHabitTitle(event?.target?.value || '')} placeholder="Track a bad habit" value={habitTitle} />
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </Button>
          </form>

          <div className="space-y-3">
            {!habits?.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-shadow-textSecondary">No bad habits tracked yet.</div> : null}
            {habits?.map((habit) => {
              const resistedToday = habit?.lastResistedDate === todayKey();

              return (
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={habit?.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Ban className="mt-1 h-5 w-5 text-shadow-red" aria-hidden="true" />
                      <div>
                        <h3 className="font-heading text-lg font-bold text-shadow-gold">{habit?.title}</h3>
                        <p className="mt-1 text-sm text-shadow-textSecondary">
                          Current streak: <span className="font-semibold text-shadow-purpleLight">{habit?.streak || 0}</span> days
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-shadow-textMuted">
                          Milestones: {(habit?.milestonesClaimed || [])?.length ? habit?.milestonesClaimed?.join(' / ') : 'None yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button disabled={resistedToday} onClick={() => resistHabit(habit)} variant={resistedToday ? 'ghost' : 'secondary'}>
                        {resistedToday ? 'Held Today' : 'Resisted'}
                      </Button>
                      <button className="rounded-xl border border-white/10 p-2 text-shadow-textMuted transition hover:border-shadow-red/40 hover:text-shadow-red" onClick={() => deleteHabit(habit?.id)} type="button" aria-label="Delete habit">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      )}

      <Modal
        description={editingTask?.title ? `Customize reminder for ${editingTask?.title}.` : 'Customize this task reminder.'}
        onClose={closeReminderEditor}
        open={Boolean(editingReminderId)}
        title="Edit Reminder"
      >
        <div className="space-y-5">
          <ReminderFields value={editingReminderDraft} onChange={setEditingReminderDraft} />
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
            <Button onClick={closeReminderEditor} variant="ghost">
              Cancel
            </Button>
            <Button onClick={saveReminderEditor}>
              <Bell className="h-4 w-4" aria-hidden="true" />
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition ${active ? 'bg-shadow-gold/15 text-shadow-gold shadow-goldGlow' : 'text-shadow-textSecondary hover:bg-white/[0.04] hover:text-shadow-text'}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ReminderFields({ value, onChange }) {
  const reminder = normalizeReminder(value);
  const labelClass = 'text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-shadow-textMuted';
  const fieldClass = 'mt-1.5 min-h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-shadow-text outline-none focus:border-shadow-gold/40';

  function update(field, nextValue) {
    onChange?.(normalizeReminder({
      ...(reminder || {}),
      [field]: nextValue,
    }));
  }

  function toggleDay(dayId) {
    const repeat = Array.isArray(reminder?.repeat) ? reminder?.repeat : [];
    const nextRepeat = repeat?.includes(dayId) ? repeat?.filter((day) => day !== dayId) : [...repeat, dayId];
    update('repeat', nextRepeat);
  }

  return (
    <div className="space-y-3">
      <label className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${reminder?.notificationsEnabled ? 'border-shadow-gold/30 bg-shadow-gold/10' : 'border-white/10 bg-black/20'}`}>
        <span className="flex items-center gap-2.5">
          <Bell className="h-4 w-4 text-shadow-purpleLight" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold text-shadow-text">Reminder</span>
            <span className="text-xs text-shadow-textMuted">Off until enabled.</span>
          </span>
        </span>
        <input checked={Boolean(reminder?.notificationsEnabled)} className="sr-only" onChange={(event) => update('notificationsEnabled', event?.target?.checked)} type="checkbox" />
        <span className={`relative h-7 w-12 rounded-full border transition ${reminder?.notificationsEnabled ? 'border-shadow-gold bg-shadow-gold' : 'border-white/20 bg-black/40'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${reminder?.notificationsEnabled ? 'left-6' : 'left-1'}`} />
        </span>
      </label>

      {reminder?.notificationsEnabled ? (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Date</span>
              <input className={fieldClass} onChange={(event) => update('reminderDate', event?.target?.value || '')} type="date" value={reminder?.reminderDate || ''} />
            </label>
            <label>
              <span className={labelClass}>Time</span>
              <input className={fieldClass} onChange={(event) => update('reminderTime', event?.target?.value || '18:30')} type="time" value={reminder?.reminderTime || '18:30'} />
            </label>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Repeat</span>
              <select className={fieldClass} onChange={(event) => update('repeatType', event?.target?.value || 'once')} value={reminder?.repeatType || 'once'}>
                {REPEAT_OPTIONS?.map((option) => (
                  <option className="bg-shadow-secondary text-shadow-text" key={option?.id} value={option?.id}>
                    {option?.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Priority</span>
              <select className={fieldClass} onChange={(event) => update('priority', event?.target?.value || 'normal')} value={reminder?.priority || 'normal'}>
                {PRIORITY_OPTIONS?.map((option) => (
                  <option className="bg-shadow-secondary text-shadow-text" key={option?.id} value={option?.id}>
                    {option?.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {reminder?.repeatType === 'selectedDays' ? (
            <div>
              <span className={labelClass}>Selected Days</span>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {WEEKDAY_OPTIONS?.map((day) => {
                  const active = (reminder?.repeat || [])?.includes(day?.id);
                  return (
                    <button className={`min-h-8 rounded-lg border px-2 text-[11px] font-semibold transition ${active ? 'border-shadow-gold/40 bg-shadow-gold/20 text-shadow-gold' : 'border-white/10 bg-black/20 text-shadow-textSecondary'}`} key={day?.id} onClick={() => toggleDay(day?.id)} type="button">
                      {day?.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2.5 sm:grid-cols-3">
            <label>
              <span className={labelClass}>Sound</span>
              <select className={fieldClass} onChange={(event) => update('soundName', event?.target?.value || 'soft-chime')} value={reminder?.soundName || 'soft-chime'}>
                {SOUND_OPTIONS?.map((option) => (
                  <option className="bg-shadow-secondary text-shadow-text" key={option?.id} value={option?.id}>
                    {option?.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Snooze</span>
              <input className={fieldClass} min="1" onChange={(event) => update('snoozeMinutes', Number(event?.target?.value || 10))} type="number" value={reminder?.snoozeMinutes || 10} />
            </label>
            <label>
              <span className={labelClass}>Custom</span>
              <input className={fieldClass} onChange={(event) => update('customSchedule', event?.target?.value || '')} placeholder="Every 2 days" value={reminder?.customSchedule || ''} />
            </label>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <CompactSwitch checked={reminder?.sound} icon={Volume2} label="Sound" onChange={(value) => update('sound', value)} />
            <CompactSwitch checked={reminder?.vibration} icon={Bell} label="Vibration" onChange={(value) => update('vibration', value)} />
            <CompactSwitch checked={reminder?.quietHoursOverride} icon={Clock} label="Quiet Override" onChange={(value) => update('quietHoursOverride', value)} />
          </div>

          <label className="block">
            <span className={labelClass}>Reminder Message</span>
            <input className={fieldClass} onChange={(event) => update('message', event?.target?.value || '')} placeholder="Hydration Low - Restore Stamina" value={reminder?.message || ''} />
          </label>
        </>
      ) : null}
    </div>
  );
}

function CompactSwitch({ checked, icon: Icon, label, onChange }) {
  return (
    <label className={`flex min-h-9 items-center justify-between gap-2 rounded-xl border px-2.5 ${checked ? 'border-shadow-gold/30 bg-shadow-gold/10' : 'border-white/10 bg-black/20'}`}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-shadow-text">
        {Icon ? <Icon className="h-3.5 w-3.5 text-shadow-purpleLight" aria-hidden="true" /> : null}
        {label}
      </span>
      <input checked={Boolean(checked)} className="sr-only" onChange={(event) => onChange?.(event?.target?.checked)} type="checkbox" />
      <span className={`relative h-5 w-9 rounded-full border transition ${checked ? 'border-shadow-gold bg-shadow-gold' : 'border-white/20 bg-black/40'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
    </label>
  );
}
