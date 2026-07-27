const SAVED_WORKOUT_PLANS_KEY = 'shadowAscentSavedWorkoutPlans';
const WEEKLY_WORKOUT_SCHEDULE_KEY = 'shadowAscentWeeklyWorkoutSchedule';
const TODAY_SCHEDULED_WORKOUT_KEY = 'shadowAscentTodayScheduledWorkout';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEK_DAY_SHORT_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const REST_DAY_VALUE = 'rest';

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

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isRestLikeSplitName(value) {
  return /\b(rest|recovery|mobility|deload|off)\b/i.test(String(value || ''));
}

function getDayNumberFromLine(line) {
  const cleaned = String(line || '')
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*[-*•\d.)]+\s*/, '')
    .trim();
  const match = cleaned.match(/^(?:(?:mon|tue|wed|thu|fri|sat|sun)\s*[-–—]\s*)?day\s*(\d+)/i);
  return match?.[1] ? Number(match?.[1]) : null;
}

function looksLikeDayHeading(line) {
  const cleaned = String(line || '')
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*[-*•\d.)]+\s*/, '')
    .trim();
  return /^(?:(?:mon|tue|wed|thu|fri|sat|sun)\s*[-–—]\s*)?day\s*\d+\b/i.test(cleaned);
}

function parseSecondsFromText(text) {
  const raw = String(text || '').toLowerCase();

  const minuteMatch = raw.match(/(\d+)\s*(?:min|mins|minute|minutes)\b/);
  if (minuteMatch?.[1]) {
    return Number(minuteMatch?.[1]) * 60;
  }

  const secondMatch = raw.match(/(\d+)\s*(?:sec|secs|second|seconds|s)\b/);
  if (secondMatch?.[1]) {
    return Number(secondMatch?.[1]);
  }

  return null;
}

function cleanWorkoutLine(line) {
  return String(line || '')
    .replace(/^\s*[-*â€¢\d.)]+\s*/, '')
    .trim();
}

function getGuidanceText(line) {
  const cleaned = cleanWorkoutLine(line);
  const parenthetical = cleaned.match(/^\((.+)\)$/);
  return parenthetical?.[1]?.trim() || '';
}

function addExerciseGuidance(split, guidance) {
  const text = String(guidance || '').trim();
  const lastExercise = split?.exercises?.[split?.exercises?.length - 1];

  if (!text || !lastExercise) {
    return false;
  }

  lastExercise.guidance = lastExercise?.guidance ? `${lastExercise?.guidance} ${text}` : text;
  lastExercise.raw = lastExercise?.raw ? `${lastExercise?.raw}\n(${text})` : `(${text})`;
  return true;
}

function parseExerciseLine(line, index, splitOrder = 0) {
  const cleaned = String(line || '')
    .replace(/^\s*[-*•\d.)]+\s*/, '')
    .trim();

  if (!cleaned || cleaned.length < 3) {
    return null;
  }

  if (/^(warm\s*up|cool\s*down|notes?|progression|rules?|recovery notes?|overview|exercises?|main workout|weekly split)\s*:?\s*$/i.test(cleaned)) {
    return null;
  }

  const setRepMatch = cleaned.match(/(\d+)\s*[x×]\s*(\d+)/i);
  const durationMatch = cleaned.match(/(\d+)(?:\s*[-–—]\s*\d+)?\s*(?:sec|secs|second|seconds|min|mins|minute|minutes)\b/i);

  if (!setRepMatch?.[0] && !durationMatch?.[0]) {
    return null;
  }

  const restMatch = cleaned.match(/rest[^0-9]{0,12}(\d+)\s*(sec|secs|second|seconds|min|mins|minute|minutes|s|m)\b/i);
  const workMatch = cleaned.match(/(?:tempo|work|hold|for)[^0-9]{0,12}(\d+)\s*(sec|secs|second|seconds|min|mins|minute|minutes|s|m)\b/i);
  const name =
    cleaned
      .replace(/\(.*?\)/g, '')
      .replace(/(\d+\s*[x×]\s*\d+).*/i, '')
      .replace(/:\s*\d+(?:\s*[-–—]\s*\d+)?\s*(?:sec|secs|second|seconds|min|mins|minute|minutes)\b.*/i, '')
      .replace(/:\s*$/, '')
      .trim() || cleaned;

  const workSeconds = workMatch?.[1] ? parseSecondsFromText(`${workMatch?.[1]} ${workMatch?.[2] || 'sec'}`) : null;
  const restSeconds = restMatch?.[1] ? parseSecondsFromText(`${restMatch?.[1]} ${restMatch?.[2] || 'sec'}`) : null;

  return {
    id: `exercise-${splitOrder}-${index}-${slugify(name) || index}`,
    name,
    sets: Number(setRepMatch?.[1] || 1),
    reps: Number(setRepMatch?.[2] || 1),
    raw: cleaned,
    guidance: '',
    timing: {
      workSeconds: workSeconds && workSeconds > 0 ? workSeconds : null,
      restSeconds: restSeconds && restSeconds > 0 ? restSeconds : null,
      exerciseRestSeconds: null,
    },
  };
}

