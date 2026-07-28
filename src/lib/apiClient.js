import { supabase } from './supabase.js';

async function getAccessToken() {
  if (!supabase) {
    return '';
  }

  try {
    const { data } = await supabase?.auth?.getSession?.();
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

function createRequestId() {
  try {
    return globalThis?.crypto?.randomUUID?.() || `request-${Date.now()}`;
  } catch {
    return `request-${Date.now()}`;
  }
}

export async function callAuthenticatedApi(path, body, { timeoutMs = 65_000 } = {}) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return {
      ok: false,
      status: 401,
      data: null,
      code: 'auth_required',
      message: 'Sign in to continue.',
    };
  }

  const controller = new AbortController();
  const timeoutId = globalThis?.setTimeout?.(() => controller?.abort?.(), timeoutMs);

  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Request-Id': createRequestId(),
      },
      body: JSON.stringify(body || {}),
      signal: controller?.signal,
    });
    const data = await response?.json?.().catch(() => ({}));

    return {
      ok: Boolean(response?.ok),
      status: Number(response?.status || 0),
      data: data || null,
      code: data?.code || '',
      message: data?.message || (response?.ok ? '' : 'That request could not be completed.'),
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      code: 'network_unavailable',
      message: 'The secure service is unreachable right now.',
    };
  } finally {
    if (timeoutId) {
      globalThis?.clearTimeout?.(timeoutId);
    }
  }
}
