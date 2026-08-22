import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Crown, Gift, KeyRound, Lock, Mail, Save, Sparkles, UserRound } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import AchievementCard from '../components/game/AchievementCard.jsx';
import BasicAvatar from '../components/profile/BasicAvatar.jsx';
import AIBodyShapeAvatar from '../components/profile/AIBodyShapeAvatar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { signInWithPassword } from '../lib/supabase.js';
import { calculateRank, getTotalRP } from '../utils/rankEngine.js';
import { ACHIEVEMENTS, getUnlockedAchievements } from '../utils/achievementEngine.js';
import { getPlanAccess, getPlayerLevel, LEVEL_REWARDS } from '../utils/planAccess.js';

const EQUIPPED_KEY = 'shadowAscentEquippedItems';
const PROFILE_META_KEY = 'shadowAscentProfileMeta';
const CALCULATOR_STORAGE_KEY = 'shadowAscentCalculatorData';

const BODY_GOAL_LABELS = {
  bulk: 'Lean Gain',
  build_muscle: 'Build Muscle',
  cut: 'Fat Loss',
  gain_muscle: 'Build Muscle',
  improve_discipline: 'Improve Discipline',
  lose_fat: 'Fat Loss',
  maintain: 'Maintain',
};

const BODY_FOCUS_LABELS = {
  bulk: 'Lean Muscle',
  build_muscle: 'Lean Muscle',
  cut: 'Fat Loss',
  gain_muscle: 'Lean Muscle',
  improve_discipline: 'Consistency',
  lose_fat: 'Fat Loss',
  maintain: 'Body Shape',
};

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
  const { user, profile, subscription, loading, error, updateProfile, resetPassword, updatePassword } = useAuth();
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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [levelRewardsOpen, setLevelRewardsOpen] = useState(false);
  const equipped = readJSON(EQUIPPED_KEY, {});
  const unlocked = getUnlockedAchievements();
  const rankData = useMemo(() => calculateRank(Number(profile?.total_rp ?? getTotalRP())), [profile?.total_rp]);
  const access = useMemo(() => getPlanAccess({ user, profile, subscription }), [profile, subscription, user]);
  const playerLevel = useMemo(() => getPlayerLevel(profile), [profile]);
  const bodyPreviewData = useMemo(() => {
    const calculatorData = readJSON(CALCULATOR_STORAGE_KEY, {});
    const goalId = calculatorData?.goal || profile?.goal || profile?.onboarding_goal || '';
    const savedProgress = profile?.body_progress_percentage ?? profile?.progress_percentage;
    const numericProgress = Number(savedProgress);

    return {
      age: calculatorData?.age || profile?.age || null,
      bodyFocus: BODY_FOCUS_LABELS?.[goalId] || 'Body Shape',
      gender: calculatorData?.sex || profile?.sex || profile?.gender || '',
      goal: BODY_GOAL_LABELS?.[goalId] || form?.goal || 'Set goal',
      height: calculatorData?.heightCm || profile?.height_cm || profile?.heightCm || null,
      progress: Number.isFinite(numericProgress) ? Math.max(0, Math.min(100, numericProgress)) : null,
      weight: calculatorData?.weightKg || profile?.weight_kg || profile?.weightKg || null,
      workoutConsistency: profile?.workout_consistency || null,
    };
  }, [form?.goal, profile]);
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
      <Card bodyClassName="p-4 sm:p-5" error={error} loading={loading} subtitle="Your default Shadow Ascent RPG avatar." title="Profile" icon={UserRound}>
        {localError ? <div className="mb-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}
        <BasicAvatar
          displayName={form?.displayName || profile?.display_name || user?.email?.split?.('@')?.[0] || 'Ascendant'}
          gold={profile?.gold || 0}
          items={Object.keys(equipped || {})?.length}
          level={playerLevel}
          rank={`${rankData?.rankName || 'Shadow Initiate'} ${rankData?.division || 'V'}`}
          rankId={rankData?.rankId || 'shadow-initiate'}
          title={meta?.title || form?.title}
          xp={profile?.xp || 0}
        />
      </Card>

      <section className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card bodyClassName="p-4 sm:p-5" title="Adventurer Sheet" subtitle={user?.email || 'Guest profile'}>
          <form className="space-y-3.5" onSubmit={saveProfile}>
            <Field label="Display Name" onChange={(event) => updateField('displayName', event?.target?.value || '')} value={form?.displayName} />
            <Field label="Title" onChange={(event) => updateField('title', event?.target?.value || '')} value={form?.title} />
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-shadow-textMuted">Bio</span>
              <textarea className="mt-1.5 min-h-20 w-full rounded-xl border border-shadow-border bg-black/20 px-3 py-2.5 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" onChange={(event) => updateField('bio', event?.target?.value || '')} value={form?.bio} />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-shadow-textMuted">Current Goal</span>
              <textarea className="mt-1.5 min-h-20 w-full rounded-xl border border-shadow-border bg-black/20 px-3 py-2.5 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" onChange={(event) => updateField('goal', event?.target?.value || '')} value={form?.goal} />
            </label>
            <div>
              <Button className="w-full transition-all duration-200 hover:shadow-purpleGlow" type="submit">
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Profile
              </Button>
            </div>
          </form>
        </Card>

        <div className="min-w-0 max-w-full space-y-4">
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

      <section className="glass-card min-w-0 max-w-full overflow-hidden">
        <button
          aria-expanded={levelRewardsOpen}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-shadow-purple/10"
          onClick={() => setLevelRewardsOpen((open) => !open)}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-xl font-bold text-shadow-gold">Level Rewards</span>
            <span className="mt-1 block text-sm leading-6 text-shadow-textSecondary">
              Level {playerLevel}. Earned only through leveling.
            </span>
          </span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-shadow-purple/30 bg-shadow-purple/15 text-shadow-purpleLight shadow-purpleGlow">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-shadow-textMuted transition-transform duration-200 ${levelRewardsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${levelRewardsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="grid gap-3 border-t border-shadow-border p-4 sm:grid-cols-2 sm:p-5">
              {LEVEL_REWARDS.map((reward) => {
                const unlockedReward = playerLevel >= reward?.level;
                return (
                  <article
                    className={`rounded-2xl border p-4 ${
                      unlockedReward
                        ? 'border-shadow-gold/50 bg-shadow-gold/10 shadow-goldGlowStrong'
                        : 'border-shadow-border bg-white/[0.03] opacity-80'
                    }`}
                    key={reward?.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-shadow-purpleLight">Level {reward?.level}</p>
                        <h3 className="mt-2 font-heading text-lg font-bold text-shadow-gold">{reward?.name}</h3>
                      </div>
                      {unlockedReward ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-shadow-green" aria-hidden="true" />
                      ) : (
                        <Lock className="h-5 w-5 shrink-0 text-shadow-textMuted" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">{reward?.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Card
        bodyClassName="p-4 sm:p-5"
        subtitle="Visual estimate based on your profile, goal, and progress."
        title="AI Body Shape Preview"
        icon={Sparkles}
      >
        <div className="relative min-w-0 overflow-hidden rounded-2xl">
          <AIBodyShapeAvatar
            age={bodyPreviewData?.age}
            bodyGoal={bodyPreviewData?.bodyFocus}
            gender={bodyPreviewData?.gender}
            goal={bodyPreviewData?.goal}
            height={bodyPreviewData?.height}
            modelUrl={null}
            progress={bodyPreviewData?.progress}
            viewerHeight={360}
            weight={bodyPreviewData?.weight}
            workoutConsistency={bodyPreviewData?.workoutConsistency}
          />
          {!access?.avatar?.aiBodyShape ? (
            <div className="absolute inset-x-3 bottom-20 z-10 rounded-xl border border-shadow-purple/25 bg-shadow-card/95 p-3 text-center shadow-purpleGlow backdrop-blur-sm">
              <Lock className="mx-auto h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
              <p className="mt-1 text-xs font-semibold text-shadow-text">AI body shape preview requires a paid plan</p>
              <Button className="mt-2" onClick={() => navigate('/subscription')} size="sm" type="button" variant="ghost">
                View Plans
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <section className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card bodyClassName="p-4 sm:p-5" empty={!Object.keys(equipped || {})?.length} emptyText="No items equipped yet. Visit the shop to equip gear." title="Equipped Items">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(equipped || {})?.map(([slot, itemId]) => (
              <div className="rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4 transition-colors hover:border-shadow-purple/50" key={slot}>
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-shadow-purple/20 shadow-purpleGlow">
                <KeyRound className="h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
              </span>
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

          <Button className="w-full transition-all duration-200 hover:shadow-purpleGlow" loading={passwordBusy} size="lg" type="submit">
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
      <input className="mt-1.5 min-h-11 w-full rounded-xl border border-shadow-border bg-black/20 px-3 text-sm text-shadow-text outline-none transition focus:border-shadow-gold/40" {...props} />
    </label>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-shadow-border bg-white/[0.03] p-3">
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
      <span className="mt-1.5 flex min-h-12 items-center gap-3 rounded-xl border border-shadow-border bg-black/25 px-3 transition focus-within:border-shadow-gold/50 focus-within:ring-2 focus-within:ring-shadow-gold/70">
        <Lock className="h-4 w-4 shrink-0 text-shadow-purpleLight" aria-hidden="true" />
        <input className="min-w-0 flex-1 bg-transparent py-3 text-sm text-shadow-text outline-none placeholder:text-shadow-textMuted" type="password" {...props} />
      </span>
      {helperText ? <span className="mt-2 block text-xs font-semibold text-shadow-textSecondary">{helperText}</span> : null}
    </label>
  );
}
