import { assertTrustedOrigin, requirePost, safeApiMessage, sendJson } from '../server/http.js';
import { getSubscriptionForUser, requireUser } from '../server/supabase.js';
import { getAppUrl, stripeRequest } from '../server/stripe.js';

export default async function handler(request, response) {
  try {
    requirePost(request);
    assertTrustedOrigin(request);
    const { user } = await requireUser(request);
    const subscription = await getSubscriptionForUser(user?.id);

    if (!subscription?.stripe_customer_id) {
      throw Object.assign(new Error('subscription_not_found'), {
        status: 404,
        code: 'subscription_not_found',
      });
    }

    const session = await stripeRequest('/billing_portal/sessions', {
      form: {
        customer: subscription?.stripe_customer_id,
        return_url: `${getAppUrl()}/subscription`,
      },
    });

    if (!session?.url) {
      throw Object.assign(new Error('stripe_portal_failed'), {
        status: 502,
        code: 'stripe_request_failed',
      });
    }

    sendJson(response, 200, { url: session?.url });
  } catch (error) {
    sendJson(response, Number(error?.status || 500), {
      message: safeApiMessage(error, 'The Stripe customer portal is unavailable right now.'),
      code: error?.code || 'portal_failed',
    });
  }
}
