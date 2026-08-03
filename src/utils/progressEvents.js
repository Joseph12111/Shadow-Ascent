import { supabase } from '../lib/supabase.js';

export const PROGRESS_HISTORY_UPDATED_EVENT = 'progressHistoryUpdated';

const STORAGE_PREFIX = 'shadowAscentProgressEvents';
const MAX_LOCAL_EVENTS = 5000;
let fallbackIdSequence = 0;

function storageKey(userId) {
  return `${STORAGE_PREFIX}:${userId || 'local'}`;
}

function safeAmount(value) {
  const amount = Math.abs(Number(value || 0));
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function normalizeEvent(entry) {
  const metric = entry?.metric === 'gold' ? 'gold' : entry?.metric === 'xp' ? 'xp' : '';
  const eventType = entry?.event_type || entry?.type;
  const type = eventType === 'spent' ? 'spent' : eventType === 'earned' ? 'earned' : '';
  const amount = safeAmount(entry?.amount);

  if (!entry?.id || !entry?.user_id || !metric || !type || amount <= 0) {
    return null;
  }

  return {
    id: String(entry?.id),
    user_id: String(entry?.user_id),
    metric,
    event_type: type,
    amount,
    reason: String(entry?.reason || 'progressUpdate'),
    total_after: Number.isFinite(Number(entry?.total_after)) ? Math.max(0, Math.round(Number(entry?.total_after))) : null,
    created_at: entry?.created_at || new Date().toISOString(),
  };
}

function createEventId(userId, metric) {
  try {
    const uuid = globalThis?.crypto?.randomUUID?.();
    if (uuid) {
      return uuid;
    }
  } catch {
    // The timestamp fallback remains unique within this browser session.
  }

  fallbackIdSequence += 1;
  return `${userId}-${metric}-${Date.now()}-${fallbackIdSequence}`;
}

function writeProgressEvents(userId, entries) {
  try {
    globalThis?.localStorage?.setItem(storageKey(userId), JSON.stringify(entries?.slice(-MAX_LOCAL_EVENTS) || []));
    return true;
  } catch {
    return false;
  }
}

function notifyHistoryUpdated() {
  try {
    globalThis?.dispatchEvent?.(new CustomEvent(PROGRESS_HISTORY_UPDATED_EVENT));
  } catch {
    return false;
  }

  return true;
}

export function readProgressEvents(userId) {
  if (!userId) {
    return [];
  }

  try {
    const stored = globalThis?.localStorage?.getItem(storageKey(userId));
    const parsed = stored ? JSON.parse(stored) : [];
    return (Array.isArray(parsed) ? parsed : []).map(normalizeEvent).filter(Boolean).sort((a, b) => String(a?.created_at).localeCompare(String(b?.created_at)));
  } catch {
    return [];
  }
}

export function mergeProgressEvents(userId, entries) {
  const merged = [...readProgressEvents(userId), ...(Array.isArray(entries) ? entries : [])]
    .map(normalizeEvent)
    .filter(Boolean)
    .reduce((acc, entry) => ({ ...acc, [entry?.id]: entry }), {});
  const nextEvents = Object.values(merged).sort((a, b) => String(a?.created_at).localeCompare(String(b?.created_at)));
  writeProgressEvents(userId, nextEvents);
  return nextEvents;
}

export function recordProgressEvent({ userId, metric, amount, reason, totalAfter, createdAt } = {}) {
  const eventAmount = safeAmount(amount);
  const type = metric === 'gold' && Number(amount) < 0 ? 'spent' : 'earned';

  if (!userId || !['xp', 'gold'].includes(metric) || eventAmount <= 0) {
    return null;
  }

  const entry = normalizeEvent({
    id: createEventId(userId, metric),
    user_id: userId,
    metric,
    event_type: type,
    amount: eventAmount,
    reason,
    total_after: totalAfter,
    created_at: createdAt || new Date().toISOString(),
  });

  if (!entry) {
    return null;
  }

  const saved = writeProgressEvents(userId, [...readProgressEvents(userId), entry]);
  if (saved) {
    notifyHistoryUpdated();
  }

  if (supabase) {
    try {
      supabase
        .from('progress_events')
        .insert(entry)
        .then(() => undefined)
        .catch(() => undefined);
    } catch {
      return entry;
    }
  }

  return entry;
}

export async function loadProgressEvents(userId) {
  const localEvents = readProgressEvents(userId);

  if (!userId || !supabase) {
    return localEvents;
  }

  try {
    const { data, error } = await supabase
      .from('progress_events')
      .select('id,user_id,metric,event_type,amount,reason,total_after,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      return localEvents;
    }

    return mergeProgressEvents(userId, data || []);
  } catch {
    return localEvents;
  }
}
