import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const productionAppUrl = 'https://www.shadowascent.app';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

function getSupabaseErrorDetails(error) {
  return {
    message: String(error?.message || 'Unknown Supabase error'),
    code: error?.code || null,
    status: error?.status || null,
    name: error?.name || null,
  };
}

function logAuthFailure(step, error) {
  if (!import.meta.env?.DEV) {
    return;
  }

  console.error(`[Shadow Ascent auth] ${step} failed`, getSupabaseErrorDetails(error));
}

function getSignupError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || 0);

  if (code === 'email_address_invalid' || /invalid email|email address.*invalid/.test(message)) {
    return {
      message: 'Enter a valid email address that can receive confirmation messages.',
      fieldErrors: { email: 'This email address is not valid.' },
    };
  }

  if (/already|registered|exists|duplicate/.test(message) || code === 'user_already_exists') {
    return {
      message: 'An account already exists for this email. Try logging in or resetting your password.',
      fieldErrors: { email: 'This email is already registered.' },
    };
  }

  if (/weak|password/.test(message) && (/short|characters|strength|easy/.test(message) || code === 'weak_password')) {
    return {
      message: 'Choose a stronger password and try again.',
      fieldErrors: { password: 'This password does not meet the account security requirements.' },
    };
  }

  if (code === 'over_email_send_rate_limit' || /rate limit|too many/.test(message) || status === 429) {
    return {
      message: 'Too many signup attempts were made. Wait a few minutes, then try again.',
      fieldErrors: {},
    };
  }

  if (code === 'request_timeout' || status === 504 || /deadline exceeded|timed? out|timeout/.test(message)) {
    return {
      message: 'Account confirmation is taking longer than expected. Check your inbox first, then try again in a few minutes if no email arrives.',
      fieldErrors: {},
    };
  }

  if (code === 'signup_disabled' || /signups? (are )?disabled|registration.*disabled/.test(message)) {
    return {
      message: 'New account registration is temporarily unavailable.',
      fieldErrors: {},
    };
  }

  return {
    message: 'We could not create your account. Please try again shortly.',
    fieldErrors: {},
  };
}

function isConfirmationTimeout(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || 0);

  return code === 'request_timeout' || status === 504 || /deadline exceeded|timed? out|timeout/.test(message);
}

export function getSignupRedirectUrl() {
  try {
    const currentOrigin = globalThis?.location?.origin || '';
    const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(currentOrigin);
    const appOrigin = import.meta.env?.DEV && isLocalOrigin ? currentOrigin : productionAppUrl;
    return `${appOrigin}/login?confirmed=1`;
  } catch {
    return `${productionAppUrl}/login?confirmed=1`;
  }
}

export async function getCurrentSession() {
  if (!supabase) {
    return { session: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logAuthFailure('auth.getSession', error);
    }
    return { session: data?.session || null, error: error ? 'Unable to load your session.' : null };
  } catch (error) {
    logAuthFailure('auth.getSession', error);
    return { session: null, error: 'Unable to load your session.' };
  }
}

export async function getCurrentUser() {
  if (!supabase) {
    return { user: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      logAuthFailure('auth.getUser', error);
    }
    return { user: data?.user || null, error: error ? 'Unable to load your account.' : null };
  } catch (error) {
    logAuthFailure('auth.getUser', error);
    return { user: null, error: 'Unable to load your account.' };
  }
}

