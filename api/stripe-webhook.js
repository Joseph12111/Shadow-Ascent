import { readRawBody, requirePost, safeApiMessage, sendJson } from '../server/http.js';
import {
  getSubscriptionByCustomer,
  getSubscriptionByStripeId,
  hasProcessedStripeEvent,
  recordStripeEvent,
  upsertSubscription,
} from '../server/supabase.js';
import { getPlanByPriceId, verifyStripeWebhook } from '../server/stripe.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function unixToIso(value) {
  const seconds = Number(value || 0);
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function stringId(value) {
  return typeof value === 'string' ? value : value?.id || '';
}

async function syncCheckoutSession(session) {
  const userId = session?.metadata?.user_id || session?.client_reference_id || '';
  const customerId = stringId(session?.customer);
  const subscriptionId = stringId(session?.subscription);

  if (!userId || !customerId) {
    return;
  }

  await upsertSubscription({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId || null,
    plan_id: session?.metadata?.plan_id || 'awakened',
    billing_cycle: session?.metadata?.billing_cycle || null,
    status: session?.payment_status === 'paid' ? 'active' : 'incomplete',
    updated_at: new Date().toISOString(),
  });
}

async function syncSubscription(subscription) {
  const customerId = stringId(subscription?.customer);
  const subscriptionId = String(subscription?.id || '');
  const existing = subscriptionId
    ? await getSubscriptionByStripeId(subscriptionId)
    : customerId
      ? await getSubscriptionByCustomer(customerId)
      : null;
  const userId = subscription?.metadata?.user_id || existing?.user_id || '';
  const priceId = subscription?.items?.data?.[0]?.price?.id || existing?.price_id || '';
  const selection = getPlanByPriceId(priceId);

  if (!userId || !customerId) {
    return;
  }

  await upsertSubscription({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId || existing?.stripe_subscription_id || null,
    plan_id: subscription?.metadata?.plan_id || selection?.planId || existing?.plan_id || 'awakened',
    billing_cycle: subscription?.metadata?.billing_cycle || selection?.billingCycle || existing?.billing_cycle || null,
    status: subscription?.status || 'inactive',
    price_id: priceId || null,
    current_period_end: unixToIso(subscription?.current_period_end),
    cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  });
}

async function syncInvoiceStatus(invoice, eventType) {
  const subscriptionId =
    stringId(invoice?.subscription) ||
    stringId(invoice?.parent?.subscription_details?.subscription);

  if (!subscriptionId) {
    return;
  }

  const existing = await getSubscriptionByStripeId(subscriptionId);
  if (!existing?.user_id) {
    return;
  }

  await upsertSubscription({
    ...existing,
    status: eventType === 'invoice.paid' ? 'active' : 'past_due',
    updated_at: new Date().toISOString(),
  });
}

async function processStripeEvent(event) {
  const object = event?.data?.object || {};

  if (event?.type === 'checkout.session.completed') {
    await syncCheckoutSession(object);
    return;
  }

  if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event?.type)) {
    await syncSubscription(object);
    return;
  }

  if (['invoice.paid', 'invoice.payment_failed'].includes(event?.type)) {
    await syncInvoiceStatus(object, event?.type);
  }
}

export default async function handler(request, response) {
  try {
    requirePost(request);
    const rawBody = await readRawBody(request, 1_000_000);
    verifyStripeWebhook(rawBody, request?.headers?.['stripe-signature']);
    const event = JSON.parse(rawBody?.toString?.('utf8') || '{}');

    if (!event?.id || !event?.type) {
      throw Object.assign(new Error('invalid_webhook_event'), {
        status: 400,
        code: 'invalid_webhook_event',
      });
    }

    if (await hasProcessedStripeEvent(event?.id)) {
      sendJson(response, 200, { received: true, duplicate: true });
      return;
    }

    await processStripeEvent(event);
    await recordStripeEvent(event?.id, event?.type);
    sendJson(response, 200, { received: true });
  } catch (error) {
    sendJson(response, Number(error?.status || 400), {
      message: safeApiMessage(error, 'Webhook could not be verified.'),
      code: error?.code || 'webhook_failed',
    });
  }
}
