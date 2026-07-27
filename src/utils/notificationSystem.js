import { supabase } from '../lib/supabase.js';

export const NOTIFICATION_SETTINGS_KEY = 'shadowAscentNotificationSettings';
export const NOTIFICATION_DELIVERED_KEY = 'shadowAscentDeliveredNotifications';
export const SMART_NOTIFICATION_LOG_KEY = 'shadowAscentSmartNotificationLog';

export const NOTIFICATION_CHANNELS = [
  { id: 'workoutReminders', label: 'Workout reminders', message: 'Workout Quest Begins in 30 Minutes' },
  { id: 'mealPlanReminders', label: 'Meal-plan reminders', message: 'Meal Prep Quest Awaits' },
  { id: 'waterReminders', label: 'Water reminders', message: 'Hydration Low - Restore Stamina' },
  { id: 'sleepReminders', label: 'Sleep reminders', message: 'Your scheduled bedtime starts soon' },
  { id: 'dailyQuestReminders', label: 'Daily quest reminders', message: 'New Daily Quest Available' },
  { id: 'checklistAlarms', label: 'Checklist alarms', message: 'Checklist Quest Reminder' },
  { id: 'iqQuestionReminders', label: 'IQ question reminders', message: 'Brain Quest Awaits' },
  { id: 'streakWarnings', label: 'Streak warnings', message: 'Your Streak Is at Risk' },
  { id: 'levelUpNotifications', label: 'Level-up notifications', message: 'Level Up - New Reward Unlocked' },
  { id: 'rewardGiftNotifications', label: 'Reward and gift notifications', message: 'Reward Unlocked' },
  { id: 'progressPhotoReminders', label: 'Progress photo reminders', message: 'Body Evolution Check - Upload New Photos' },
  { id: 'subscriptionRenewalNotifications', label: 'Subscription renewal notifications', message: 'Subscription Renewal Approaches' },
  { id: 'communityChallengeNotifications', label: 'Community and challenge notifications', message: 'New Challenge Available' },
];

export const REPEAT_OPTIONS = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'selectedDays', label: 'Selected days' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom schedule' },
];

export const SOUND_OPTIONS = [
  { id: 'soft-chime', label: 'Soft chime' },
  { id: 'quest-horn', label: 'Quest horn' },
  { id: 'crystal-ping', label: 'Crystal ping' },
  { id: 'silent', label: 'Silent' },
];

export const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
];

export const WEEKDAY_OPTIONS = [
  { id: 'MO', label: 'Mon' },
  { id: 'TU', label: 'Tue' },
  { id: 'WE', label: 'Wed' },
  { id: 'TH', label: 'Thu' },
  { id: 'FR', label: 'Fri' },
  { id: 'SA', label: 'Sat' },
  { id: 'SU', label: 'Sun' },
];

