import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';
import { SUBSCRIPTION_PLANS } from '../data/mockData';
import {
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import FluxPay, {
  type FluxPayStat,
  type FluxPayTransfer,
} from '../components/ui/fluxpay';
import { Cta69 } from '../components/ui/cta69';
import { FAQ } from '../components/ui/faq-tabs';
import { resolveSubscriptionQueryParams } from '../utils/dashboardMetrics';
import {
  getPlanPrice,
  formatPlanPriceLabel,
  resolvePlanActionLabel,
  getPlanComparisonRows,
  SUBSCRIPTION_FAQ_CATEGORIES,
  SUBSCRIPTION_FAQ_DATA,
} from '../utils/subscriptionHelpers';

const SUBSCRIPTION_HERO_STATS: FluxPayStat[] = [
  { value: 3, label: 'telemetry plan tiers' },
  { value: 20, suffix: '%', label: 'annual billing savings' },
  { value: 365, suffix: 'd', label: 'Standard Pro retention' },
];

const SUBSCRIPTION_HERO_TRANSFERS: FluxPayTransfer[] = [
  {
    route: 'Standard Pro · 12-Mo Annual',
    from: { code: 'MO', symbol: 'M', amount: 12, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 399,
    settled: 'Saves ₹1,200 / yr',
  },
  {
    route: 'Enterprise Eco · 12-Mo Annual',
    from: { code: 'MO', symbol: 'M', amount: 12, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 1199,
    settled: 'Saves ₹3,600 / yr',
  },
  {
    route: 'Water Sub-Meter · Sample Tariff',
    from: { code: 'kL', symbol: 'L', amount: 100, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 25,
    settled: 'Municipal sample rate',
  },
  {
    route: 'Energy Sub-Meter · Sample Tariff',
    from: { code: 'kWh', symbol: 'W', amount: 540, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 7.5,
    settled: 'Grid slab sample rate',
  },
];

export const Subscription: React.FC = () => {
  const { currentPlanId, changeSubscriptionPlan, showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlanToChange, setSelectedPlanToChange] = useState<'free' | 'standard' | 'premium' | null>(null);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing');
    if (!planParam && !billingParam) return;

    const resolved = resolveSubscriptionQueryParams(planParam, billingParam);
    if (resolved.billingCycle) {
      setBillingCycle(resolved.billingCycle);
    }
    if (resolved.planId) {
      const targetPlan = resolved.planId;
      window.setTimeout(() => {
        document.getElementById('subscription-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);

      if (targetPlan === currentPlanId) {
        const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === currentPlanId);
        showToast(`${currentPlan?.name ?? 'Selected plan'} is already your active plan.`, 'info');
      } else {
        setSelectedPlanToChange(targetPlan);
      }
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, currentPlanId, setSearchParams, showToast]);

  const handleConfirmPlanChange = () => {
    if (selectedPlanToChange) {
      changeSubscriptionPlan(selectedPlanToChange);
      setSelectedPlanToChange(null);
    }
  };

  const pendingPlanObj = selectedPlanToChange
    ? SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanToChange)
    : null;
  const comparisonRows = getPlanComparisonRows();

  return (
    <AppLayout
      title="Subscription & Telemetry Plans"
      hero={
        <FluxPay
          showNavbar={false}
          badge="Transparent Utility Telemetry Plans"
          titleLines={['Predictable Plans for *Every*', '*Meter*, Built for What’s Next']}
          titleLinesPhone={['Predictable Plans', 'for *Every Meter*']}
          primaryAction={{
            label: 'Explore Plans',
            href: '#subscription-plans',
            onClick: () => {
              showToast('Scrolling to telemetry subscription tiers', 'info');
            },
          }}
          secondaryAction={{
            label: 'Compare Matrix',
            href: '#capability-matrix',
          }}
          stats={SUBSCRIPTION_HERO_STATS}
          transfers={SUBSCRIPTION_HERO_TRANSFERS}
          transferTitle="Tariff & Plan Preview"
          transferLabel="Sample AquaWatt annual subscription and INR utility sub-meter tariff previews"
          transferSteps={['Metered', 'Rated', 'Projected']}
          sendLabel="Input"
          receiveLabel="Estimate"
          locale="en-IN"
          height="clamp(580px, calc(100dvh - 64px), 780px)"
          fonts={{
            sans: "var(--font-heading, 'Plus Jakarta Sans', system-ui, sans-serif)",
            serif: "var(--font-serif, Georgia, 'Times New Roman', serif)",
            mono: "var(--font-mono, 'Geist Mono', ui-monospace, monospace)",
          }}
        />
      }
      cta={
        <Cta69
          badge={{ label: 'Enterprise & Municipal Pilots' }}
          heading="Let's build a conservation plan worth keeping."
          button={{
            label: 'Start a deployment conversation',
            href: '/contact',
          }}
          labels={{
            marqueePhrase: 'Worth keeping',
            note: 'Need multi-building metering, custom MQTT webhooks, or municipal ESG audit exports? One conversation, zero guesswork.',
            footnote: 'Onboarding commercial and campus cohorts for the Q4 telemetry cycle.',
          }}
          className="border-t border-slate-200/80 dark:border-slate-800/80"
        />
      }
    >
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div id="subscription-plans" className="text-center max-w-2xl mx-auto scroll-mt-6">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#174A8B] dark:text-sky-400">
            Hardware & SaaS Tiers
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
            Predictable Plans for Every Property
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Scalable sub-second telemetry, continuous anomaly surveillance, and simulated valve shutoff testing.
          </p>

          {/* Billing Switcher */}
          <div
            role="group"
            aria-label="Billing cycle"
            className="mt-6 inline-flex items-center gap-2 p-1 rounded-full bg-white dark:bg-[#121B2B] border border-slate-200 dark:border-slate-800 shadow-xs text-xs"
          >
            <button
              type="button"
              aria-pressed={billingCycle === 'monthly'}
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[#174A8B] text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              aria-pressed={billingCycle === 'yearly'}
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-[#174A8B] text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map(plan => {
            const isCurrent = currentPlanId === plan.id;
            const price = getPlanPrice(plan, billingCycle);

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? 'bg-white dark:bg-[#121B2B] border-2 border-[#174A8B] shadow-lg ring-2 ring-[#174A8B]/10'
                    : plan.popular
                    ? 'bg-white dark:bg-[#121B2B] border border-[#237A57]/60 shadow-md'
                    : 'bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 shadow-xs'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#174A8B] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                    Your Current Plan
                  </span>
                )}

                <div>
                  <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px]">
                    {plan.tagline}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white">
                      ₹{price}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      / month {billingCycle === 'yearly' && price > 0 && '(billed annually)'}
                    </span>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#237A57] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-xs text-center cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedPlanToChange(plan.id)}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        plan.id === 'premium'
                          ? 'bg-[#174A8B] hover:bg-[#123A6F] text-white shadow-xs'
                          : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{resolvePlanActionLabel(plan.id)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* DETAILED SPECIFICATION COMPARISON TABLE */}
        <div
          id="capability-matrix"
          className="scroll-mt-6 rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs overflow-x-auto"
        >
          <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white mb-4">
            Technical Capability Matrix
          </h3>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-400 uppercase">
                <th className="py-3 px-4">Feature / Protocol</th>
                <th className="py-3 px-4">Starter Explorer</th>
                <th className="py-3 px-4 text-[#174A8B] dark:text-sky-400 font-bold">Standard Pro</th>
                <th className="py-3 px-4">Enterprise Eco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {comparisonRows.map(row => (
                <tr key={row.feature}>
                  <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {row.feature}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{row.freeLabel}</td>
                  <td
                    className={`py-3 px-4 font-bold ${
                      row.standardAccent === 'green'
                        ? 'text-[#237A57] dark:text-emerald-400'
                        : row.standardAccent === 'muted'
                        ? 'text-slate-400 font-normal'
                        : 'text-[#174A8B] dark:text-sky-400'
                    }`}
                  >
                    {row.standardLabel}
                  </td>
                  <td
                    className={`py-3 px-4 ${
                      row.premiumAccent === 'green'
                        ? 'text-[#237A57] dark:text-emerald-400 font-bold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {row.premiumLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TABBED FAQ SECTION */}
        <FAQ
          id="subscription-faq"
          title="Frequently Asked Questions"
          subtitle="Telemetry Plans, Hardware & Governance"
          categories={SUBSCRIPTION_FAQ_CATEGORIES}
          faqData={SUBSCRIPTION_FAQ_DATA}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#121B2B] shadow-xs"
        />

        {/* MODAL: CHANGE PLAN CONFIRMATION */}
        <Modal
          isOpen={selectedPlanToChange !== null}
          onClose={() => setSelectedPlanToChange(null)}
          title="Confirm Plan Change"
          description="Your telemetry capabilities will adjust immediately for this facility."
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to switch to{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {pendingPlanObj ? formatPlanPriceLabel(pendingPlanObj, billingCycle) : ''}
              </span>
              ?
            </p>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] font-mono text-slate-500">
              Note: Demonstration environment. No actual credit card charge will be made.
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlanToChange(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPlanChange}
                className="px-4 py-2 rounded-lg bg-[#174A8B] hover:bg-[#123A6F] text-white font-semibold cursor-pointer"
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
};
