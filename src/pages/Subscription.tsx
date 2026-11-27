import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Seo } from '../components/common/Seo';
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
  { value: 0, prefix: '₹', label: 'Starter Explorer / month' },
  { value: 149, prefix: '₹', label: 'AquaWatt Plus / month' },
  { value: 499, prefix: '₹', suffix: '+', label: 'AquaWatt Business / month' },
];

const SUBSCRIPTION_HERO_TRANSFERS: FluxPayTransfer[] = [
  {
    route: 'Starter Explorer · 1 Device',
    from: { code: 'MO', symbol: 'M', amount: 1, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 0,
    settled: 'Free single-device telemetry',
  },
  {
    route: 'AquaWatt Plus · Analytics',
    from: { code: 'MO', symbol: 'M', amount: 1, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 149,
    settled: 'AI tips & FS-S401 insights',
  },
  {
    route: 'AquaWatt Business · Facility',
    from: { code: 'MO', symbol: 'M', amount: 1, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 499,
    settled: 'Starting at ₹499 / mo',
  },
  {
    route: 'Water Sub-Meter · Sample Tariff',
    from: { code: 'kL', symbol: 'L', amount: 100, decimals: 0 },
    to: { code: 'INR', symbol: '₹', decimals: 0 },
    rate: 25,
    settled: 'Municipal sample rate',
  },
];

export const Subscription: React.FC = () => {
  const { currentPlanId, changeSubscriptionPlan, showToast } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlanToChange, setSelectedPlanToChange] = useState<'free' | 'standard' | 'premium' | null>(null);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing');
    if (!planParam && !billingParam) return;

    const resolved = resolveSubscriptionQueryParams(planParam, billingParam);
    if (resolved.planId) {
      const targetPlan = resolved.planId;
      window.setTimeout(() => {
        document.getElementById('subscription-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);

      if (targetPlan === 'premium') {
        showToast('AquaWatt Business starts at ₹499/month. Use Contact Sales for deployment inquiries.', 'info');
      } else if (targetPlan === currentPlanId) {
        const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === currentPlanId);
        showToast(`${currentPlan?.name ?? 'Selected plan'} is currently selected in preview.`, 'info');
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

  const handlePlanButtonClick = (planId: 'free' | 'standard' | 'premium') => {
    if (planId === 'premium') {
      navigate('/contact?plan=business');
      return;
    }
    setSelectedPlanToChange(planId);
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
          transferLabel="Sample AquaWatt monthly plan tiers and INR water sub-meter tariff previews"
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
          badge={{ label: 'Business & Facility Deployments' }}
          heading="Let's build a conservation plan worth keeping."
          button={{
            label: 'Start a deployment conversation',
            href: '/contact?plan=business',
          }}
          labels={{
            marqueePhrase: 'Worth keeping',
            note: 'Need multi-device water monitoring, facility analytics, or read-only API integration? One conversation, zero guesswork.',
            footnote: 'Scoping custom AquaWatt Business deployments via direct onboarding.',
          }}
          className="border-t border-slate-200/80 dark:border-slate-800/80"
        />
      }
    >
      <Seo title="Subscription Plans — AquaWatt" description="Explore AquaWatt Starter Explorer, AquaWatt Plus, and AquaWatt Business telemetry plans." noindex />
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div id="subscription-plans" className="text-center max-w-2xl mx-auto scroll-mt-6">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#174A8B] dark:text-sky-400">
            Hardware &amp; SaaS Tiers
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
            Predictable Plans for Every Property
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Water telemetry, usage history, explainable FS-S401 possible-leak insights, and AI conservation guidance in transparent INR tiers.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-[#121B2B] border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            Early-access pricing preview · Online checkout is not yet active
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map(plan => {
            const isCurrent = currentPlanId === plan.id;
            const price = getPlanPrice(plan);
            const isPaidPreviewSelected = isCurrent && plan.id !== 'free';

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
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#174A8B] text-white text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                    {isPaidPreviewSelected ? 'UI Preview Selected' : 'Default Free Tier'}
                  </span>
                )}
                {!isCurrent && plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#237A57] text-white text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                    Recommended
                  </span>
                )}

                <div>
                  <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px]">
                    {plan.tagline}
                  </p>

                  <div className="mt-5 flex flex-wrap items-baseline gap-1.5">
                    {plan.pricePrefix && (
                      <span className="text-xs font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {plan.pricePrefix.trim()}
                      </span>
                    )}
                    <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white">
                      ₹{price}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      / month
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
                  {plan.id === 'premium' ? (
                    <button
                      type="button"
                      onClick={() => handlePlanButtonClick(plan.id)}
                      className="w-full py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 bg-[#174A8B] hover:bg-[#123A6F] text-white shadow-xs"
                    >
                      <span>{resolvePlanActionLabel(plan.id)}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-xs text-center cursor-default"
                    >
                      {plan.id === 'free' ? 'Current Tier (Free)' : 'Previewing Selected Tier'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePlanButtonClick(plan.id)}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        plan.popular
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
                <th className="py-3 px-4">Feature / Capability</th>
                <th className="py-3 px-4">Starter Explorer</th>
                <th className="py-3 px-4 text-[#174A8B] dark:text-sky-400 font-bold">AquaWatt Plus</th>
                <th className="py-3 px-4">AquaWatt Business</th>
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

        {/* MODAL: PLAN PREVIEW CONFIRMATION */}
        <Modal
          isOpen={selectedPlanToChange !== null}
          onClose={() => setSelectedPlanToChange(null)}
          title={selectedPlanToChange === 'standard' ? 'Preview AquaWatt Plus' : 'Switch to Starter Explorer'}
          description="UI tier preview only — live subscription checkout is not enabled."
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Switch the local interface preview to{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {pendingPlanObj ? formatPlanPriceLabel(pendingPlanObj) : ''}
              </span>
              ?
            </p>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">
              Early-access notice: Payment processing and automated billing are not active yet. No charge is made and no paid subscription is activated on your account.
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
                {selectedPlanToChange === 'standard' ? 'Preview Plus View' : 'Confirm Starter Tier'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
};
