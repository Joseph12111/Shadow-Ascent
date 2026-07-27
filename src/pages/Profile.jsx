import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle2, Crown, Gem, KeyRound, Lock, Mail, Save, Shield, UserRound } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import RankWidget from '../components/game/RankWidget.jsx';
import AchievementCard from '../components/game/AchievementCard.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { signInWithPassword } from '../lib/supabase.js';
import { calculateRank, getTotalRP } from '../utils/rankEngine.js';
import { ACHIEVEMENTS, getUnlockedAchievements } from '../utils/achievementEngine.js';

const EQUIPPED_KEY = 'shadowAscentEquippedItems';
const PROFILE_META_KEY = 'shadowAscentProfileMeta';

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

export default function Profile() {
  const { user, profile, loading, error, updateProfile, signOut, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [meta, setMeta] = useState(() => {
    const storedMeta = readJSON(PROFILE_META_KEY, {});
    return storedMeta && typeof storedMeta === 'object' ? storedMeta : {};
  });
  const [form, setForm] = useState({
    displayName: profile?.display_name || meta?.displayName || '',
    title: meta?.title || 'Shadow Ascendant',
    bio: meta?.bio || 'Training in the dark, rising in gold.',
    goal: meta?.goal || 'Build discipline, strength, and clarity.',
  });
  const [localError, setLocalError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const equipped = readJSON(EQUIPPED_KEY, {});
  const unlocked = getUnlockedAchievements();
  const rankData = useMemo(() => calculateRank(Number(profile?.total_rp ?? getTotalRP())), [profile?.total_rp]);
  const featuredAchievements = ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.some((entry) => entry?.id === achievement?.id),
  })).slice(0, 3);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setLocalError('');
  }

  function saveProfile(event) {
    event.preventDefault();

    if (!form?.displayName?.trim()) {
      setLocalError('Display name is required.');
      return;
    }

    const nextMeta = {
      displayName: form?.displayName?.trim(),
      title: form?.title?.trim(),
      bio: form?.bio?.trim(),
      goal: form?.goal?.trim(),
      updatedAt: new Date().toISOString(),
    };
    const saved = writeJSON(PROFILE_META_KEY, nextMeta);

    if (!saved) {
      setLocalError('Profile details could not be saved locally.');
      return;
    }

    setMeta(nextMeta);
    updateProfile?.({
      display_name: nextMeta?.displayName,
      title: nextMeta?.title,
      bio: nextMeta?.bio,
      goal: nextMeta?.goal,
    });
    emitEvent('statUpdated', { type: 'profile', profile: nextMeta });
    toast?.success?.('Profile updated.');
  }

  async function handleSignOut(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setLocalError('');
    setSigningOut(true);

    const result = await signOut?.();
    setSigningOut(false);

    if (result?.error) {
      setLocalError(result?.error || 'Sign out could not be completed right now.');
      return;
    }

    toast?.success?.('You have signed out.');
    navigate('/login', { replace: true });
  }

  function openPasswordModal() {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError('');
    setPasswordNotice('');
    setPasswordModalOpen(true);
  }

  function closePasswordModal() {
    if (passwordBusy) {
      return;
    }

    setPasswordModalOpen(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError('');
    setPasswordNotice('');
  }

  function updatePasswordField(field, value) {
    setPasswordForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setPasswordError('');
    setPasswordNotice('');
  }

  async function handleForgotPassword(event) {
    event?.preventDefault?.();
    setPasswordError('');
    setPasswordNotice('');

    if (!user?.email) {
      setPasswordError('Sign in with an email account before requesting a reset link.');
      return;
    }

    setPasswordBusy(true);
    const result = await resetPassword?.(user?.email);
    setPasswordBusy(false);

    if (result?.error) {
      setPasswordError('A reset link could not be sent right now.');
      return;
    }

    setPasswordNotice('Password reset link sent. Check your email to continue.');
    toast?.success?.('Password reset link sent.');
  }

  async function handlePasswordChange(event) {
    event?.preventDefault?.();
    setPasswordError('');
    setPasswordNotice('');

    if (!user?.email) {
      setPasswordError('Sign in with an email account before changing your password.');
      return;
    }

    if (!passwordForm?.currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }

    if (!passwordForm?.newPassword || passwordForm?.newPassword?.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm?.newPassword !== passwordForm?.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordForm?.currentPassword === passwordForm?.newPassword) {
      setPasswordError('Choose a new password that is different from your current password.');
      return;
    }

    setPasswordBusy(true);
    const verification = await signInWithPassword(user?.email, passwordForm?.currentPassword);

    if (verification?.error) {
      setPasswordBusy(false);
      setPasswordError('Current password could not be verified.');
      return;
    }

    const result = await updatePassword?.(passwordForm?.newPassword);
    setPasswordBusy(false);

    if (result?.error) {
      setPasswordError('Password could not be updated right now.');
      return;
    }

    toast?.success?.('Password updated.');
    closePasswordModal();
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-5">
      <Card bodyClassName="p-4 sm:p-5" error={error} loading={loading} subtitle="Identity, equipped items, rank, and achievements." title="Profile" icon={UserRound}>
        {localError ? <div className="mb-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatBadge icon={Crown} label="Rank" value={rankData?.rankName} />
          <StatBadge icon={Gem} label="Gold" tone="purple" value={profile?.gold || 0} />
          <StatBadge icon={Award} label="XP" value={profile?.xp || 0} />
          <StatBadge icon={Shield} label="Equipped" tone="purple" value={Object.keys(equipped || {})?.length} />
        </div>
      </Card>

      <section className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card bodyClassName="p-4 sm:p-5" title="Adventurer Sheet" subtitle={user?.email || 'Guest profile'}>
          <form className="space-y-3.5" onSubmit={saveProfile}>
            <Field label="Display Name" onChange={(event) => updateField('displayName', event?.target?.value || '')} value={form?.displayName} />
            <Field label="Title" onChange={(event) => updateField('title', event?.target?.value || '')} value={form?.title} />
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-shadow-textMuted">Bio</span>
              <textarea className="mt-1.5 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" onChange={(event) => updateField('bio', event?.target?.value || '')} value={form?.bio} />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-shadow-textMuted">Current Goal</span>
              <textarea className="mt-1.5 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" onChange={(event) => updateField('goal', event?.target?.value || '')} value={form?.goal} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="submit">
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Profile
              </Button>
              <Button loading={signingOut} onClick={handleSignOut} type="button" variant="ghost">
                Sign Out
              </Button>
            </div>
          </form>
        </Card>

        <div className="min-w-0 max-w-full space-y-4">
          <RankWidget profile={profile} rankData={rankData} />
          <Card bodyClassName="p-4 sm:p-5" title="Account">
            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={user?.email || 'Not signed in'} />
              <InfoRow icon={UserRound} label="User ID" value={user?.id || 'Guest'} />
              <InfoRow icon={Crown} label="Title" value={meta?.title || form?.title} />
            </div>
            <Button className="mt-4 w-full" onClick={openPasswordModal} type="button" variant="ghost">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Change Password
            </Button>
          </Card>
        </div>
      </section>

      <section className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card bodyClassName="p-4 sm:p-5" empty={!Object.keys(equipped || {})?.length} emptyText="No items equipped yet. Visit the shop to equip gear." title="Equipped Items">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(equipped || {})?.map(([slot, itemId]) => (
              <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4" key={slot}>
                <p className="text-xs uppercase tracking-[0.2em] text-shadow-textMuted">{slot}</p>
                <p className="mt-2 font-heading text-lg font-bold text-shadow-gold">{itemId}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card bodyClassName="p-4 sm:p-5" empty={!featuredAchievements?.length} title="Featured Achievements">
          <div className="grid gap-3 lg:grid-cols-3">
            {featuredAchievements?.map((achievement) => (
              <AchievementCard achievement={achievement} key={achievement?.id} />
            ))}
          </div>
        </Card>
      </section>

      <Modal description="Confirm your current password or request a secure reset link by email." onClose={closePasswordModal} open={passwordModalOpen} title="Change Password">
        <form className="space-y-5" onSubmit={handlePasswordChange}>
          {passwordError ? <div className="rounded-xl border border-shadow-red/40 bg-shadow-red/10 p-3 text-sm font-semibold text-shadow-textSecondary">{passwordError}</div> : null}
          {passwordNotice ? (
            <div className="rounded-xl border border-shadow-green/40 bg-shadow-green/10 p-3 text-sm font-semibold text-shadow-textSecondary">{passwordNotice}</div>
          ) : null}

          <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-1 h-5 w-5 shrink-0 text-shadow-purpleLight" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-heading text-lg font-bold text-shadow-gold">Forgot password?</p>
                <p className="mt-1 text-sm leading-6 text-shadow-textSecondary">Send a recovery link to {user?.email || 'your email'}.</p>
                <button
                  className="mt-2 text-sm font-bold text-shadow-purpleLight underline-offset-4 transition hover:text-shadow-gold hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={passwordBusy || !user?.email}
                  onClick={handleForgotPassword}
                  type="button"
                >
                  Send password reset link
                </button>
              </div>
            </div>
          </div>

          <PasswordField
            autoComplete="current-password"
            label="Current Password"
            onChange={(event) => updatePasswordField('currentPassword', event?.target?.value || '')}
            placeholder="Enter current password"
            value={passwordForm?.currentPassword}
          />
          <PasswordField
            autoComplete="new-password"
            helperText="Use at least 8 characters."
            label="New Password"
            onChange={(event) => updatePasswordField('newPassword', event?.target?.value || '')}
            placeholder="Enter new password"
            value={passwordForm?.newPassword}
          />
          <PasswordField
            autoComplete="new-password"
            label="Confirm New Password"
            onChange={(event) => updatePasswordField('confirmPassword', event?.target?.value || '')}
            placeholder="Confirm new password"
            value={passwordForm?.confirmPassword}
          />

          <Button className="w-full" loading={passwordBusy} size="lg" type="submit">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Save New Password
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-shadow-textMuted">{label}</span>
      <input className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" {...props} />
    </label>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <Icon className="h-4 w-4 shrink-0 text-shadow-purpleLight" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.14em] text-shadow-textMuted">{label}</p>
        <p className="max-w-full truncate text-xs font-semibold text-shadow-text sm:text-sm">{value}</p>
      </div>
    </div>
  );
}

function PasswordField({ label, helperText = '', ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-shadow-textMuted">{label}</span>
      <span className="mt-1.5 flex min-h-12 items-center gap-3 rounded-xl border border-white/15 bg-black/25 px-3 transition focus-within:border-shadow-gold/50 focus-within:ring-2 focus-within:ring-shadow-gold/70">
        <Lock className="h-4 w-4 shrink-0 text-shadow-purpleLight" aria-hidden="true" />
        <input className="min-w-0 flex-1 bg-transparent py-3 text-sm text-shadow-text outline-none placeholder:text-shadow-textMuted" type="password" {...props} />
      </span>
      {helperText ? <span className="mt-2 block text-xs font-semibold text-shadow-textSecondary">{helperText}</span> : null}
    </label>
  );
}
