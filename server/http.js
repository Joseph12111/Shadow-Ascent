const DEFAULT_APP_ORIGINS = [
  'https://www.shadowascent.app',
  'https://shadowascent.app',
];

export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function sendJson(response, status, payload) {
  response?.setHeader?.('Cache-Control', 'no-store');
  response?.setHeader?.('Content-Type', 'application/json; charset=utf-8');
  response?.setHeader?.('X-Content-Type-Options', 'nosniff');
  const body = JSON.stringify(payload);

  if (typeof response?.status === 'function' && typeof response?.send === 'function') {
    response?.status?.(status)?.send?.(body);
    return;
  }

  response.statusCode = status;
  response?.end?.(body);
}

export function requirePost(request) {
  if (request?.method !== 'POST') {
    throw new ApiError(405, 'method_not_allowed');
  }
}

export function assertTrustedOrigin(request) {
  const origin = String(request?.headers?.origin || '');

  if (!origin) {
    return;
  }

  const configuredOrigin = String(process?.env?.APP_URL || '').replace(/\/+$/, '');
  const vercelOrigin = process?.env?.VERCEL_URL ? `https://${process?.env?.VERCEL_URL}` : '';
  const allowedOrigins = new Set([...DEFAULT_APP_ORIGINS, configuredOrigin, vercelOrigin].filter(Boolean));
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin);

  if (!allowedOrigins?.has(origin) && !localOrigin) {
    throw new ApiError(403, 'origin_not_allowed');
  }
}

export async function readJsonBody(request, maxBytes = 32_000) {
  const existingBody = request?.body;

  if (existingBody && typeof existingBody === 'object' && !Buffer.isBuffer(existingBody)) {
    const serialized = JSON.stringify(existingBody);
    if (Buffer.byteLength(serialized) > maxBytes) {
      throw new ApiError(413, 'request_too_large');
    }
    return existingBody;
  }

  if (typeof existingBody === 'string' || Buffer.isBuffer(existingBody)) {
    const serialized = Buffer.isBuffer(existingBody) ? existingBody : Buffer.from(existingBody);
    if (serialized?.length > maxBytes) {
      throw new ApiError(413, 'request_too_large');
    }
    try {
      return JSON.parse(serialized?.toString?.('utf8') || '{}');
    } catch {
      throw new ApiError(400, 'invalid_json');
    }
  }

  const chunks = [];
  let totalBytes = 0;

  try {
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer?.length || 0;
      if (totalBytes > maxBytes) {
        throw new ApiError(413, 'request_too_large');
      }
      chunks?.push(buffer);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, 'invalid_request_body');
  }

  try {
    return JSON.parse(Buffer.concat(chunks)?.toString?.('utf8') || '{}');
  } catch {
    throw new ApiError(400, 'invalid_json');
  }
}

export async function readRawBody(request, maxBytes = 1_000_000) {
  const existingBody = request?.body;

  if (typeof existingBody === 'string' || Buffer.isBuffer(existingBody)) {
    const body = Buffer.isBuffer(existingBody) ? existingBody : Buffer.from(existingBody);
    if (body?.length > maxBytes) {
      throw new ApiError(413, 'request_too_large');
    }
    return body;
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer?.length || 0;
    if (totalBytes > maxBytes) {
      throw new ApiError(413, 'request_too_large');
    }
    chunks?.push(buffer);
  }

  return Buffer.concat(chunks);
}

export function safeApiMessage(error, fallback) {
  const messages = {
    auth_required: 'Sign in to continue.',
    invalid_credentials: 'Password verification failed.',
    usage_limit_reached: 'Your current plan allowance has been reached.',
    ai_not_configured: 'The AI forge is not configured yet.',
    stripe_not_configured: 'Secure billing is not configured yet.',
    subscription_not_found: 'No active Stripe customer was found for this account.',
    invalid_plan: 'That subscription option is unavailable.',
    account_delete_failed: 'Account could not be deleted right now.',
    request_too_large: 'That request is too large.',
    origin_not_allowed: 'This request could not be verified.',
  };

  return messages?.[error?.code] || fallback;
}