function looksLikeSplitHeading(line, dayHeadingMode = false) {
  const cleaned = String(line || '')
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*[-*•\d.)]+\s*/, '')
    .trim();
  if (!cleaned) {
    return false;
  }

  if (looksLikeDayHeading(cleaned)) {
    return true;
  }

  if (dayHeadingMode) {
    return false;
  }

  return /(push|pull|leg|upper|lower|full body|core|abs|hypertrophy|conditioning|recovery|cardio)/i.test(cleaned);
}

function normalizeSplitName(line, fallbackIndex) {
  const cleaned = String(line || '')
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*[-*•\d.)]+\s*/, '')
    .trim();

  if (!cleaned) {
    return `Split ${fallbackIndex}`;
  }

  if (looksLikeDayHeading(cleaned)) {
    return cleaned.replace(/^(?:(?:mon|tue|wed|thu|fri|sat|sun)\s*[-–—]\s*)?day\s*\d+\s*(?:[:\-–—]|[^\w\s])?\s*/i, '').trim() || `Day ${fallbackIndex}`;
  }

  return cleaned;
}

function normalizeParsedSplits(splits) {
  return splits
    .map((split, index) => ({
      ...split,
      order: Number(split?.order || index + 1),
      isRest: Boolean(split?.isRest || isRestLikeSplitName(split?.name)),
      exercises: Array.isArray(split?.exercises) ? split?.exercises.filter(Boolean) : [],
    }))
    .filter((split) => split?.name);
}

