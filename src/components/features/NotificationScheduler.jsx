import { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, Bell, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import {
  createChecklistNotificationPayload,
  findDueTaskReminder,
  getNotificationPermission,
  getReminderDeliveryKey,
  getLocalTimeKey,
  markSmartReminderShown,
  markDelivered,
  NOTIFICATION_SETTINGS_KEY,
  readJSON,
  readNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  shouldTriggerSmartReminder,
  showBrowserNotification,
  syncNotificationSettingsFromSupabase,
} from '../../utils/notificationSystem.js';

const TASKS_KEY = 'shadowAscentChecklistTasks';

export default function NotificationScheduler() {
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState(() => readNotificationSettings());
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [promptOpen, setPromptOpen] = useState(false);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(new Date(Date.now() - 70000));

  const shouldAskPermission = useMemo(
    () => Boolean(user?.id && !settings?.permissionAsked && !settings?.permissionSkipped && permission === 'default'),
    [permission, settings?.permissionAsked, settings?.permissionSkipped, user?.id],
  );

  useEffect(() => {
    const timer = globalThis?.setTimeout?.(() => {
      setPromptOpen(shouldAskPermission);
    }, 1200);

    return () => {
      globalThis?.clearTimeout?.(timer);
    };
  }, [shouldAskPermission]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let alive = true;

    syncNotificationSettingsFromSupabase(user)
      .then((nextSettings) => {
        if (alive) {
          setSettings(nextSettings);
          setPermission(getNotificationPermission());
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [user]);

  useEffect(() => {
    function refreshSettings() {
      setSettings(readNotificationSettings());
      setPermission(getNotificationPermission());
    }

    globalThis?.addEventListener?.('storage', refreshSettings);
    globalThis?.addEventListener?.('statUpdated', refreshSettings);
    globalThis?.addEventListener?.('notificationSettingsUpdated', refreshSettings);

    return () => {
      globalThis?.removeEventListener?.('storage', refreshSettings);
      globalThis?.removeEventListener?.('statUpdated', refreshSettings);
      globalThis?.removeEventListener?.('notificationSettingsUpdated', refreshSettings);
    };
  }, []);

  useEffect(() => {
    if (!settings?.enabled) {
      return undefined;
    }

    async function checkReminders() {
      if (checkingRef?.current) {
        return;
      }

      checkingRef.current = true;
      const tasks = readJSON(TASKS_KEY, []);
      const safeTasks = Array.isArray(tasks) ? tasks : [];
      const now = new Date();
      const catchUpLimit = new Date(now?.getTime?.() - (5 * 60 * 1000));
      const windowStart = lastCheckRef?.current > catchUpLimit ? lastCheckRef?.current : catchUpLimit;
      lastCheckRef.current = now;

      try {
        for (const task of safeTasks) {
          const dueAt = findDueTaskReminder(task, settings, windowStart, now);
          if (!dueAt) {
            continue;
          }

          const reminder = task?.reminder || {};
          const isSnoozedOccurrence = reminder?.snoozedUntil
            && getLocalTimeKey(new Date(reminder?.snoozedUntil)) === getLocalTimeKey(dueAt);
          const notificationKey = getReminderDeliveryKey(
            task,
            dueAt,
            isSnoozedOccurrence ? `snooze-${getLocalTimeKey(dueAt)}` : '',
          );
          const payload = createChecklistNotificationPayload(task);
          const delivery = await showBrowserNotification(payload, settings, reminder);
          markDelivered(notificationKey);

          if (delivery?.shown) {
            toast?.achievement?.('Checklist alarm delivered. Open the task to complete it.', payload?.title);
          } else {
            toast?.warning?.(payload?.body || 'A checklist quest is due now.', payload?.title);
          }
        }

        const openTasks = safeTasks.filter((task) => !task?.completed);
        if (openTasks?.length && shouldTriggerSmartReminder(settings, 'open-checklist-quests', now)) {
          const payload = {
            title: 'Your Streak Is at Risk',
            body: `${openTasks?.length} checklist quest${openTasks?.length === 1 ? '' : 's'} still await completion.`,
            tag: 'smart-open-checklist-quests',
            url: '/checklist',
          };
          const delivery = await showBrowserNotification(payload, settings);
          markSmartReminderShown('open-checklist-quests', now);

          if (delivery?.shown) {
            toast?.warning?.('Smart reminder sent for unfinished checklist quests.');
          } else {
            toast?.warning?.(payload?.body, payload?.title);
          }
        }
      } finally {
        checkingRef.current = false;
      }
    }

    checkReminders().catch(() => {
      checkingRef.current = false;
    });
    const interval = globalThis?.setInterval?.(() => {
      checkReminders().catch(() => {
        checkingRef.current = false;
      });
    }, 15000);
    const handleVisibility = () => {
      if (globalThis?.document?.visibilityState === 'visible') {
        checkReminders().catch(() => {
          checkingRef.current = false;
        });
      }
    };
    globalThis?.document?.addEventListener?.('visibilitychange', handleVisibility);
    globalThis?.addEventListener?.('focus', handleVisibility);

    return () => {
      globalThis?.clearInterval?.(interval);
      globalThis?.document?.removeEventListener?.('visibilitychange', handleVisibility);
      globalThis?.removeEventListener?.('focus', handleVisibility);
    };
  }, [permission, settings, toast]);

  async function allowNotifications() {
    const nextPermission = await requestNotificationPermission();
    setPermission(nextPermission);
    const nextSettings = saveNotificationSettings(user, {
      ...(settings || {}),
      enabled: nextPermission === 'granted',
      permissionAsked: true,
      permissionSkipped: false,
    });
    setSettings(nextSettings);
    setPromptOpen(false);

    if (nextPermission === 'granted') {
      toast?.success?.('Quest reminders enabled.');
    } else {
      toast?.warning?.('Notifications were not enabled.');
    }
  }

  function skipNotifications() {
    const nextSettings = saveNotificationSettings(user, {
      ...(settings || {}),
      enabled: false,
      permissionAsked: true,
      permissionSkipped: true,
    });
    try {
      globalThis?.localStorage?.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(nextSettings));
    } catch {
      undefined;
    }
    setSettings(nextSettings);
    setPromptOpen(false);
    toast?.warning?.('You can enable reminders later in Notification Settings.');
  }

  if (!promptOpen) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-shadow-gold/30 bg-[#0f1017] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-shadow-purple/30 bg-shadow-purple/15 text-shadow-purpleLight">
          <AlarmClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-bold text-shadow-gold">Enable Quest Assistant?</h2>
          <p className="mt-1 text-sm leading-6 text-shadow-textSecondary">
            Receive workout, checklist, water, sleep, streak, and reward reminders. You can skip this and enable it later.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={allowNotifications}>
              <Bell className="h-4 w-4" aria-hidden="true" />
              Allow
            </Button>
            <Button onClick={skipNotifications} variant="ghost">
              Skip
            </Button>
          </div>
        </div>
        <button aria-label="Skip notifications" className="rounded-xl border border-white/10 p-2 text-shadow-textMuted" onClick={skipNotifications} type="button">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
