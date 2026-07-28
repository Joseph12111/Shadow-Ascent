import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Check, Crown, ExternalLink, Gem, Shield, Sparkles, Swords, Undo2, Zap } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import { BILLING_CYCLES, SUBSCRIPTION_PLANS } from '../config/subscriptionPlans.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { callAuthenticatedApi } from '../lib/apiClient.js';

const accentClasses = {
  gold: {
    border: 'border-shadow-gold/40',
    badge: 'border-shadow-gold/40 bg-shadow-gold/15 text-shadow-gold',
    icon: 'border-shadow-gold/40 bg-shadow-gold/15 text-shadow-gold',
    ring: 'ring-shadow-gold/40',
  },
  purple: {
    border: 'border-shadow-purple/40',
    badge: 'border-shadow-purple/40 bg-shadow-purple/15 text-shadow-purpleLight',
    icon: 'border-shadow-purple/40 bg-shadow-purple/15 text-shadow-purpleLight',
    ring: 'ring-shadow-purple/40',
  },
};

function formatPrice(value) {
  const price = Number(value || 0);
  return price === 0 ? '€0' : `€${price.toFixed(2)}`;
}

function getPlanIcon(planId) {
  if (planId === 'awakened') {
    return Shield;
  }

  if (planId === 'hunter') {
    return Swords;
  }

  if (planId === 'shadow-elite') {
    return Crown;
  }

  return Zap;
}

