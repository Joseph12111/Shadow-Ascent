import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { AuthPageShell, Field } from './Login.jsx';

function validatePasswordReset(form) {
  const errors = {};

  if (!form?.password) {
    errors.password = 'Enter a new password.';
  } else if (form?.password?.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!form?.confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.';
  } else if (form?.confirmPassword !== form?.password) {
    errors.confirmPassword = 'Passwords must match.';
  }

  return errors;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const { passwordRecovery, loading: authLoading, error: authError, updatePassword, clearError } = useAuth();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const empty = !isSupabaseConfigured || (!passwordRecovery && !authLoading);
  const hasErrors = useMemo(() => Object.keys(errors || {})?.length > 0, [errors]);

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
    const nextErrors = validatePasswordReset(form);
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors || {})?.length > 0 || empty) {
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(form?.password);
    setSubmitting(false);

    if (result?.error) {
      setSubmitError(result?.error);
      return;
    }

    toast?.success?.('Your password has been updated.');
    navigate('/login', { replace: true });
  }

  return (
    <AuthPageShell eyebrow="Restore access" title="Reset Password" subtitle="Set a new key for your Shadow Ascent account.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {empty ? (
          <div className="rounded-2xl border border-shadow-gold/30 bg-shadow-gold/10 p-4 text-sm leading-6 text-shadow-textSecondary">
            Open this page from a valid recovery link to set a new password.
          </div>
        ) : null}

        {(submitError || authError) && !hasErrors ? (
          <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm leading-6 text-shadow-textSecondary">{submitError || authError}</div>
        ) : null}

        <Field
          autoComplete="new-password"
          disabled={authLoading || submitting || empty}
          error={errors?.password}
          icon={KeyRound}
          label="New Password"
          onChange={(event) => updateField('password', event?.target?.value || '')}
          rightAction={
            <button aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-shadow-textMuted transition hover:text-shadow-gold" onClick={() => setShowPassword((visible) => !visible)} type="button">
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          }
          type={showPassword ? 'text' : 'password'}
          value={form?.password}
        />

        <Field autoComplete="new-password" disabled={authLoading || submitting || empty} error={errors?.confirmPassword} icon={KeyRound} label="Confirm New Password" onChange={(event) => updateField('confirmPassword', event?.target?.value || '')} type={showPassword ? 'text' : 'password'} value={form?.confirmPassword} />

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-shadow-textMuted">Recovery complete?</span>
          <Link className="text-sm font-semibold text-shadow-purpleLight transition hover:text-shadow-gold" to="/login">
            Back to login
          </Link>
        </div>

        <Button className="w-full" disabled={empty} loading={submitting || authLoading} size="lg" type="submit">
          Update Password
        </Button>
      </form>
    </AuthPageShell>
  );
}
