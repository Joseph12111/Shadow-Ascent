import { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Bell, BellOff, Clock, ShieldAlert, Volume2, Zap } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import {
  getNotificationPermission,
  NOTIFICATION_CHANNELS,
  readNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  syncNotificationSettingsFromSupabase,
} from '../utils/notificationSystem.js';

function Toggle({ checked, disabled = false, label, description, onChange }) {
  return (
    <label className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${checked ? 'border-shadow-gold/30 bg-shadow-gold/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <span className="min-w-0">
        <span className="block font-semibold text-shadow-text">{label}</span>
        {description ? <span className="mt-1 block text-sm leading-5 text-shadow-textSecondary">{description}</span> : null}
      </span>
      <input checked={Boolean(checked)} className="sr-only" disabled={disabled} onChange={(event) => onChange?.(event?.target?.checked)} type="checkbox" />
      <span className={`relative h-7 w-12 shrink-0 rounded-full border transition ${checked ? 'border-shadow-gold bg-shadow-gold' : 'border-white/20 bg-black/40'} ${disabled ? 'opacity-50' : ''}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </span>
    </label>
  );
}

export default function NotificationSettings() {
  const { user, loading, error } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState(() => readNotificationSettings());
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [localError, setLocalError] = useState('');
  const empty = false;
  const permissionWarning = permission === 'denied' || permission === 'unsupported';
  const enabledChannels = useMemo(
    () => NOTIFICATION_CHANNELS.filter((channel) => settings?.channels?.[channel?.id])?.length,
    [settings?.channels],
  );

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let alive = true;

    syncNotificationSettingsFromSupabase(user)
      .then((nextSettings) => {
        if (alive) {
          setSettings(nextSettings);
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [user]);

  function persist(nextSettings) {
    const savedSettings = saveNotificationSettings(user, nextSettings);
    setSettings(savedSettings);
    setLocalError('');
    toast?.success?.('Notification settings saved.');
  }

  async function enableNotifications() {
    setLocalError('');
    const nextPermission = await requestNotificationPermission();
    setPermission(nextPermission);

    if (nextPermission !== 'granted') {
      const nextSettings = {
        ...(settings || {}),
        enabled: false,
        permissionAsked: true,
        permissionSkipped: nextPermission === 'default',
      };
      persist(nextSettings);
      setLocalError('Notifications are not enabled at the browser or device level.');
      return;
    }

    persist({
      ...(settings || {}),
      enabled: true,
      permissionAsked: true,
      permissionSkipped: false,
    });
  }

  function updateSetting(field, value) {
    persist({
      ...(settings || {}),
      [field]: value,
    });
  }

  function updateQuietHours(field, value) {
    persist({
      ...(settings || {}),
      quietHours: {
        ...(settings?.quietHours || {}),
        [field]: value,
      },
    });
  }

  function updateChannel(channelId, value) {
    persist({
      ...(settings || {}),
      channels: {
        ...(settings?.channels || {}),
        [channelId]: value,
      },
    });
  }

  function disableAll() {
    persist({
      ...(settings || {}),
      enabled: false,
      channels: NOTIFICATION_CHANNELS.reduce((nextChannels, channel) => ({
        ...nextChannels,
        [channel?.id]: false,
      }), {}),
    });
  }

  function enableAll() {
    persist({
      ...(settings || {}),
      enabled: permission === 'granted',
      channels: NOTIFICATION_CHANNELS.reduce((nextChannels, channel) => ({
        ...nextChannels,
        [channel?.id]: true,
      }), {}),
    });
  }

  return (
    <div className="w-full space-y-6">
      <Card empty={empty} error={error} loading={loading} subtitle="Your personal quest assistant for reminders, alerts, and streak protection." title="Notification Settings" icon={Bell}>
        {localError ? <div className="mb-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-5">
            <div className="flex items-start gap-3">
              <Bell className="mt-1 h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
              <div>
                <h2 className="font-heading text-xl font-bold text-shadow-gold">Permission Gate</h2>
                <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">
                  Browser permission: <span className="font-semibold text-shadow-text">{permission}</span>. We only ask when you choose to enable reminders.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button onClick={enableNotifications} disabled={permission === 'unsupported'}>
                <Bell className="h-4 w-4" aria-hidden="true" />
                Allow Notifications
              </Button>
              <Button onClick={disableAll} variant="ghost">
                <BellOff className="h-4 w-4" aria-hidden="true" />
                Disable All
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-shadow-textMuted">Active Channels</p>
            <p className="mt-2 font-heading text-4xl font-bold text-shadow-gold">{enabledChannels}</p>
            <p className="mt-2 text-sm text-shadow-textSecondary">Time zone detected: {settings?.timeZone || 'Local'}</p>
          </div>
        </div>
      </Card>

      <Card title="Master Controls" subtitle="Gold switches are enabled. We respect denied permissions and quiet hours." icon={ShieldAlert}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Toggle checked={settings?.enabled} disabled={permission !== 'granted'} label="Enable all notifications" description={permission !== 'granted' ? 'Allow browser notifications first.' : 'Master switch for all enabled channels.'} onChange={(value) => updateSetting('enabled', value)} />
          <Toggle checked={!settings?.enabled} label="Disable all notifications" description="Turns off active delivery while preserving preferences." onChange={(value) => (value ? updateSetting('enabled', false) : undefined)} />
          <Toggle checked={settings?.sound} label="Enable sound" description="Allow audible quest cues when the browser supports them." onChange={(value) => updateSetting('sound', value)} />
          <Toggle checked={settings?.vibration} label="Enable vibration" description="Vibrate supported mobile devices for priority reminders." onChange={(value) => updateSetting('vibration', value)} />
          <Toggle checked={settings?.lockScreen} label="Enable lock-screen notifications" description="Preference saved for device-level notification display." onChange={(value) => updateSetting('lockScreen', value)} />
          <Toggle checked={settings?.badges} label="Enable notification badges" description="Preference saved for badge-capable installs." onChange={(value) => updateSetting('badges', value)} />
          <Toggle checked={settings?.smartReminders} label="Smart reminders" description="Behavior-based reminders with frequency limits." onChange={(value) => updateSetting('smartReminders', value)} />
          <Toggle checked={settings?.quietHours?.enabled} label="Quiet hours" description="Pause reminders during your rest window." onChange={(value) => updateQuietHours('enabled', value)} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Quiet Start</span>
            <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none focus:border-shadow-gold/40" onChange={(event) => updateQuietHours('start', event?.target?.value || '22:00')} type="time" value={settings?.quietHours?.start || '22:00'} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Quiet End</span>
            <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none focus:border-shadow-gold/40" onChange={(event) => updateQuietHours('end', event?.target?.value || '07:00')} type="time" value={settings?.quietHours?.end || '07:00'} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">Smart Limit Hours</span>
            <input className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-shadow-text outline-none focus:border-shadow-gold/40" min="1" onChange={(event) => updateSetting('smartReminderFrequencyHours', Number(event?.target?.value || 6))} type="number" value={settings?.smartReminderFrequencyHours || 6} />
          </label>
        </div>

        {permissionWarning ? (
          <div className="mt-4 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm leading-6 text-shadow-textSecondary">
            Phone or browser-level notification permissions are disabled. Enable them in your browser or device settings to receive reminders.
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={enableAll} variant="secondary">
            <Zap className="h-4 w-4" aria-hidden="true" />
            Enable Channels
          </Button>
          <Button onClick={disableAll} variant="ghost">
            Disable Everything
          </Button>
        </div>
      </Card>

      <Card title="Reminder Channels" subtitle="Turn individual RPG notification channels on or off." icon={AlarmClock}>
        <div className="grid gap-3 lg:grid-cols-2">
          {NOTIFICATION_CHANNELS?.map((channel) => (
            <Toggle
              checked={Boolean(settings?.channels?.[channel?.id])}
              description={channel?.message}
              key={channel?.id}
              label={channel?.label}
              onChange={(value) => updateChannel(channel?.id, value)}
            />
          ))}
        </div>
      </Card>

      <Card title="Local Time" subtitle="Reminder times are interpreted in your detected local time zone." icon={Clock}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-shadow-textSecondary">
          Current time zone: <span className="font-semibold text-shadow-gold">{settings?.timeZone || 'Local'}</span>. Change your device time zone to update reminder delivery.
        </div>
      </Card>
    </div>
  );
}
