import { assertTrustedOrigin, readJsonBody, requirePost, safeApiMessage, sendJson } from '../server/http.js';
import { getSubscriptionForUser, requireUser, upsertSubscription } from '../server/supabase.js';
import { getAppUrl, getPriceSelection, stripeRequest } from '../server/stripe.js';

export default async function handler(request, response) {
  try {
    requirePost(request);
    assertTrustedOrigin(request);
    const { user } = await requireUser(request);
    const body = await readJsonBody(request, 8_000);
    const selection = getPriceSelection(String(body?.planId || ''), String(body?.billingCycle || ''));
    const existingSubscription = await getSubscriptionForUser(user?.id);
    let customerId = existingSubscription?.stripe_customer_id || '';

    if (!customerId) {
      const customer = await stripeRequest('/customers', {
        form: {
          email: user?.email || '',
          'metadata[user_id]': user?.id,
        },
        idempotencyKey: `shadow-ascent-customer-${user?.id}`,
      });
      customerId = customer?.id || '';

      if (!customerId) {
        throw Object.assign(new Error('stripe_customer_failed'), {
          status: 502,
          code: 'stripe_request_failed',
        });
      }

      await upsertSubscription({
        user_id: user?.id,
        stripe_customer_id: customerId,
        plan_id: existingSubscription?.plan_id || 'awakened',
        status: existingSubscription?.status || 'inactive',
        updated_at: new Date().toISOString(),
      });
    }

    const appUrl = getAppUrl();
    const requestId = String(request?.headers?.['x-request-id'] || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    const session = await stripeRequest('/checkout/sessions', {
      form: {
        mode: 'subscription',
        customer: customerId,
        'line_items[0][price]': selection?.priceId,
        'line_items[0][quantity]': 1,
        success_url: `${appUrl}/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/subscription?checkout=cancelled`,
        client_reference_id: user?.id,
        allow_promotion_codes: true,
        'metadata[user_id]': user?.id,
        'metadata[plan_id]': selection?.planId,
        'metadata[billing_cycle]': selection?.billingCycle,
        'subscription_data[metadata][user_id]': user?.id,
        'subscription_data[metadata][plan_id]': selection?.planId,
        'subscription_data[metadata][billing_cycle]': selection?.billingCycle,
      },
      idempotencyKey: requestId ? `shadow-ascent-checkout-${requestId}` : undefined,
    });

    if (!session?.url) {
      throw Object.assign(new Error('stripe_session_failed'), {
        status: 502,
        code: 'stripe_request_failed',
      });
    }

    sendJson(response, 200, { url: session?.url });
  } catch (error) {
    sendJson(response, Number(error?.status || 500), {
      message: safeApiMessage(error, 'Secure checkout is unavailable right now.'),
      code: error?.code || 'checkout_failed',
    });
  }
}