export async function signInWithPassword(email, password) {
  if (!supabase) {
    return { data: null, error: 'Authentication is not configured yet.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data: data || null, error: error ? 'Unable to sign in with those credentials.' : null };
  } catch {
    return { data: null, error: 'Unable to sign in right now.' };
  }
}

export async function signUpWithPassword(email, password, metadata = {}) {
  if (!supabase) {
    return { data: null, error: 'Authentication is not configured yet.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: getSignupRedirectUrl(),
      },
    });

    if (error) {
      logAuthFailure('auth.signUp', error);

      if (isConfirmationTimeout(error)) {
        return {
          data: data || null,
          error: null,
          fieldErrors: {},
          confirmationRequired: true,
          confirmationDelayed: true,
          pendingEmail: email,
          failureStep: 'auth.signUp confirmation delivery',
          errorCode: error?.code || null,
          errorStatus: error?.status || null,
        };
      }

      const friendlyError = getSignupError(error);

      return {
        data: data || null,
        error: friendlyError?.message,
        fieldErrors: friendlyError?.fieldErrors || {},
        failureStep: 'auth.signUp',
        errorCode: error?.code || null,
        errorStatus: error?.status || null,
      };
    }

    const identityList = Array.isArray(data?.user?.identities) ? data?.user?.identities : [];
    const duplicateSignup = Boolean(data?.user?.id) && identityList?.length === 0;

    if (duplicateSignup) {
      return {
        data: data || null,
        error: 'This account is already used.',
        fieldErrors: {
          email: 'This email is already used.',
          displayName: metadata?.display_name ? 'Validation failed. This name may already be used.' : '',
        },
        failureStep: 'auth.signUp',
        errorCode: 'user_already_exists',
        errorStatus: 400,
      };
    }

    if (!data?.user?.id) {
      const missingUserError = new Error('Supabase signup returned no user.');
      logAuthFailure('auth.signUp response validation', missingUserError);
      return {
        data: data || null,
        error: 'We could not verify that your account was created. Please try again.',
        fieldErrors: {},
        failureStep: 'auth.signUp response validation',
        errorCode: 'missing_signup_user',
        errorStatus: null,
      };
    }

    return {
      data: data || null,
      error: null,
      fieldErrors: {},
      confirmationRequired: !data?.session,
      failureStep: null,
      errorCode: null,
      errorStatus: null,
    };
  } catch (error) {
    logAuthFailure('auth.signUp request', error);

    if (isConfirmationTimeout(error)) {
      return {
        data: null,
        error: null,
        fieldErrors: {},
        confirmationRequired: true,
        confirmationDelayed: true,
        pendingEmail: email,
        failureStep: 'auth.signUp confirmation delivery',
        errorCode: error?.code || null,
        errorStatus: error?.status || null,
      };
    }

    const friendlyError = getSignupError(error);
    return {
      data: null,
      error: friendlyError?.message,
      fieldErrors: friendlyError?.fieldErrors || {},
      failureStep: 'auth.signUp request',
      errorCode: error?.code || null,
      errorStatus: error?.status || null,
    };
  }
}

export async function resendSignupConfirmation(email) {
  if (!supabase) {
    return { data: null, error: 'Authentication is not configured yet.' };
  }

  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getSignupRedirectUrl(),
      },
    });

    if (error) {
      logAuthFailure('auth.resend signup confirmation', error);

      if (isConfirmationTimeout(error)) {
        return {
          data: data || null,
          error: null,
          confirmationDelayed: true,
          errorCode: error?.code || null,
          errorStatus: error?.status || null,
          failureStep: 'auth.resend signup confirmation delivery',
        };
      }

      const friendlyError = getSignupError(error);
      return {
        data: data || null,
        error: friendlyError?.message || 'Unable to resend the confirmation email right now.',
        errorCode: error?.code || null,
        errorStatus: error?.status || null,
        failureStep: 'auth.resend signup confirmation',
      };
    }

    return {
      data: data || null,
      error: null,
      errorCode: null,
      errorStatus: null,
      failureStep: null,
    };
  } catch (error) {
    logAuthFailure('auth.resend signup confirmation request', error);

    if (isConfirmationTimeout(error)) {
      return {
        data: null,
        error: null,
        confirmationDelayed: true,
        errorCode: error?.code || null,
        errorStatus: error?.status || null,
        failureStep: 'auth.resend signup confirmation delivery',
      };
    }

    const friendlyError = getSignupError(error);
    return {
      data: null,
      error: friendlyError?.message || 'Unable to resend the confirmation email right now.',
      errorCode: error?.code || null,
      errorStatus: error?.status || null,
      failureStep: 'auth.resend signup confirmation request',
    };
  }
}

export async function requestPasswordReset(email, redirectTo) {
  if (!supabase) {
    return { data: null, error: 'Password recovery is not configured yet.' };
  }

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { data: data || null, error: error ? 'Unable to send a recovery email.' : null };
  } catch {
    return { data: null, error: 'Unable to send a recovery email right now.' };
  }
}

export async function updateUserPassword(password) {
  if (!supabase) {
    return { data: null, error: 'Password updates are not configured yet.' };
  }

  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    return { data: data || null, error: error ? 'Unable to update your password.' : null };
  } catch {
    return { data: null, error: 'Unable to update your password right now.' };
  }
}

export async function signOutUser() {
  if (!supabase) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? 'Unable to sign out cleanly.' : null };
  } catch {
    return { error: 'Unable to sign out right now.' };
  }
}