function parseWorkoutPlanFromText(rawOutput, sessionMinutes) {
  const lines = String(rawOutput || '')
    .split('\n')
    .map((line) => line?.trim())
    .filter(Boolean);
  const dayHeadingMode = lines.some((line) => looksLikeDayHeading(line));

  const splits = [];
  let activeSplit = null;
  let splitIndex = 1;
  let exerciseIndex = 1;
  let currentSection = '';

  lines.forEach((line) => {
    const sectionMatch = String(line || '').match(/^\s*#{1,6}\s+(.+?)\s*$/);
    const sectionTitle = sectionMatch?.[1]?.trim() || '';
    if (sectionTitle && !looksLikeDayHeading(sectionTitle)) {
      currentSection = sectionTitle.toLowerCase();
      return;
    }

    if (looksLikeSplitHeading(line, dayHeadingMode)) {
      const splitName = normalizeSplitName(line, splitIndex);
      const dayNumber = getDayNumberFromLine(line) || splitIndex;
      const existingSplit = dayNumber ? splits.find((split) => Number(split?.dayNumber || 0) === dayNumber) : null;

      if (existingSplit) {
        activeSplit = existingSplit;
        return;
      }

      activeSplit = {
        id: `split-${dayNumber}-${slugify(splitName) || dayNumber}`,
        name: splitName,
        dayNumber,
        order: splitIndex,
        isRest: isRestLikeSplitName(splitName),
        exercises: [],
      };
      splits.push(activeSplit);
      splitIndex += 1;
      return;
    }

    if (
      dayHeadingMode &&
      /^(weekly split|warmup|warm-up|progression|progression rules|recovery notes|recovery|notes?)$/i.test(currentSection)
    ) {
      return;
    }

    const guidanceText = getGuidanceText(line);
    if (guidanceText) {
      addExerciseGuidance(activeSplit, guidanceText);
      return;
    }

    const exercise = parseExerciseLine(line, exerciseIndex, splitIndex - 1);
    if (!exercise) {
      return;
    }

    if (!activeSplit) {
      if (dayHeadingMode) {
        return;
      }

      const splitName = 'Main Workout';
      activeSplit = {
        id: `split-${splitIndex}-${slugify(splitName) || splitIndex}`,
        name: splitName,
        dayNumber: splitIndex,
        order: splitIndex,
        isRest: false,
        exercises: [],
      };
      splits.push(activeSplit);
      splitIndex += 1;
    }

    activeSplit.exercises.push(exercise);
    exerciseIndex += 1;
  });

  const parsedSplits = normalizeParsedSplits(splits);
  const fallbackDuration = Math.max(10, Number(sessionMinutes || 45));

  return {
    splits: parsedSplits,
    estimatedMinutes: fallbackDuration,
  };
}

function buildDefaultScheduleForPlan(plan) {
  const schedule = {};
  const splits = Array.isArray(plan?.splits) ? plan?.splits : [];
  const hasExplicitDays = splits.some((entry) => Number(entry?.dayNumber || 0) > 0);

  WEEK_DAYS.forEach((day, index) => {
    const dayNumber = index + 1;
    const split = hasExplicitDays
      ? splits.find((entry) => Number(entry?.dayNumber || 0) === dayNumber)
      : splits?.[index];
    schedule[day] = split?.id ? `id:${split?.id}` : REST_DAY_VALUE;
  });
  return schedule;
}

function resolveScheduleSplit(plan, scheduleValue) {
  const value = String(scheduleValue || '');

  if (!value || value === REST_DAY_VALUE) {
    return null;
  }

  const rawValue = value.replace(/^id:/, '').replace(/^name:/, '');
  const lowerValue = rawValue.toLowerCase();

  return (
    plan?.splits?.find((entry) => entry?.id === rawValue) ||
    plan?.splits?.find((entry) => String(entry?.name || '').toLowerCase() === lowerValue) ||
    null
  );
}

function getWeekdayName(dateValue = new Date()) {
  try {
    return new Date(dateValue).toLocaleDateString('en-GB', { weekday: 'long' });
  } catch {
    return 'Monday';
  }
}

function buildTodayScheduledWorkout({ plan, schedule, dateValue = new Date() }) {
  const dayName = getWeekdayName(dateValue);
  const splitId = schedule?.[dayName];

  if (!plan?.id || !splitId || splitId === REST_DAY_VALUE) {
    return null;
  }

  const split = resolveScheduleSplit(plan, splitId);
  if (!split) {
    return null;
  }

  return {
    id: `today-${plan?.id}-${split?.id}-${new Date(dateValue).toISOString().slice(0, 10)}`,
    dateKey: new Date(dateValue).toISOString().slice(0, 10),
    dayName,
    planId: plan?.id,
    splitId: split?.id,
    splitName: split?.name,
    title: `${split?.name}`,
    isRest: Boolean(split?.isRest),
    exercises: split?.exercises || [],
    source: 'generator_plan',
  };
}

export {
  SAVED_WORKOUT_PLANS_KEY,
  WEEKLY_WORKOUT_SCHEDULE_KEY,
  TODAY_SCHEDULED_WORKOUT_KEY,
  WEEK_DAYS,
  WEEK_DAY_SHORT_NAMES,
  REST_DAY_VALUE,
  readJSON,
  writeJSON,
  parseWorkoutPlanFromText,
  buildDefaultScheduleForPlan,
  buildTodayScheduledWorkout,
  resolveScheduleSplit,
  getWeekdayName,
};
