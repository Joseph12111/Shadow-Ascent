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

function stripWorkoutFormatting(line) {
  return String(line || '')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function stripListMarker(line) {
  return stripWorkoutFormatting(line)
    .replace(/^\s*(?:[-*+\u2022]\s+|\d+\s*[.)]\s+)/, '')
    .trim();
}

function getDayNumberFromLine(line) {
  const cleaned = stripWorkoutFormatting(line).replace(/^\s*[-*+\u2022]\s+/, '').trim();
  const match = cleaned.match(/^(?:(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:-|:|\u2013|\u2014)\s*)?day\s*(\d+)/i);
  return match?.[1] ? Number(match?.[1]) : null;
}

function looksLikeDayHeading(line) {
  const cleaned = stripWorkoutFormatting(line).replace(/^\s*[-*+\u2022]\s+/, '').trim();
  return /^(?:(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:-|:|\u2013|\u2014)\s*)?day\s*\d+\b/i.test(cleaned);
}

function parseSecondsFromText(text) {
  const raw = String(text || '').toLowerCase();
  const minuteMatch = raw.match(/(\d+)(?:\s*(?:-|\u2013|\u2014)\s*\d+)?\s*(?:min|mins|minute|minutes)\b/);
  if (minuteMatch?.[1]) {
    return Number(minuteMatch?.[1]) * 60;
  }

  const secondMatch = raw.match(/(\d+)(?:\s*(?:-|\u2013|\u2014)\s*\d+)?\s*(?:sec|secs|second|seconds|s)\b/);
  return secondMatch?.[1] ? Number(secondMatch?.[1]) : null;
}

function cleanWorkoutLine(line) {
  return stripListMarker(line);
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
  lastExercise.raw = lastExercise?.raw ? `${lastExercise?.raw}\n${text}` : text;
  return true;
}

function firstNumber(value, fallback = 1) {
  const match = String(value || '').match(/\d+/);
  return match?.[0] ? Number(match?.[0]) : fallback;
}

function normalizeRange(value) {
  return String(value || '').replace(/\s*(?:-|\u2013|\u2014)\s*/g, '-').trim();
}

function getPrescriptionDetails(line) {
  const cleaned = cleanWorkoutLine(line);
  const patterns = [
    /sets?\s*:?\s*(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)\s*(?:[,|/]\s*)?reps?\s*:?\s*(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)/i,
    /(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)\s*sets?\s*[x\u00d7]\s*(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)(?:\s*reps?)?/i,
    /(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)\s*[x\u00d7]\s*(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)(?:\s*reps?)?/i,
    /(?:[x\u00d7]\s*)?(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)\s*sets?\s*(?:(?:of|:)\s*)?(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)(?:\s*reps?)?/i,
  ];
  const setRepMatch = patterns.map((pattern) => cleaned.match(pattern)).find(Boolean) || null;
  const durationMatch = cleaned.match(/(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)\s*(seconds?|secs?|minutes?|mins?)\b/i);
  const restMatch = cleaned.match(/^rest\s*:?\s*(\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?)\s*(seconds?|secs?|minutes?|mins?)\b/i);
  if (!setRepMatch?.[0] && !durationMatch?.[0]) {
    return null;
  }

  const setsText = setRepMatch?.[1] ? normalizeRange(setRepMatch?.[1]) : '1';
  const repsText = setRepMatch?.[2]
    ? normalizeRange(setRepMatch?.[2])
    : durationMatch?.[0]
      ? durationMatch?.[0].trim()
      : '1';

  return {
    sets: firstNumber(setsText),
    reps: firstNumber(repsText),
    setsText,
    repsText,
    prescription: setRepMatch?.[0]?.trim() || durationMatch?.[0]?.trim() || '',
    workSeconds: !restMatch?.[0] && durationMatch?.[0] ? parseSecondsFromText(durationMatch?.[0]) : null,
    restSeconds: restMatch?.[0] ? parseSecondsFromText(restMatch?.[0]) : null,
  };
}

function getSectionName(line) {
  const cleaned = stripListMarker(line);
  const match = cleaned.match(/^(warm[\s-]*up|activation|main workout|main lifts?|strength block|core(?: block)?|accessor(?:y|ies)(?: block)?|finisher|conditioning(?: block)?|cool[\s-]*down|weekly split|progression(?: rules)?|recovery notes?|notes?|overview)(?:\s*\([^)]*\))?\s*:?\s*$/i);
  if (!match?.[1]) {
    return '';
  }

  const section = match?.[1].toLowerCase().replace(/[\s-]+/g, ' ').trim();
  if (section === 'warm up') {
    return 'warmup';
  }
  if (section === 'cool down') {
    return 'cooldown';
  }
  return section;
}

function isExerciseSection(section) {
  return !/^(weekly split|progression|progression rules|recovery notes?|notes?|overview)$/i.test(String(section || ''));
}

