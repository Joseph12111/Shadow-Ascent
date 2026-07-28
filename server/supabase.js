import { ApiError } from './http.js';

function getSupabaseUrl() {
  return String(process?.env?.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
}

function getAnonKey() {
  return String(process?.env?.VITE_SUPABASE_ANON_KEY || '');
}

function getServiceRoleKey() {
  return String(process?.env?.SUPABASE_SERVICE_ROLE_KEY || '');
}

function requireSupabaseConfig({ admin = false } = {}) {
  const url = getSupabaseUrl();
  const key = admin ? getServiceRoleKey() : getAnonKey();

  if (!url || !key) {
    throw new ApiError(503, 'supabase_not_configured');
  }

  return { url, key };
}

function bearerToken(request) {
  const authorization = String(request?.headers?.authorization || '');
  return authorization?.startsWith('Bearer ') ? authorization?.slice(7)?.trim() : '';
}

export async function requireUser(request) {
  const token = bearerToken(request);

  if (!token) {
    throw new ApiError(401, 'auth_required');
  }

  const { url, key } = requireSupabaseConfig();

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response?.ok) {
      throw new ApiError(401, 'auth_required');
    }

    const user = await response?.json?.();
    if (!user?.id) {
      throw new ApiError(401, 'auth_required');
    }

    return { user, token };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'auth_required');
  }
}

async function adminRequest(path, { method = 'GET', body, prefer = '' } = {}) {
  const { url, key } = requireSupabaseConfig({ admin: true });
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(`${url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response?.ok) {
    throw new ApiError(502, 'supabase_admin_failed');
  }

  if (response?.status === 204) {
    return null;
  }

  const text = await response?.text?.();
  return text ? JSON.parse(text) : null;
}

export async function getSubscriptionForUser(userId) {
  const rows = await adminRequest(`/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  return Array.isArray(rows) ? rows?.[0] || null : null;
}

export async function getSubscriptionByCustomer(customerId) {
  const rows = await adminRequest(`/rest/v1/subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=*&limit=1`);
  return Array.isArray(rows) ? rows?.[0] || null : null;
}

export async function getSubscriptionByStripeId(subscriptionId) {
  const rows = await adminRequest(`/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&select=*&limit=1`);
  return Array.isArray(rows) ? rows?.[0] || null : null;
}

export async function upsertSubscription(payload) {
  const rows = await adminRequest('/rest/v1/subscriptions?on_conflict=user_id', {
    method: 'POST',
    body: payload,
    prefer: 'resolution=merge-duplicates,return=representation',
  });
  return Array.isArray(rows) ? rows?.[0] || null : rows;
}

export async function hasProcessedStripeEvent(eventId) {
  const rows = await adminRequest(`/rest/v1/stripe_webhook_events?event_id=eq.${encodeURIComponent(eventId)}&select=event_id&limit=1`);
  return Array.isArray(rows) && Boolean(rows?.[0]?.event_id);
}

export async function recordStripeEvent(eventId, eventType) {
  await adminRequest('/rest/v1/stripe_webhook_events?on_conflict=event_id', {
    method: 'POST',
    body: {
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString(),
    },
    prefer: 'resolution=ignore-duplicates',
  });
}

export async function consumeAiUsage(userId, feature) {
  return adminRequest('/rest/v1/rpc/consume_ai_usage', {
    method: 'POST',
    body: {
      p_user_id: userId,
      p_feature: feature,
    },
  });
}

export async function refundAiUsage(userId, feature) {
  try {
    await adminRequest('/rest/v1/rpc/refund_ai_usage', {
      method: 'POST',
      body: {
        p_user_id: userId,
        p_feature: feature,
      },
    });
  } catch {
    return false;
  }

  return true;
}

export async function verifyUserPassword(user, password) {
  const { url, key } = requireSupabaseConfig();

  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user?.email || '',
        password,
      }),
    });

    if (!response?.ok) {
      return false;
    }

    const data = await response?.json?.();
    return data?.user?.id === user?.id;
  } catch {
    return false;
  }
}

export async function deleteAuthUser(userId) {
  await adminRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
