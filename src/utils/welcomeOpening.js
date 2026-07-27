const WELCOME_PENDING_KEY = 'shadowAscentWelcomeOpeningPending';
const WELCOME_SEEN_PREFIX = 'shadowAscentWelcomeOpeningSeen:';
const NEW_USER_WINDOW_MS = 48 * 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getSeenKey(user) {
  return `${WELCOME_SEEN_PREFIX}${user?.id || normalizeEmail(user?.email) || 'guest'}`;
}

function readPendingWelcome() {
  try {
    const storedValue = globalThis?.localStorage?.getItem(WELCOME_PENDING_KEY);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch {
    return null;
  }
}

export function queueWelcomeOpening(userLike = {}) {
  try {
    const pendingPayload = {
      userId: userLike?.id || '',
      email: normalizeEmail(userLike?.email),
      queuedAt: new Date().toISOString(),
    };

    globalThis?.localStorage?.setItem(WELCOME_PENDING_KEY, JSON.stringify(pendingPayload));
  } catch {
    return false;
  }

  return true;
}

export function shouldShowWelcomeOpening(user) {
  if (!user?.id && !user?.email) {
    return false;
  }

  try {
    if (globalThis?.localStorage?.getItem(getSeenKey(user))) {
      return false;
    }
  } catch {
    return false;
  }

  const pendingWelcome = readPendingWelcome();
  const userEmail = normalizeEmail(user?.email);
  const pendingMatchesUser = Boolean(
    pendingWelcome?.userId === user?.id || (pendingWelcome?.email && userEmail && pendingWelcome?.email === userEmail),
  );
  const createdAtTime = Date.parse(user?.created_at || user?.createdAt || '');
  const isRecentlyCreated = Number.isFinite(createdAtTime) && Date.now() - createdAtTime <= NEW_USER_WINDOW_MS;

  return pendingMatchesUser || isRecentlyCreated;
}

export function markWelcomeOpeningSeen(user) {
  try {
    globalThis?.localStorage?.setItem(getSeenKey(user), new Date().toISOString());
    globalThis?.localStorage?.removeItem(WELCOME_PENDING_KEY);
  } catch {
    return false;
  }

  return true;
}
