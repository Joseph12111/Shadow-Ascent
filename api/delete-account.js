import { assertTrustedOrigin, readJsonBody, requirePost, safeApiMessage, sendJson } from '../server/http.js';
import { deleteAuthUser, getSubscriptionForUser, requireUser, verifyUserPassword } from '../server/supabase.js';
import { stripeRequest } from '../server/stripe.js';

export default async function handler(request, response) {
  try {
    requirePost(request);
    assertTrustedOrigin(request);
    const { user } = await requireUser(request);
    const body = await readJsonBody(request, 8_000);
    const password = String(body?.password || '');

    if (!password || !(await verifyUserPassword(user, password))) {
      throw Object.assign(new Error('invalid_credentials'), {
        status: 401,
        code: 'invalid_credentials',
      });
    }

    const subscription = await getSubscriptionForUser(user?.id);

    if (subscription?.stripe_customer_id) {
      await stripeRequest(`/customers/${encodeURIComponent(subscription?.stripe_customer_id)}`, {
        method: 'DELETE',
      });
    }

    await deleteAuthUser(user?.id);
    sendJson(response, 200, { deleted: true });
  } catch (error) {
    sendJson(response, Number(error?.status || 500), {
      message: safeApiMessage(error, 'Account could not be deleted right now.'),
      code: error?.code || 'account_delete_failed',
    });
  }
}
