import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

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

export async function getCurrentSession() {
  if (!supabase) {
    return { session: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session || null, error: error ? 'Unable to load your session.' : null };
  } catch {
    return { session: null, error: 'Unable to load your session.' };
  }
}

export async function getCurrentUser() {
  if (!supabase) {
    return { user: null, error: null };
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error: error ? 'Unable to load your account.' : null };
  } catch {
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
      },
    });

    if (error) {
      const message = String(error?.message || '').toLowerCase();
      const emailAlreadyUsed = /already|registered|exists|duplicate/.test(message);

      return {
        data: data || null,
        error: emailAlreadyUsed ? 'This email is already used.' : 'Unable to create your account.',
        fieldErrors: emailAlreadyUsed ? { email: 'This email is already used.' } : {},
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
      };
    }

    return { data: data || null, error: null, fieldErrors: {} };
  } catch {
    return { data: null, error: 'Unable to create your account right now.' };
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
