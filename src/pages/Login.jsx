import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, KeyRound, Mail, Sparkles } from 'lucide-react';
import AppLogo from '../components/layout/AppLogo.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(form) {
  const errors = {};

  if (!form?.email?.trim()) {
    errors.email = 'Enter your email to continue.';
  } else if (!emailPattern.test(form?.email?.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form?.password) {
    errors.password = 'Enter your password.';
  }

  return errors;
}

function validateRecoveryEmail(email) {
  if (!email?.trim()) {
    return 'Enter the email tied to your account.';
  }

  if (!emailPattern.test(email?.trim())) {
    return 'Enter a valid email address.';
  }

  return '';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user, loading: authLoading, error: authError, signIn, resetPassword, clearError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const empty = !isSupabaseConfigured;
  const requestedPath = typeof location?.state?.from === 'string' ? location?.state?.from : '';
  const postAuthDestination = requestedPath?.startsWith('/') && !['/login', '/signup', '/reset-password'].includes(requestedPath)
    ? requestedPath
    : '/dashboard';

  useEffect(() => {
    if (user?.id) {
      navigate(postAuthDestination, { replace: true });
    }
  }, [navigate, postAuthDestination, user?.id]);

  useEffect(() => {
    if (authError) {
      setSubmitError(authError);
    }
  }, [authError]);

  const hasErrors = useMemo(() => Object.keys(errors || {})?.length > 0, [errors]);
  const emailValid = Boolean(form?.email?.trim()) && emailPattern.test(form?.email?.trim()) && !errors?.email;
  const passwordValid = Boolean(form?.password) && !errors?.password;

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }));
    setSubmitError('');
    clearError?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateLogin(form);
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors || {})?.length > 0 || empty) {
      return;
    }

    setSubmitting(true);
    const result = await signIn(form?.email?.trim(), form?.password);
    setSubmitting(false);

    if (result?.error) {
      setErrors({
        email: 'Validation failed. Check this email.',
        password: 'Validation failed. Check this password.',
      });
      setSubmitError(result?.error);
      return;
    }

    toast?.success?.('You are back in the ascent.');
    navigate(postAuthDestination, { replace: true });
  }

  async function handleRecoverySubmit(event) {
    event.preventDefault();
    const nextError = validateRecoveryEmail(recoveryEmail);
    setRecoveryError(nextError);
    setRecoverySent(false);

    if (nextError || empty) {
      return;
    }

    setRecoveryLoading(true);
    const result = await resetPassword(recoveryEmail?.trim());
    setRecoveryLoading(false);

    if (result?.error) {
      setRecoveryError(result?.error);
      return;
    }

    setRecoverySent(true);
    toast?.success?.('Password recovery instructions have been sent.');
  }

  return (
    <AuthPageShell eyebrow="Return to the tower" title="Log In" subtitle="Enter the gate and continue building your rank.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {empty ? (
          <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-4 text-sm leading-6 text-shadow-textSecondary">
            Authentication is not configured yet. Add your Supabase URL and anon key to the environment to enable login.
          </div>
        ) : null}

        {submitError && !hasErrors ? (
          <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm leading-6 text-shadow-textSecondary">{submitError}</div>
        ) : null}

        <Field
          autoComplete="email"
          disabled={authLoading || submitting || empty}
          error={errors?.email}
          helperText="Use the email tied to your Shadow Ascent account."
          icon={Mail}
          label="Email"
          onChange={(event) => updateField('email', event?.target?.value || '')}
          status={emailValid ? 'success' : errors?.email ? 'error' : 'idle'}
          successMessage="Email format is ready."
          type="email"
          value={form?.email}
        />

        <Field
          autoComplete="current-password"
          disabled={authLoading || submitting || empty}
          error={errors?.password}
          helperText="Enter your account password."
          icon={KeyRound}
          label="Password"
          onChange={(event) => updateField('password', event?.target?.value || '')}
          rightAction={
            <button
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-shadow-textMuted transition hover:text-shadow-gold"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          }
          status={passwordValid ? 'success' : errors?.password ? 'error' : 'idle'}
          successMessage="Password entered."
          type={showPassword ? 'text' : 'password'}
          value={form?.password}
        />

        <div className="flex items-center justify-between gap-4">
          <button className="text-sm font-semibold text-shadow-purpleLight transition hover:text-shadow-gold" onClick={() => setRecoveryOpen(true)} type="button">
            Forgot password?
          </button>
          <Link className="text-sm font-semibold text-shadow-textSecondary transition hover:text-shadow-gold" to="/signup">
            Create account
          </Link>
        </div>

        <Button className="w-full" disabled={empty} loading={submitting || authLoading} size="lg" type="submit">
          Enter Shadow Ascent
        </Button>
      </form>

      <Modal description="We will send a secure recovery link if the account exists." onClose={() => setRecoveryOpen(false)} open={recoveryOpen} title="Recover Password">
        <form className="space-y-5" onSubmit={handleRecoverySubmit}>
          {recoverySent ? (
            <div className="rounded-2xl border border-shadow-green/30 bg-shadow-green/10 p-4 text-sm leading-6 text-shadow-textSecondary">
              Check your inbox for the recovery link.
            </div>
          ) : null}

          {recoveryError ? (
            <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm leading-6 text-shadow-textSecondary">{recoveryError}</div>
          ) : null}

          <Field
            autoComplete="email"
            disabled={recoveryLoading || empty}
            error=""
            helperText={recoverySent ? 'Recovery request accepted.' : 'We will send a link if this account exists.'}
            icon={Mail}
            label="Recovery Email"
            onChange={(event) => {
              setRecoveryEmail(event?.target?.value || '');
              setRecoveryError('');
              setRecoverySent(false);
            }}
            status={recoverySent ? 'success' : recoveryError ? 'error' : 'idle'}
            successMessage="Recovery request accepted."
            type="email"
            value={recoveryEmail}
          />

          <Button className="w-full" disabled={empty} loading={recoveryLoading} size="lg" type="submit">
            Send Recovery Link
          </Button>
        </form>
      </Modal>
    </AuthPageShell>
  );
}

