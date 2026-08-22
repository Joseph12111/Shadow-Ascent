import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, ShieldAlert, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { callAuthenticatedApi } from '../lib/apiClient.js';
import { signInWithPassword, signOutUser } from '../lib/supabase.js';

const HOLD_DURATION_MS = 1800;
const LOCAL_KEYS_TO_CLEAR = [
  'userProfile',
  'shadowAscentSession',
  'shadowAscentProfile',
  'shadowAscentProfileStatus',
  'shadowAscentOnboarding',
  'shadowAscentWelcomeOpeningPending',
  'shadowAscentQuestHistory',
  'shadowAscentWorkoutHistory',
  'shadowAscentChecklistTasks',
  'shadowAscentBadHabits',
  'shadowAscentInventory',
  'shadowAscentEquippedItems',
  'shadowAscentBrainQuestHistory',
  'shadowAscentAchievements',
  'shadowAscentRPHistory',
  'shadowAscentDashboardFocus',
  'shadowAscentNotificationSettings',
  'shadowAscentDeliveredNotifications',
  'shadowAscentSmartNotificationLog',
  'shadowAscentProfileMeta',
];

function clearLocalAccountData() {
  try {
    LOCAL_KEYS_TO_CLEAR.forEach((key) => {
      globalThis?.localStorage?.removeItem(key);
    });
  } catch {
    return false;
  }

  return true;
}

function HoldDeleteButton({ disabled = false, loading = false, onComplete }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef(0);
  const frameRef = useRef(null);

  function cancelHold() {
    setHolding(false);
    setProgress(0);
    if (frameRef?.current) {
      globalThis?.cancelAnimationFrame?.(frameRef?.current);
      frameRef.current = null;
    }
  }

  function tick() {
    const elapsed = Date.now() - Number(startedAtRef?.current || 0);
    const nextProgress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
    setProgress(nextProgress);

    if (nextProgress >= 100) {
      setHolding(false);
      frameRef.current = null;
      onComplete?.();
      return;
    }

    frameRef.current = globalThis?.requestAnimationFrame?.(tick);
  }

  function startHold() {
    if (disabled || loading) {
      return;
    }

    startedAtRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    frameRef.current = globalThis?.requestAnimationFrame?.(tick);
  }

  useEffect(() => () => cancelHold(), []);

  return (
    <button
      className="relative min-h-12 w-full overflow-hidden rounded-xl border border-shadow-red/60 bg-shadow-red/15 px-4 py-3 text-sm font-bold text-shadow-red transition hover:bg-shadow-red/20 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || loading}
      onBlur={cancelHold}
      onKeyDown={(event) => {
        if (event?.key === ' ' || event?.key === 'Enter') {
          event?.preventDefault?.();
          startHold();
        }
      }}
      onKeyUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerDown={startHold}
      onPointerLeave={cancelHold}
      onPointerUp={cancelHold}
      type="button"
    >
      <span className="absolute inset-y-0 left-0 bg-shadow-red transition-[width] duration-75" style={{ width: `${progress}%` }} />
      <span className={`relative z-10 flex items-center justify-center gap-2 ${progress > 58 ? 'text-white' : 'text-shadow-red'}`}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {loading ? 'Deleting Account...' : holding ? 'Hold to erase...' : 'Permanently Delete Account'}
      </span>
    </button>
  );
}

export default function DeleteAccount() {
  const { user, loading, error } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  async function verifyPassword(event) {
    event?.preventDefault?.();
    setLocalError('');

    if (!user?.email || !password) {
      setLocalError('Enter your password to unlock the final deletion step.');
      return;
    }

    setBusy(true);
    const result = await signInWithPassword(user?.email, password);
    setBusy(false);

    if (result?.error) {
      setPasswordVerified(false);
      setLocalError('Password verification failed.');
      return;
    }

    setPasswordVerified(true);
    toast?.success?.('Password confirmed. Hold the red button to finish.');
  }

  async function deleteAccount() {
    if (!passwordVerified || !user?.id || !password) {
      setLocalError('Account deletion is not ready. Confirm your password first.');
      return;
    }

    setBusy(true);
    setLocalError('');
    const result = await callAuthenticatedApi('/api/delete-account', { password }, { timeoutMs: 30_000 });

    if (!result?.ok) {
      setBusy(false);
      setLocalError(result?.message || 'Account could not be deleted right now.');
      return;
    }

    clearLocalAccountData();
    await signOutUser();
    setBusy(false);
    toast?.success?.('Account deleted.');
    navigate('/signup', { replace: true });
  }

  function closeModal() {
    if (busy) {
      return;
    }

    setModalOpen(false);
    setPassword('');
    setPasswordVerified(false);
    setLocalError('');
  }

  return (
    <div className="w-full space-y-6">
      <Card error={error} loading={loading} subtitle="Erase your Shadow Ascent character and account data." title="Delete Account" icon={ShieldAlert}>
        <div className="rounded-2xl border border-shadow-red/35 bg-shadow-red/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-shadow-red" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-heading text-xl font-bold text-shadow-gold">Danger Zone</h2>
              <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">
                This permanently deletes your account and linked Shadow Ascent data. You will need your password, then you must press and hold the final red button.
              </p>
            </div>
          </div>
          <Button className="mt-5 w-full border-shadow-red/50 bg-shadow-red/15 text-shadow-red hover:bg-shadow-red/25" onClick={() => setModalOpen(true)} variant="danger">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete Account
          </Button>
        </div>
      </Card>

      <Modal description="Confirm your password, then press and hold the red button until it fills." onClose={closeModal} open={modalOpen} title="Erase Character?">
        <div className="space-y-5">
          {localError ? <div className="rounded-xl border border-shadow-red/30 bg-shadow-red/10 p-3 text-sm text-shadow-textSecondary">{localError}</div> : null}

          <form className="space-y-4" onSubmit={verifyPassword}>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-shadow-textMuted">Password</span>
              <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 focus-within:border-shadow-gold/40">
                <Lock className="h-4 w-4 shrink-0 text-shadow-purpleLight" aria-hidden="true" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-shadow-text outline-none"
                  onChange={(event) => {
                    setPassword(event?.target?.value || '');
                    setPasswordVerified(false);
                    setLocalError('');
                  }}
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                />
              </div>
            </label>

            <Button disabled={!password || busy} loading={busy && !passwordVerified} type="submit" variant={passwordVerified ? 'secondary' : 'ghost'}>
              {passwordVerified ? 'Password Confirmed' : 'Confirm Password'}
            </Button>
          </form>

          <div className="rounded-2xl border border-shadow-red/30 bg-black/30 p-4">
            <p className="mb-3 text-sm leading-6 text-shadow-textSecondary">
              Final step: press and hold until the button fills red. Releasing early cancels the deletion.
            </p>
            <HoldDeleteButton disabled={!passwordVerified || busy} loading={busy && passwordVerified} onComplete={deleteAccount} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