export default function SubscriptionPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [billingCycle, setBillingCycle] = useState(BILLING_CYCLES?.monthly);
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const loading = false;
  const error = null;
  const empty = !SUBSCRIPTION_PLANS?.length;
  const annualSelected = billingCycle === BILLING_CYCLES?.annual;
  const cycleLabel = annualSelected ? 'Annual' : 'Monthly';
  const plans = useMemo(() => SUBSCRIPTION_PLANS || [], []);

  async function startCheckout(plan) {
    if (!user?.id) {
      navigate('/login', { replace: false, state: { from: '/subscription' } });
      return;
    }

    setLocalError('');
    setCheckoutLoading(plan?.id || '');
    const result = await callAuthenticatedApi('/api/create-checkout-session', {
      planId: plan?.id,
      billingCycle,
    }, { timeoutMs: 20_000 });
    setCheckoutLoading('');

    if (!result?.ok || !result?.data?.url) {
      setLocalError(result?.message || 'Secure checkout is unavailable right now.');
      return;
    }

    globalThis?.location?.assign?.(result?.data?.url);
  }

  async function openCustomerPortal() {
    if (!user?.id) {
      navigate('/login', { replace: false, state: { from: '/subscription' } });
      return;
    }

    setLocalError('');
    setPortalLoading(true);
    const result = await callAuthenticatedApi('/api/create-portal-session', {}, { timeoutMs: 20_000 });
    setPortalLoading(false);

    if (!result?.ok || !result?.data?.url) {
      setLocalError(result?.message || 'The Stripe customer portal is unavailable right now.');
      return;
    }

    toast?.success?.('Opening your secure Stripe portal.');
    globalThis?.location?.assign?.(result?.data?.url);
  }

  return (
    <div className="w-full space-y-6">
      <Card
        empty={empty}
        error={error}
        loading={loading}
        subtitle="Choose your Shadow Ascent tier and continue through secure Stripe checkout."
        title="Subscription Plans"
        icon={Gem}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-shadow-purpleLight">Stripe Connected</p>
            <h1 className="mt-3 font-heading text-3xl font-bold text-shadow-gold sm:text-4xl">Power tiers for every ascent</h1>
            <p className="mt-3 text-sm leading-6 text-shadow-textSecondary">
              Paid plans open Stripe-hosted subscription checkout. Free access stays available without payment.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-1">
            <div className="grid grid-cols-2 gap-1">
              {[BILLING_CYCLES?.monthly, BILLING_CYCLES?.annual].map((cycle) => {
                const active = billingCycle === cycle;

                return (
                  <button
                    className={`min-h-11 rounded-xl px-4 text-sm font-bold capitalize transition ${
                      active
                        ? 'bg-shadow-gold text-black'
                        : 'text-shadow-textSecondary hover:bg-white/[0.06] hover:text-shadow-text'
                    }`}
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    type="button"
                  >
                    {cycle}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-4">
        {plans?.map((plan) => (
          <PlanCard
            billingCycle={billingCycle}
            key={plan?.id}
            loading={checkoutLoading === plan?.id}
            onSubscribe={() => startCheckout(plan)}
            plan={plan}
          />
        ))}
      </section>

      {localError ? (
        <div className="rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">
          {localError}
        </div>
      ) : null}

      <Card title="Pricing Recommendation" subtitle={`${cycleLabel} pricing shown in EUR. Stripe products can map directly to these plan IDs.`} icon={BadgeCheck}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-shadow-textMuted">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4">Plan</th>
                <th className="py-3 pr-4">Theme Name</th>
                <th className="py-3 pr-4">Monthly</th>
                <th className="py-3 pr-4">Annual</th>
              </tr>
            </thead>
            <tbody>
              {plans?.map((plan) => (
                <tr className="border-b border-white/10 last:border-b-0" key={plan?.id}>
                  <td className="py-4 pr-4 font-semibold text-shadow-text">{plan?.legacyName}</td>
                  <td className="py-4 pr-4 font-heading font-bold text-shadow-gold">{plan?.name}</td>
                  <td className="py-4 pr-4 text-shadow-textSecondary">{formatPrice(plan?.monthlyPrice)}</td>
                  <td className="py-4 pr-4 text-shadow-textSecondary">{formatPrice(plan?.annualPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Manage Subscription" subtitle="Cancel, update payment method, or review billing through Stripe." icon={Undo2}>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-heading text-xl font-bold text-shadow-gold">Cancel Subscription</h2>
            <p className="mt-2 text-sm leading-6 text-shadow-textSecondary">
              Subscription cancellation is handled by Stripe so your payment details stay protected. If you cancel, access stays active until the end of the paid billing period.
            </p>
          </div>

          <Button
            className="w-full lg:w-auto"
            loading={portalLoading}
            onClick={openCustomerPortal}
            variant="secondary"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open Stripe Portal
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PlanCard({ billingCycle, loading, onSubscribe, plan }) {
  const annualSelected = billingCycle === BILLING_CYCLES?.annual;
  const price = annualSelected ? plan?.annualPrice : plan?.monthlyPrice;
  const AccentIcon = getPlanIcon(plan?.id);
  const classes = accentClasses?.[plan?.accent] || accentClasses?.purple;
  const features = annualSelected ? [...(plan?.included || []), ...(plan?.annualExtras || [])] : plan?.included || [];
  const paidPlan = Number(price || 0) > 0;

  return (
    <article
      className={`glass-card relative flex min-h-full flex-col overflow-hidden border ${
        plan?.featured ? `${classes?.border} ring-2 ${classes?.ring}` : 'border-white/10'
      }`}
    >
      {plan?.featured ? (
        <div className="absolute right-4 top-4 rounded-full border border-shadow-gold/40 bg-shadow-gold px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-black">
          {plan?.badge}
        </div>
      ) : null}

      <div className="p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${classes?.icon}`}>
          <AccentIcon className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-shadow-textMuted">{plan?.legacyName}</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-shadow-gold">{plan?.name}</h2>
          {!plan?.featured ? (
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${classes?.badge}`}>
              {plan?.badge}
            </span>
          ) : null}
        </div>

        <div className="mt-6">
          <p className="flex items-end gap-2">
            <span className="font-heading text-4xl font-bold text-shadow-text">{formatPrice(price)}</span>
            <span className="pb-1 text-sm text-shadow-textMuted">/{annualSelected ? 'year' : 'month'}</span>
          </p>
          {annualSelected && Number(plan?.monthlyPrice || 0) > 0 ? (
            <p className="mt-2 text-sm font-semibold text-shadow-green">Includes 2 months free.</p>
          ) : null}
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="flex flex-1 flex-col p-5">
        <ul className="space-y-3">
          {features?.map((feature) => {
            const comingSoon = feature === '(coming soon)';

            return (
              <li
                className={`flex gap-3 text-sm leading-6 ${comingSoon ? 'font-bold uppercase tracking-[0.14em] text-shadow-gold' : 'text-shadow-textSecondary'}`}
                key={feature}
              >
                {comingSoon ? <span className="mt-2 h-px w-4 shrink-0 bg-shadow-gold/50" aria-hidden="true" /> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-shadow-green" aria-hidden="true" />}
                <span>{feature}</span>
              </li>
            );
          })}
        </ul>

        <Button className="mt-6 w-full" disabled={!paidPlan} loading={loading} onClick={paidPlan ? onSubscribe : undefined} variant={plan?.featured ? 'primary' : 'secondary'}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {paidPlan ? 'Subscribe with Stripe' : 'Free Plan Active'}
        </Button>
      </div>
    </article>
  );
}
