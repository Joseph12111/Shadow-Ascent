const BRAIN_QUEST_STORAGE_KEY = 'shadowAscentBrainQuestState';
const BRAIN_QUEST_HISTORY_KEY = 'shadowAscentBrainQuestHistory';
const DAILY_QUESTION_COUNT = 3;

function getTodayKey(date = new Date()) {
  return date?.toISOString?.()?.slice(0, 10) || '';
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

function stableHash(value) {
  const text = String(value || '');
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 1000003;
  }

  return hash;
}

function normalizeQuestion(question) {
  return {
    id: question?.id,
    category: question?.category || 'general',
    difficulty: question?.difficulty || 'normal',
    question: question?.question || '',
    options: Array.isArray(question?.options) ? question?.options : [],
    correctAnswer: question?.correctAnswer || '',
    explanation: question?.explanation || '',
    points: Number.isFinite(Number(question?.points)) ? Number(question?.points) : 0,
  };
}

function getValidQuestions(questionBank = []) {
  return questionBank
    .map((question) => normalizeQuestion(question))
    .filter((question) => {
      const hasOptions = question?.options?.length === 4;
      const answerExists = question?.options?.some((option) => String(option).trim() === String(question?.correctAnswer).trim());
      return Boolean(question?.id && question?.question && hasOptions && answerExists);
    });
}

function selectDailyQuestions(questionBank = [], dateKey = getTodayKey()) {
  const validQuestions = getValidQuestions(questionBank);
  const categories = [...new Set(validQuestions.map((question) => question?.category))].sort();
  const selected = [];

  categories.forEach((category) => {
    if (selected?.length >= DAILY_QUESTION_COUNT) {
      return;
    }

    const categoryQuestions = validQuestions
      .filter((question) => question?.category === category)
      .sort((first, second) => String(first?.id).localeCompare(String(second?.id)));
    const offset = categoryQuestions?.length ? stableHash(`${dateKey}-${category}`) % categoryQuestions?.length : 0;
    const question = categoryQuestions?.[offset];

    if (question?.id && !selected.some((entry) => entry?.id === question?.id)) {
      selected.push(question);
    }
  });

  if (selected?.length < DAILY_QUESTION_COUNT) {
    const sortedQuestions = validQuestions.sort((first, second) => {
      const firstScore = stableHash(`${dateKey}-${first?.id}`);
      const secondScore = stableHash(`${dateKey}-${second?.id}`);
      return firstScore - secondScore;
    });

    sortedQuestions.forEach((question) => {
      if (selected?.length < DAILY_QUESTION_COUNT && !selected.some((entry) => entry?.id === question?.id)) {
        selected.push(question);
      }
    });
  }

  return selected.slice(0, DAILY_QUESTION_COUNT);
}

export function getBrainQuestState() {
  const todayKey = getTodayKey();
  const state = readJSON(BRAIN_QUEST_STORAGE_KEY, null);

  if (state?.dateKey === todayKey) {
    return state;
  }

  return {
    dateKey: todayKey,
    questionIds: [],
    completed: false,
    score: 0,
    pointsAwarded: 0,
    answers: {},
    completedAt: null,
  };
}

export function getDailyBrainQuest(questionBank = [], date = new Date()) {
  const dateKey = getTodayKey(date);
  const state = getBrainQuestState();
  const selectedQuestions = selectDailyQuestions(questionBank, dateKey);
  const hydratedQuestions = state?.questionIds?.length
    ? state?.questionIds
        ?.map((questionId) => selectedQuestions.find((question) => question?.id === questionId) || getValidQuestions(questionBank).find((question) => question?.id === questionId))
        ?.filter(Boolean)
    : selectedQuestions;
  const nextState = {
    ...state,
    dateKey,
    questionIds: hydratedQuestions.map((question) => question?.id),
  };

  writeJSON(BRAIN_QUEST_STORAGE_KEY, nextState);

  return {
    ...nextState,
    questions: hydratedQuestions,
    empty: hydratedQuestions?.length === 0,
  };
}

export function compareBrainQuestAnswer(answer, correctAnswer) {
  return String(answer || '').trim() === String(correctAnswer || '').trim();
}

export function completeBrainQuest({ questionBank = [], answers = {}, date = new Date() } = {}) {
  const quest = getDailyBrainQuest(questionBank, date);

  if (quest?.completed) {
    return {
      success: true,
      alreadyCompleted: true,
      score: quest?.score || 0,
      pointsAwarded: 0,
      questions: quest?.questions || [],
      results: [],
    };
  }

  const results = quest?.questions?.map((question) => {
    const answer = answers?.[question?.id] || '';
    const correct = compareBrainQuestAnswer(answer, question?.correctAnswer);

    return {
      questionId: question?.id,
      category: question?.category,
      answer,
      correctAnswer: question?.correctAnswer,
      correct,
      points: correct ? question?.points : 0,
      explanation: question?.explanation,
    };
  });
  const score = results.filter((result) => result?.correct).length;
  const pointsAwarded = results.reduce((total, result) => total + Number(result?.points || 0), 0);
  const completedState = {
    dateKey: quest?.dateKey,
    questionIds: quest?.questions?.map((question) => question?.id),
    completed: true,
    score,
    pointsAwarded,
    answers,
    completedAt: new Date().toISOString(),
  };
  const history = readJSON(BRAIN_QUEST_HISTORY_KEY, []);
  const nextHistory = [completedState, ...(Array.isArray(history) ? history : [])].slice(0, 120);
  const stateSaved = writeJSON(BRAIN_QUEST_STORAGE_KEY, completedState);
  const historySaved = writeJSON(BRAIN_QUEST_HISTORY_KEY, nextHistory);

  if (!stateSaved || !historySaved) {
    return {
      success: false,
      message: 'Brain quest progress could not be saved locally.',
      alreadyCompleted: false,
      score,
      pointsAwarded: 0,
      questions: quest?.questions || [],
      results,
    };
  }

  emitEvent('brainQuestCompleted', { score, pointsAwarded, results, completedAt: completedState?.completedAt });

  return {
    success: true,
    alreadyCompleted: false,
    score,
    pointsAwarded,
    questions: quest?.questions || [],
    results,
  };
}

export function resetBrainQuestForDate(date = new Date()) {
  const nextState = {
    dateKey: getTodayKey(date),
    questionIds: [],
    completed: false,
    score: 0,
    pointsAwarded: 0,
    answers: {},
    completedAt: null,
  };

  writeJSON(BRAIN_QUEST_STORAGE_KEY, nextState);
  return nextState;
}

export { DAILY_QUESTION_COUNT };