function AuthPageShell({ eyebrow, title, subtitle, children }) {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-shadow-purple/20 blur-2xl" />
        <div className="relative">
          <AppLogo className="h-14 w-14" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-shadow-purpleLight">{eyebrow}</p>
          <h1 className="mt-3 font-heading text-4xl font-bold text-shadow-gold sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-shadow-textSecondary">{subtitle}</p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-shadow-purpleLight" aria-hidden="true" />
              <p className="font-heading text-lg font-bold text-shadow-gold">Secure RPG Progression</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">Your rank profile syncs through Supabase and falls back to local cache when needed.</p>
          </div>
        </div>
      </aside>

      <div className="glass-card p-6 sm:p-8">
        {children}
        <div className="mt-6 rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 p-4 text-sm leading-6 text-shadow-textSecondary">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Review Free, Hunter, Shadow Elite, and Monarch before checkout arrives.</span>
            <Link className="shrink-0 font-semibold text-shadow-gold transition hover:text-shadow-purpleLight" to="/subscription">
              View plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, icon: Icon, error, helperText = '', rightAction, status = 'idle', successMessage = '', ...props }) {
  const currentStatus = error || status === 'error' ? 'error' : status === 'success' ? 'success' : 'idle';
  const isError = currentStatus === 'error';
  const isSuccess = currentStatus === 'success';
  const borderClass = isError
    ? 'border-shadow-red ring-2 ring-shadow-red/70'
    : isSuccess
      ? 'border-shadow-green ring-2 ring-shadow-green/70'
      : 'border-white/20 focus-within:border-shadow-gold focus-within:ring-2 focus-within:ring-shadow-gold/80';
  const iconClass = isError ? 'text-shadow-red' : isSuccess ? 'text-shadow-green' : 'text-shadow-purpleLight';
  const message = isError ? error : isSuccess ? successMessage : helperText;
  const messageClass = isError ? 'text-shadow-red' : isSuccess ? 'text-shadow-green' : 'text-shadow-textSecondary';

  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">{label}</span>
      <span className={`mt-2 flex min-h-12 items-center gap-3 rounded-2xl border bg-black/20 px-4 transition ${borderClass}`}>
        {Icon ? <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} aria-hidden="true" /> : null}
        <input className="min-w-0 flex-1 bg-transparent py-3 text-sm text-shadow-text outline-none placeholder:text-shadow-textMuted" {...props} />
        {isError ? (
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-shadow-red text-base font-black leading-none text-white">
            ¡
          </span>
        ) : null}
        {isSuccess ? (
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-shadow-green text-white">
            <Check className="h-4 w-4" />
          </span>
        ) : null}
        {rightAction}
      </span>
      {message ? <span className={`mt-2 block text-sm font-semibold ${messageClass}`}>{message}</span> : null}
    </label>
  );
}

export { AuthPageShell, Field, emailPattern };