function isGenericExerciseName(value) {
  return /^(?:warm[\s-]*up|activation|main workout|main lifts?|strength block|core(?: block)?|accessor(?:y|ies)(?: block)?|finisher|conditioning(?: block)?|cool[\s-]*down|rest)(?:\s*\([^)]*\))?\s*:?\s*$/i.test(String(value || '').trim());
}

function isExerciseDetailLine(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned) {
    return true;
  }

  return (
    /^(?:rest|sets?|reps?|rounds?|duration|time|tempo|coaching|cue|note|form|equipment|same\s+(?:as|style\s+as))\b/i.test(cleaned) ||
    /^(?:keep|use|try|pause|maintain|avoid|brace|squeeze|drive|focus|perform|alternate|slow|control|breathe|hold for)\b/i.test(cleaned) ||
    /^\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?\s*(?:sets?\b|rounds?\b|[x\u00d7]|seconds?\b|secs?\b|minutes?\b|mins?\b)/i.test(cleaned)
  );
}

function looksLikeStandaloneExerciseName(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned || isExerciseDetailLine(cleaned) || isGenericExerciseName(cleaned)) {
    return false;
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length <= 16 && !/[.!?]$/.test(cleaned);
}

function getExerciseLead(line) {
  const formatted = stripWorkoutFormatting(line);
  const numbered = formatted.match(/^\s*\d+\s*[.)]\s+(.+)$/);
  if (numbered?.[1]) {
    return numbered?.[1].trim();
  }

  const lettered = formatted.match(/^\s*[A-Z]\s*[.)]\s+(.+)$/);
  if (lettered?.[1]) {
    return lettered?.[1].trim();
  }

  const bullet = formatted.match(/^\s*[-*+\u2022]\s+(.+)$/);
  if (bullet?.[1]) {
    const bulletText = bullet?.[1].trim();
    return looksLikeStandaloneExerciseName(bulletText) ? bulletText : '';
  }

  if (/^[a-z0-9]/i.test(formatted) && looksLikeStandaloneExerciseName(formatted)) {
    return formatted;
  }
  return '';
}

function getExerciseName(lead) {
  const withoutPrescription = String(lead || '')
    .replace(/\s*(?::|-|\u2013|\u2014)\s*(?=\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?\s*(?:sets?\s*)?[x\u00d7])/i, '\n')
    .replace(/\s+(?=\d+(?:\s*(?:-|\u2013|\u2014)\s*\d+)?\s*(?:sets?\s*)?[x\u00d7]\s*\d+)/i, '\n')
    .split('\n')?.[0]
    ?.replace(/\s*\([^)]*\)\s*$/, '')
    ?.replace(/\s*:\s*$/, '')
    ?.trim();
  return withoutPrescription || cleanWorkoutLine(lead);
}

function createExercise(line, index, splitOrder = 0, section = '') {
  const lead = getExerciseLead(line);
  const name = getExerciseName(lead);
  if (!lead || !name || isGenericExerciseName(name)) {
    return null;
  }

  const details = getPrescriptionDetails(lead);
  return {
    id: `exercise-${splitOrder}-${index}-${slugify(name) || index}`,
    name,
    sets: Number(details?.sets || 1),
    reps: Number(details?.reps || 1),
    setsText: details?.setsText || '',
    repsText: details?.repsText || '',
    prescription: details?.prescription || '',
    raw: cleanWorkoutLine(line),
    guidance: '',
    section: section || 'workout',
    timing: {
      workSeconds: details?.workSeconds && details?.workSeconds > 0 ? details?.workSeconds : null,
      restSeconds: null,
      exerciseRestSeconds: null,
    },
  };
}

function applyExerciseDetails(exercise, line) {
  if (!exercise) {
    return false;
  }

  const cleaned = cleanWorkoutLine(line);
  const details = getPrescriptionDetails(cleaned);
  if (!details) {
    return false;
  }

  if (/^rest\b/i.test(cleaned)) {
    exercise.timing.restSeconds = details?.restSeconds || parseSecondsFromText(cleaned);
    exercise.raw = `${exercise?.raw || ''}\n${cleaned}`.trim();
    return true;
  }

  exercise.sets = Number(details?.sets || exercise?.sets || 1);
  exercise.reps = Number(details?.reps || exercise?.reps || 1);
  exercise.setsText = details?.setsText || exercise?.setsText || '';
  exercise.repsText = details?.repsText || exercise?.repsText || '';
  exercise.prescription = details?.prescription || exercise?.prescription || '';
  exercise.timing.workSeconds = details?.workSeconds || exercise?.timing?.workSeconds || null;
  exercise.raw = `${exercise?.raw || ''}\n${cleaned}`.trim();
  return true;
}

function looksLikeSplitHeading(line, dayHeadingMode = false) {
  const formatted = stripWorkoutFormatting(line);
  const cleaned = stripListMarker(line);
  if (!cleaned) {
    return false;
  }
  if (getSectionName(line)) {
    return false;
  }
  if (looksLikeDayHeading(cleaned)) {
    return true;
  }
  if (dayHeadingMode || /^\s*(?:[-*+\u2022]|\d+\s*[.)])\s+/.test(formatted)) {
    return false;
  }
  return !getPrescriptionDetails(cleaned) && /(push|pull|leg|upper|lower|full body|core|abs|hypertrophy|conditioning|recovery|cardio)/i.test(cleaned);
}

