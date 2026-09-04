export const CHECKLIST_TASKS_KEY = 'shadowAscentChecklistTasks';
export const CHECKLIST_LAST_RESET_KEY = 'shadowAscentChecklistLastResetDate';
export const CHECKLIST_DAILY_RESET_EVENT = 'checklistDailyReset';

export function getLocalChecklistDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readStoredTasks() {
  try {
    const storedTasks = globalThis?.localStorage?.getItem(CHECKLIST_TASKS_KEY);
    const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];
    return Array.isArray(parsedTasks) ? parsedTasks : [];
  } catch {
    return [];
  }
}

function getStoredResetDate() {
  try {
    return globalThis?.localStorage?.getItem(CHECKLIST_LAST_RESET_KEY) || '';
  } catch {
    return '';
  }
}

function wasCompletedBeforeToday(task, today) {
  if (!task?.completed) {
    return false;
  }

  if (!task?.completedAt) {
    return true;
  }

  const completedAt = new Date(task.completedAt);
  return Number.isNaN(completedAt.getTime()) || getLocalChecklistDateKey(completedAt) !== today;
}

export function resetTaskCompletionForNewDay(tasks, lastResetDate, today) {
  if (!Array.isArray(tasks) || lastResetDate === today) {
    return { tasks: Array.isArray(tasks) ? tasks : [], changed: false };
  }

  let changed = false;
  const hasPreviousResetDate = Boolean(lastResetDate);
  const nextTasks = tasks.map((task) => {
    const shouldReset = hasPreviousResetDate
      ? Boolean(task?.completed || task?.completedAt)
      : wasCompletedBeforeToday(task, today);

    if (!shouldReset) {
      return task;
    }

    changed = true;
    return {
      ...task,
      completed: false,
      completedAt: null,
    };
  });

  return { tasks: nextTasks, changed };
}

export function resetDailyChecklistIfNeeded(now = new Date()) {
  const today = getLocalChecklistDateKey(now);
  const lastResetDate = getStoredResetDate();
  const storedTasks = readStoredTasks();
  const result = resetTaskCompletionForNewDay(storedTasks, lastResetDate, today);

  if (lastResetDate === today) {
    return { ...result, dateKey: today };
  }

  try {
    if (result.changed) {
      globalThis?.localStorage?.setItem(CHECKLIST_TASKS_KEY, JSON.stringify(result.tasks));
    }
    globalThis?.localStorage?.setItem(CHECKLIST_LAST_RESET_KEY, today);
  } catch {
    return { tasks: storedTasks, changed: false, dateKey: today };
  }

  if (result.changed) {
    const detail = { type: 'tasks', reason: 'daily-reset', tasks: result.tasks, dateKey: today };
    globalThis?.dispatchEvent?.(new CustomEvent(CHECKLIST_DAILY_RESET_EVENT, { detail }));
    globalThis?.dispatchEvent?.(new CustomEvent('statUpdated', { detail }));
  }

  return { ...result, dateKey: today };
}

export function millisecondsUntilNextLocalDay(now = new Date()) {
  const nextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    50,
  );
  return Math.max(50, nextDay.getTime() - now.getTime());
}