export function getLocalDateKey(date = new Date()) {
  try {
    const year = date?.getFullYear?.();
    const month = String(Number(date?.getMonth?.() || 0) + 1).padStart(2, '0');
    const day = String(date?.getDate?.() || 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function getLocalTimeKey(date = new Date()) {
  try {
    const hours = String(date?.getHours?.() || 0).padStart(2, '0');
    const minutes = String(date?.getMinutes?.() || 0).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '00:00';
  }
}

export function getDefaultNotificationSettings() {
  const timeZone = Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'Local';
  const channels = NOTIFICATION_CHANNELS.reduce((nextChannels, channel) => ({
    ...nextChannels,
    [channel?.id]: channel?.id === 'checklistAlarms',
  }), {});

  return {
    enabled: false,
    permissionAsked: false,
    permissionSkipped: false,
    sound: true,
    vibration: true,
    lockScreen: true,
    badges: true,
    smartReminders: true,
    smartReminderFrequencyHours: 6,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
    timeZone,
    channels,
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultTaskReminder() {
  return {
    notificationsEnabled: false,
    reminderDate: '',
    reminderTime: '18:30',
    repeatType: 'once',
    repeat: [],
    customSchedule: '',
    sound: true,
    soundName: 'soft-chime',
    vibration: true,
    snoozeMinutes: 10,
    priority: 'normal',
    quietHoursOverride: false,
    message: '',
    skippedDates: [],
    snoozedUntil: '',
  };
}

export function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    globalThis?.localStorage?.setItem(key, JSON.stringify(value));
    if (key === NOTIFICATION_SETTINGS_KEY) {
      globalThis?.dispatchEvent?.(new CustomEvent('notificationSettingsUpdated', { detail: { key } }));
    }
    return true;
  } catch {
    return false;
  }
}

export function readNotificationSettings() {
  const stored = readJSON(NOTIFICATION_SETTINGS_KEY, null);
  const defaults = getDefaultNotificationSettings();

  if (!stored || typeof stored !== 'object') {
    return defaults;
  }

  return {
    ...defaults,
    ...stored,
    quietHours: {
      ...defaults?.quietHours,
      ...(stored?.quietHours || {}),
    },
    channels: {
      ...defaults?.channels,
      ...(stored?.channels || {}),
    },
  };
}

export function saveNotificationSettings(user, settings) {
  const nextSettings = {
    ...getDefaultNotificationSettings(),
    ...(settings || {}),
    updatedAt: new Date().toISOString(),
  };

  writeJSON(NOTIFICATION_SETTINGS_KEY, nextSettings);

  if (user?.id && supabase) {
    try {
      supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user?.id,
            settings: nextSettings,
            updated_at: nextSettings?.updatedAt,
          },
          { onConflict: 'user_id' },
        )
        .then(() => undefined)
        .catch(() => undefined);
    } catch {
      return nextSettings;
    }
  }

  return nextSettings;
}

export async function syncNotificationSettingsFromSupabase(user) {
  if (!user?.id || !supabase) {
    return readNotificationSettings();
  }

  try {
    const { data } = await supabase.from('notification_preferences').select('settings').eq('user_id', user?.id).maybeSingle();
    const remoteSettings = data?.settings;

    if (remoteSettings && typeof remoteSettings === 'object') {
      const nextSettings = {
        ...readNotificationSettings(),
        ...remoteSettings,
        quietHours: {
          ...getDefaultNotificationSettings()?.quietHours,
          ...(remoteSettings?.quietHours || {}),
        },
        channels: {
          ...getDefaultNotificationSettings()?.channels,
          ...(remoteSettings?.channels || {}),
        },
      };
      writeJSON(NOTIFICATION_SETTINGS_KEY, nextSettings);
      return nextSettings;
    }
  } catch {
    return readNotificationSettings();
  }

  return readNotificationSettings();
}

export function getNotificationPermission() {
  try {
    if (!('Notification' in globalThis)) {
      return 'unsupported';
    }

    return globalThis?.Notification?.permission || 'default';
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationPermission() {
  try {
    if (!('Notification' in globalThis)) {
      return 'unsupported';
    }

    return await globalThis?.Notification?.requestPermission?.();
  } catch {
    return 'denied';
  }
}

export function isQuietTime(settings, date = new Date()) {
  if (!settings?.quietHours?.enabled) {
    return false;
  }

  const current = getLocalTimeKey(date);
  const start = settings?.quietHours?.start || '22:00';
  const end = settings?.quietHours?.end || '07:00';

  if (start <= end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

export function createChecklistNotificationPayload(task) {
  const reminder = task?.reminder || {};

  return {
    title: reminder?.message || `Quest Reminder - ${task?.title || 'Checklist Task'}`,
    body: `Complete ${task?.title || 'your task'} to protect your streak.`,
    tag: `checklist-${task?.id || 'task'}`,
  };
}

export function showBrowserNotification(payload, settings) {
  if (!settings?.enabled || getNotificationPermission() !== 'granted') {
    return false;
  }

  try {
    const notification = new globalThis.Notification(payload?.title || 'Shadow Ascent', {
      body: payload?.body || 'Your quest assistant has a reminder.',
      tag: payload?.tag || `shadow-ascent-${Date.now()}`,
      renotify: false,
      silent: !settings?.sound,
    });

    notification.onclick = () => {
      try {
        globalThis?.focus?.();
        globalThis?.location?.assign?.('/checklist');
      } catch {
        undefined;
      }
    };

    if (settings?.vibration && globalThis?.navigator?.vibrate) {
      globalThis?.navigator?.vibrate?.([120, 80, 120]);
    }

    return true;
  } catch {
    return false;
  }
}

export function hasDelivered(notificationKey) {
  const delivered = readJSON(NOTIFICATION_DELIVERED_KEY, {});
  return Boolean(delivered?.[notificationKey]);
}

export function markDelivered(notificationKey) {
  const delivered = readJSON(NOTIFICATION_DELIVERED_KEY, {});
  writeJSON(NOTIFICATION_DELIVERED_KEY, {
    ...(delivered || {}),
    [notificationKey]: new Date().toISOString(),
  });
}

export function getReminderDeliveryKey(task, date = new Date()) {
  return `${task?.id || 'task'}-${getLocalDateKey(date)}-${task?.reminder?.reminderTime || ''}`;
}

export function shouldTriggerTaskReminder(task, settings, date = new Date()) {
  const reminder = task?.reminder || {};

  if (!settings?.enabled || !settings?.channels?.checklistAlarms || task?.completed || !reminder?.notificationsEnabled) {
    return false;
  }

  if (!reminder?.quietHoursOverride && isQuietTime(settings, date)) {
    return false;
  }

  const reminderTime = reminder?.reminderTime || '';
  const currentTime = getLocalTimeKey(date);
  if (!reminderTime || currentTime !== reminderTime) {
    return false;
  }

  const dateKey = getLocalDateKey(date);
  const reminderDate = reminder?.reminderDate || dateKey;
  const skippedDates = Array.isArray(reminder?.skippedDates) ? reminder?.skippedDates : [];
  const dayIndex = date?.getDay?.() || 0;
  const weekdayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const weekdayCode = weekdayCodes?.[dayIndex] || 'MO';

  if (skippedDates?.includes(dateKey)) {
    return false;
  }

  if (reminder?.repeatType === 'once' && reminderDate !== dateKey) {
    return false;
  }

  if (reminder?.repeatType === 'weekdays' && !['MO', 'TU', 'WE', 'TH', 'FR'].includes(weekdayCode)) {
    return false;
  }

  if (reminder?.repeatType === 'weekends' && !['SA', 'SU'].includes(weekdayCode)) {
    return false;
  }

  if (reminder?.repeatType === 'selectedDays' && !(reminder?.repeat || [])?.includes(weekdayCode)) {
    return false;
  }

  return !hasDelivered(getReminderDeliveryKey(task, date));
}

export function shouldTriggerSmartReminder(settings, reminderId, date = new Date()) {
  if (!settings?.enabled || !settings?.smartReminders) {
    return false;
  }

  const frequencyHours = Math.max(1, Number(settings?.smartReminderFrequencyHours || 6));
  const log = readJSON(SMART_NOTIFICATION_LOG_KEY, {});
  const lastShownAt = log?.[reminderId];

  if (!lastShownAt) {
    return true;
  }

  const elapsed = date?.getTime?.() - new Date(lastShownAt)?.getTime?.();
  return Number.isFinite(elapsed) && elapsed >= frequencyHours * 60 * 60 * 1000;
}

export function markSmartReminderShown(reminderId, date = new Date()) {
  const log = readJSON(SMART_NOTIFICATION_LOG_KEY, {});
  writeJSON(SMART_NOTIFICATION_LOG_KEY, {
    ...(log || {}),
    [reminderId]: date?.toISOString?.() || new Date().toISOString(),
  });
}
