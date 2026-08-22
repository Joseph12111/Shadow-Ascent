import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Bell, CheckCircle2, Crown, Sparkles } from 'lucide-react';

const NOTIFICATIONS_STORAGE_KEY = 'shadowAscentNotifications';
const NOTIFICATIONS_UPDATED_EVENT = 'shadowAscentNotificationsUpdated';
const MAX_STORED_NOTIFICATIONS = 100;
let notificationSequence = 0;

function readNotifications() {
  try {
    const stored = globalThis?.localStorage?.getItem?.(NOTIFICATIONS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((notification) => notification?.id && notification?.createdAt);
  } catch {
    return [];
  }
}

function writeNotifications(notifications) {
  try {
    globalThis?.localStorage?.setItem?.(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    return true;
  } catch {
    return false;
  }
}

function notifyInboxUpdated() {
  try {
    globalThis?.dispatchEvent?.(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  } catch {
    return;
  }
}

export function pushNotification({ type = 'system', title = 'Shadow Ascent', message = '' } = {}) {
  const safeTitle = String(title || 'Shadow Ascent').trim();
  const safeMessage = String(message || '').trim();
  const notifications = readNotifications();
  const latest = notifications?.[0];
  const latestCreatedAt = Date.parse(latest?.createdAt || '');
  const isRecentDuplicate = latest?.type === type
    && latest?.title === safeTitle
    && latest?.message === safeMessage
    && Number.isFinite(latestCreatedAt)
    && Date.now() - latestCreatedAt < 2000;

  if (isRecentDuplicate) {
    return latest;
  }

  notificationSequence += 1;
  const notification = {
    id: `notification-${Date.now()}-${notificationSequence}`,
    type,
    title: safeTitle,
    message: safeMessage,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const nextNotifications = [notification, ...notifications].slice(0, MAX_STORED_NOTIFICATIONS);

  if (!writeNotifications(nextNotifications)) {
    return null;
  }

  notifyInboxUpdated();
  return notification;
}

function relativeTime(createdAt) {
  const createdTime = Date.parse(createdAt || '');

  if (!Number.isFinite(createdTime)) {
    return 'Recently';
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));

  if (elapsedSeconds < 60) {
    return 'Just now';
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) {
    return `${elapsedDays}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(createdTime));
}

function NotificationTypeIcon({ type }) {
  const iconConfig = {
    'level-up': { Icon: Crown, className: 'text-shadow-gold' },
    achievement: { Icon: Award, className: 'text-shadow-gold' },
    'quest-complete': { Icon: CheckCircle2, className: 'text-shadow-green' },
    system: { Icon: Sparkles, className: 'text-shadow-purpleLight' },
    plan: { Icon: Sparkles, className: 'text-shadow-purpleLight' },
  };
  const { Icon, className } = iconConfig?.[type] || { Icon: Bell, className: 'text-shadow-textSecondary' };

  return <Icon className={`h-4 w-4 ${className}`} aria-hidden="true" />;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState(() => readNotifications());
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const recentNotifications = useMemo(
    () => [...notifications]
      .sort((first, second) => Date.parse(second?.createdAt || '') - Date.parse(first?.createdAt || ''))
      .slice(0, 20),
    [notifications],
  );
  const unreadCount = notifications.filter((notification) => notification?.read !== true).length;

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(readNotifications());
    }

    function handleStorage(event) {
      if (event?.key === NOTIFICATIONS_STORAGE_KEY) {
        refreshNotifications();
      }
    }

    globalThis?.addEventListener?.(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
    globalThis?.addEventListener?.('storage', handleStorage);

    return () => {
      globalThis?.removeEventListener?.(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
      globalThis?.removeEventListener?.('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains?.(event?.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event?.key === 'Escape') {
        setOpen(false);
      }
    }

    globalThis?.document?.addEventListener?.('pointerdown', handlePointerDown);
    globalThis?.document?.addEventListener?.('keydown', handleKeyDown);

    return () => {
      globalThis?.document?.removeEventListener?.('pointerdown', handlePointerDown);
      globalThis?.document?.removeEventListener?.('keydown', handleKeyDown);
    };
  }, [open]);

  function saveReadState(nextNotifications) {
    if (!writeNotifications(nextNotifications)) {
      return;
    }

    setNotifications(nextNotifications);
    notifyInboxUpdated();
  }

  function markAsRead(notificationId) {
    const nextNotifications = notifications.map((notification) => (
      notification?.id === notificationId ? { ...notification, read: true } : notification
    ));
    saveReadState(nextNotifications);
  }

  function markAllAsRead() {
    const nextNotifications = notifications.map((notification) => ({ ...notification, read: true }));
    saveReadState(nextNotifications);
  }

  return (
    <div ref={rootRef} className="static shrink-0 lg:relative">
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-shadow-border bg-shadow-card text-shadow-textSecondary shadow-glass transition-all duration-200 hover:border-shadow-purple/50 hover:text-shadow-purpleLight hover:shadow-purpleGlow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shadow-purpleLight"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-shadow-gold px-1 text-[0.65rem] font-bold leading-none text-shadow-primary">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          className="absolute inset-x-4 top-[calc(100%+0.75rem)] z-50 flex max-h-[min(32rem,calc(100dvh-8.5rem))] w-auto flex-col overflow-hidden rounded-2xl border border-shadow-border bg-shadow-card shadow-glass sm:left-auto sm:right-4 sm:w-[22rem] lg:right-0"
          aria-label="Notification inbox"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-4 border-b border-shadow-border px-4 py-3">
            <div>
              <h2 className="font-heading text-base font-bold text-shadow-gold">Notifications</h2>
              <p className="mt-0.5 text-xs text-shadow-textMuted">Your latest ascent updates</p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-shadow-purpleLight transition-colors hover:text-shadow-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shadow-purpleLight"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {recentNotifications.length > 0 ? recentNotifications.map((notification) => (
              <button
                key={notification?.id}
                type="button"
                className={`flex w-full items-start gap-3 border-b border-shadow-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-shadow-purple/10 ${notification?.read ? 'bg-transparent' : 'bg-shadow-gold/[0.04]'}`}
                onClick={() => markAsRead(notification?.id)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-shadow-border bg-shadow-primary/60">
                  <NotificationTypeIcon type={notification?.type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-shadow-text">{notification?.title}</span>
                  <span className="mt-0.5 block break-words text-xs leading-5 text-shadow-textSecondary">{notification?.message}</span>
                  <span className="mt-1 block text-[0.7rem] text-shadow-textMuted">{relativeTime(notification?.createdAt)}</span>
                </span>
                {notification?.read ? null : <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-shadow-gold" aria-label="Unread" />}
              </button>
            )) : (
              <div className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center">
                <Bell className="h-7 w-7 text-shadow-textMuted" aria-hidden="true" />
                <p className="mt-3 text-sm text-shadow-textMuted">No notifications yet</p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