function normalizeSplitName(line, fallbackIndex) {
  const cleaned = stripWorkoutFormatting(line).replace(/^\s*[-*+\u2022]\s+/, '').trim();
  if (!cleaned) {
    return `Split ${fallbackIndex}`;
  }
  if (looksLikeDayHeading(cleaned)) {
    return cleaned.replace(/^(?:(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:-|:|\u2013|\u2014)\s*)?day\s*\d+\s*(?::|-|\u2013|\u2014)?\s*/i, '').trim() || `Day ${fallbackIndex}`;
  }
  return cleaned;
}

function normalizeParsedSplits(splits) {
  return splits
    .map((split, index) => {
      const rawText = Array.isArray(split?.rawLines) ? split?.rawLines.filter(Boolean).join('\n') : String(split?.rawText || '');
      const { rawLines, ...normalizedSplit } = split || {};
      return {
        ...normalizedSplit,
        order: Number(split?.order || index + 1),
        isRest: Boolean(split?.isRest || isRestLikeSplitName(split?.name)),
        exercises: Array.isArray(split?.exercises)
          ? split?.exercises.filter((exercise) => exercise?.name && !isGenericExerciseName(exercise?.name))
          : [],
        notes: Array.isArray(split?.notes) ? split?.notes.filter(Boolean) : [],
        rawText,
      };
    })
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
    if (looksLikeDayHeading(line) || (!dayHeadingMode && looksLikeSplitHeading(line, false))) {
      const splitName = normalizeSplitName(line, splitIndex);
      const dayNumber = getDayNumberFromLine(line) || splitIndex;
      const existingSplit = dayNumber ? splits.find((split) => Number(split?.dayNumber || 0) === dayNumber) : null;
      if (existingSplit) {
        activeSplit = existingSplit;
        activeSplit.rawLines.push(line);
        currentSection = '';
        return;
      }

      activeSplit = {
        id: `split-${dayNumber}-${slugify(splitName) || dayNumber}`,
        name: splitName,
        dayNumber,
        order: splitIndex,
        isRest: isRestLikeSplitName(splitName),
        exercises: [],
        notes: [],
        rawLines: [line],
      };
      splits.push(activeSplit);
      splitIndex += 1;
      currentSection = '';
      return;
    }

    const sectionName = getSectionName(line);
    if (sectionName) {
      currentSection = sectionName;
      activeSplit?.rawLines?.push?.(line);
      return;
    }

    activeSplit?.rawLines?.push?.(line);
    const cleanedLine = cleanWorkoutLine(line);
    if (/^same\s+(?:as|style\s+as)\b/i.test(cleanedLine) && activeSplit) {
      const sectionLabel = currentSection === 'warmup' ? 'Warmup' : currentSection === 'cooldown' ? 'Cooldown' : 'Plan note';
      activeSplit.notes.push(`${sectionLabel}: ${cleanedLine}`);
      return;
    }

    if (!isExerciseSection(currentSection) || activeSplit?.isRest) {
      return;
    }

    const guidanceText = getGuidanceText(line);
    if (guidanceText) {
      addExerciseGuidance(activeSplit, guidanceText);
      return;
    }

    const lastExercise = activeSplit?.exercises?.[activeSplit?.exercises?.length - 1];
    if (/^rest\b/i.test(cleanedLine)) {
      applyExerciseDetails(lastExercise, cleanedLine);
      return;
    }

    if (lastExercise && /^[a-z]\)\s+/i.test(stripWorkoutFormatting(line))) {
      if (!lastExercise?.prescription) {
        applyExerciseDetails(lastExercise, cleanedLine);
      }
      addExerciseGuidance(activeSplit, cleanedLine);
      return;
    }

    if (lastExercise && isExerciseDetailLine(cleanedLine) && applyExerciseDetails(lastExercise, cleanedLine)) {
      return;
    }

    const exercise = createExercise(line, exerciseIndex, splitIndex - 1, currentSection);
    if (exercise) {
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
          notes: [],
          rawLines: [line],
        };
        splits.push(activeSplit);
        splitIndex += 1;
      }
      activeSplit.exercises.push(exercise);
      exerciseIndex += 1;
      return;
    }

    if (applyExerciseDetails(lastExercise, cleanedLine)) {
      return;
    }

    if (lastExercise && /^[-*+\u2022]\s+/i.test(stripWorkoutFormatting(line))) {
      addExerciseGuidance(activeSplit, cleanedLine);
    }
  });

  const fallbackDuration = Math.max(10, Number(sessionMinutes || 45));
  return {
    splits: normalizeParsedSplits(splits),
    estimatedMinutes: fallbackDuration,
    sourceText: String(rawOutput || ''),
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
    notes: split?.notes || [],
    fallbackText: split?.rawText || plan?.sourceText || '',
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
