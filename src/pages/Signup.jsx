import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail, RefreshCw, UserRound } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { queueWelcomeOpening } from '../utils/welcomeOpening.js';
import { AuthPageShell, Field, emailPattern } from './Login.jsx';

function validateSignup(form) {
  const errors = {};

  if (!form?.displayName?.trim()) {
    errors.displayName = 'Choose a display name.';
  } else if (form?.displayName?.trim()?.length < 2) {
    errors.displayName = 'Display name must be at least 2 characters.';
  }

  if (!form?.email?.trim()) {
    errors.email = 'Enter your email.';
  } else if (!emailPattern.test(form?.email?.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form?.password) {
    errors.password = 'Create a password.';
  } else if (form?.password?.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!form?.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (form?.confirmPassword !== form?.password) {
    errors.confirmPassword = 'Passwords must match.';
  }

  return errors;
}

export default function Signup() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading, error: authError, signUp, resendSignupEmail, clearError } = useAuth();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validatedFields, setValidatedFields] = useState({});
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [confirmationDelayed, setConfirmationDelayed] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState({ type: '', message: '' });
  const empty = !isSupabaseConfigured;

  useEffect(() => {
    if (user?.id) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate, user?.id]);

  useEffect(() => {
    if (authError) {
      setSubmitError(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = globalThis?.setInterval?.(() => {
      setResendCooldown((currentCooldown) => Math.max(0, currentCooldown - 1));
    }, 1000);

    return () => {
      globalThis?.clearInterval?.(timer);
    };
  }, [resendCooldown]);

  const hasErrors = useMemo(() => Object.keys(errors || {})?.length > 0, [errors]);
  const displayNameReady = validatedFields?.displayName === form?.displayName?.trim() && !errors?.displayName;
  const emailReady = validatedFields?.email === form?.email?.trim()?.toLowerCase() && !errors?.email;
  const passwordReady = form?.password?.length >= 8 && !errors?.password;
  const confirmReady = Boolean(form?.confirmPassword) && form?.confirmPassword === form?.password && !errors?.confirmPassword;

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }));
    if (field === 'displayName' || field === 'email') {
      setValidatedFields((currentFields) => ({
        ...(currentFields || {}),
        [field]: '',
      }));
    }
    setSubmitError('');
    clearError?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateSignup(form);
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors || {})?.length > 0 || empty) {
      return;
    }

    setSubmitting(true);
    const result = await signUp(form?.email?.trim(), form?.password, {
      display_name: form?.displayName?.trim(),
    });
    setSubmitting(false);

    if (result?.error) {
      const nextFieldErrors = result?.fieldErrors && typeof result?.fieldErrors === 'object' ? result?.fieldErrors : {};
      setErrors((currentErrors) => ({
        ...(currentErrors || {}),
        ...nextFieldErrors,
      }));
      setValidatedFields({});
      setSubmitError(Object.keys(nextFieldErrors || {})?.length > 0 ? '' : result?.error);
      return;
    }

    setValidatedFields({
      displayName: form?.displayName?.trim(),
      email: form?.email?.trim()?.toLowerCase(),
    });
    queueWelcomeOpening({
      id: result?.data?.user?.id || '',
      email: result?.data?.user?.email || form?.email?.trim(),
    });

    if (result?.confirmationRequired) {
      const nextConfirmationEmail = result?.data?.user?.email || result?.pendingEmail || form?.email?.trim();
      setConfirmationEmail(nextConfirmationEmail);
      setConfirmationDelayed(Boolean(result?.confirmationDelayed));
      setResendStatus({ type: '', message: '' });
      toast?.success?.('Check your email to confirm your account.');
      return;
    }

    toast?.success?.('Your account is ready.');
    navigate('/onboarding', { replace: true });
  }

  async function handleResendConfirmation() {
    if (!confirmationEmail || resendLoading || resendCooldown > 0) {
      return;
    }

    setResendLoading(true);
    setResendCooldown(60);
    setResendStatus({ type: '', message: '' });
    const result = await resendSignupEmail?.(confirmationEmail);
    setResendLoading(false);

    if (result?.error) {
      setResendStatus({
        type: 'error',
        message: result?.error,
      });
      return;
    }

    setConfirmationDelayed(Boolean(result?.confirmationDelayed));
    setResendStatus({
      type: 'success',
      message: result?.confirmationDelayed
        ? 'Resend requested. Delivery is taking longer than expected, so check your inbox and spam folder while you wait.'
        : 'Confirmation email sent again. Check your inbox and spam folder.',
    });
    toast?.success?.(result?.confirmationDelayed ? 'Confirmation resend requested.' : 'Confirmation email sent again.');
  }

  if (confirmationEmail) {
    return (
      <AuthPageShell eyebrow="Confirmation required" title="Check Your Email" subtitle={confirmationDelayed ? 'Your confirmation request is still processing.' : 'Your account was created successfully.'}>
        <div className="rounded-2xl border border-shadow-green/35 bg-shadow-green/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-shadow-green" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold text-shadow-gold">Confirm your account</h2>
              <p className="mt-2 break-words text-sm leading-6 text-shadow-textSecondary">
                {confirmationDelayed ? 'Your signup reached the email confirmation step.' : 'Account created.'} Please check{' '}
                <span className="font-semibold text-shadow-text">{confirmationEmail}</span> and use the confirmation link before logging in.
              </p>
              <ul className="mt-3 space-y-1 text-sm leading-6 text-shadow-textSecondary">
                <li>Check your spam or junk folder.</li>
                <li>The confirmation email can take a few minutes.</li>
              </ul>
            </div>
          </div>
        </div>
        {resendStatus?.message ? (
          <div
            className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${
              resendStatus?.type === 'success'
                ? 'border-shadow-green/35 bg-shadow-green/10 text-shadow-textSecondary'
                : 'border-shadow-red/35 bg-shadow-red/10 text-shadow-textSecondary'
            }`}
            aria-live="polite"
          >
            {resendStatus?.message}
          </div>
        ) : null}
        <Button
          className="mt-5 w-full"
          disabled={resendLoading || resendCooldown > 0}
          loading={resendLoading}
          onClick={handleResendConfirmation}
          type="button"
          variant="secondary"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Confirmation Email'}
        </Button>
        <Link className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-shadow-purple/40 bg-shadow-purple/15 px-4 font-semibold text-shadow-purpleLight transition hover:bg-shadow-purple/25" to="/login">
          Continue to Login
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell eyebrow="Begin the ascent" title="Sign Up" subtitle="Create your adventurer profile and prepare for daily quests.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {empty ? (
          <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-4 text-sm leading-6 text-shadow-textSecondary">
            Authentication is not configured yet. Add your Supabase URL and anon key to the environment to enable signup.
          </div>
        ) : null}

        {submitError && !hasErrors ? (
          <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm leading-6 text-shadow-textSecondary">{submitError}</div>
        ) : null}

        <Field
          disabled={authLoading || submitting || empty}
          error={errors?.displayName}
          helperText="Choose a public adventurer name."
          icon={UserRound}
          label="Display Name"
          onChange={(event) => updateField('displayName', event?.target?.value || '')}
          status={displayNameReady ? 'success' : errors?.displayName ? 'error' : 'idle'}
          successMessage="Display name is available."
          type="text"
          value={form?.displayName}
        />
        <Field
          autoComplete="email"
          disabled={authLoading || submitting || empty}
          error={errors?.email}
          helperText="Use an email that can receive account messages."
          icon={Mail}
          label="Email"
          onChange={(event) => updateField('email', event?.target?.value || '')}
          status={emailReady ? 'success' : errors?.email ? 'error' : 'idle'}
          successMessage="Email is available."
          type="email"
          value={form?.email}
        />
        <Field
          autoComplete="new-password"
          disabled={authLoading || submitting || empty}
          error={errors?.password}
          helperText="Use at least 8 characters."
          icon={KeyRound}
          label="Password"
          onChange={(event) => updateField('password', event?.target?.value || '')}
          rightAction={
            <button aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-shadow-textMuted transition hover:text-shadow-gold" onClick={() => setShowPassword((visible) => !visible)} type="button">
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          }
          status={passwordReady ? 'success' : errors?.password ? 'error' : 'idle'}
          successMessage="Password strength requirement met."
          type={showPassword ? 'text' : 'password'}
          value={form?.password}
        />
        <Field
          autoComplete="new-password"
          disabled={authLoading || submitting || empty}
          error={errors?.confirmPassword}
          helperText="Repeat the same password."
          icon={KeyRound}
          label="Confirm Password"
          onChange={(event) => updateField('confirmPassword', event?.target?.value || '')}
          status={confirmReady ? 'success' : errors?.confirmPassword ? 'error' : 'idle'}
          successMessage="Passwords match."
          type={showPassword ? 'text' : 'password'}
          value={form?.confirmPassword}
        />

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-shadow-textMuted">Already forged?</span>
          <Link className="text-sm font-semibold text-shadow-purpleLight transition hover:text-shadow-gold" to="/login">
            Log in
          </Link>
        </div>

        <Button className="w-full" disabled={empty} loading={submitting || authLoading} size="lg" type="submit">
          Create Adventurer
        </Button>
      </form>
    </AuthPageShell>
  );
}
