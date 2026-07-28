import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from './http.js';

const PRICE_CATALOG = {
  hunter: {
    monthly: 'price_1TxsgaGgurzceHo5DtWP9u3U',
    annual: 'price_1TxsgkGgurzceHo5bSCzuO2Z',
  },
  'shadow-elite': {
    monthly: 'price_1TxsgwGgurzceHo5CgXcYFBd',
    annual: 'price_1Txsh5GgurzceHo50NIrLHUP',
  },
  monarch: {
    monthly: 'price_1TxshGGgurzceHo5I6aBjFlQ',
    annual: 'price_1TxshTGgurzceHo5POKO8LZe',
  },
};

function stripeSecret() {
  const secret = String(process?.env?.STRIPE_SECRET_KEY || '');
  if (!secret) {
    throw new ApiError(503, 'stripe_not_configured');
  }
  return secret;
}

function toFormBody(values) {
  const params = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params?.append(key, String(value));
    }
  });
  return params;
}

export function getPriceSelection(planId, billingCycle) {
  const plan = PRICE_CATALOG?.[planId];
  const priceId = plan?.[billingCycle];

  if (!priceId) {
    throw new ApiError(400, 'invalid_plan');
  }

  return { planId, billingCycle, priceId };
}

export function getPlanByPriceId(priceId) {
  for (const [planId, prices] of Object.entries(PRICE_CATALOG)) {
    for (const [billingCycle, catalogPriceId] of Object.entries(prices || {})) {
      if (catalogPriceId === priceId) {
        return { planId, billingCycle, priceId };
      }
    }
  }

  return { planId: 'awakened', billingCycle: null, priceId: priceId || null };
}

export async function stripeRequest(path, { method = 'POST', form, idempotencyKey } = {}) {
  const secret = stripeSecret();
  const headers = {
    Authorization: `Bearer ${secret}`,
  };

  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  let response;

  try {
    response = await fetch(`https://api.stripe.com/v1${path}`, {
      method,
      headers,
      body: form ? toFormBody(form) : undefined,
    });
  } catch {
    throw new ApiError(502, 'stripe_unavailable');
  }

  if (!response?.ok) {
    throw new ApiError(502, 'stripe_request_failed');
  }

  return response?.json?.();
}

export function getAppUrl() {
  const configuredUrl = String(process?.env?.APP_URL || '').replace(/\/+$/, '');
  if (configuredUrl) {
    return configuredUrl;
  }

  if (process?.env?.VERCEL_ENV !== 'production' && process?.env?.VERCEL_URL) {
    return `https://${process?.env?.VERCEL_URL}`;
  }

  return 'https://www.shadowascent.app';
}

export function verifyStripeWebhook(rawBody, signatureHeader) {
  const webhookSecret = String(process?.env?.STRIPE_WEBHOOK_SECRET || '');

  if (!webhookSecret) {
    throw new ApiError(503, 'stripe_not_configured');
  }

  const signatureParts = String(signatureHeader || '').split(',');
  const timestampPart = signatureParts?.find((part) => part?.startsWith('t='));
  const signatures = signatureParts
    ?.filter((part) => part?.startsWith('v1='))
    ?.map((part) => part?.slice(3))
    ?.filter(Boolean);
  const timestamp = Number(timestampPart?.slice(2) || 0);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!timestamp || Math.abs(nowSeconds - timestamp) > 300 || !signatures?.length) {
    throw new ApiError(400, 'invalid_webhook_signature');
  }

  const signedPayload = `${timestamp}.${rawBody?.toString?.('utf8') || ''}`;
  const expected = createHmac('sha256', webhookSecret)?.update(signedPayload)?.digest?.('hex') || '';
  const expectedBuffer = Buffer.from(expected, 'hex');
  const valid = signatures?.some((signature) => {
    const receivedBuffer = Buffer.from(signature, 'hex');
    return receivedBuffer?.length === expectedBuffer?.length && timingSafeEqual(receivedBuffer, expectedBuffer);
  });

  if (!valid) {
    throw new ApiError(400, 'invalid_webhook_signature');
  }
}
