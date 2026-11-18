import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useApp } from '../context/AppContext';
import { SUBSCRIPTION_PLANS, FAQ_ITEMS } from '../data/mockData';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowRight,
  Check,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import PulseStripeHero from '../components/ui/pulse-stripe-hero';
import { Cta69 } from '../components/ui/cta69';
import { resolveSubscriptionQueryParams } from '../utils/dashboardMetrics';

export const Subscription: React.FC = () => {
  const { currentPlanId, changeSubscriptionPlan, showToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlanToChange, setSelectedPlanToChange] = useState<'free' | 'standard' | 'premium' | null>(null);
  const [faqExpanded, setFaqExpanded] = useState<number | null>(0);

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

  const scrollToPlans = () => {
    const el = document.getElementById('subscription-plans');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const pendingPlanObj = selectedPlanToChange
    ? SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanToChange)
    : null;
  const pendingPlanPrice = pendingPlanObj
    ? billingCycle === 'yearly'
      ? pendingPlanObj.priceYearlyMonthlyEquivalent
      : pendingPlanObj.priceMonthly
    : 0;

  return (
    <AppLayout
      title="Subscription & Telemetry Plans"
      hero={
        <PulseStripeHero
          fullBleed
          palette={{ from: '#0d1e38', to: '#060c18', glow: '#38bdf8', ink: '#f8fafc' }}
          height="clamp(460px, 64svh, 580px)"
          eyebrow="Transparent Utility Telemetry Plans"
          title="Predictable plans for *every meter.*"
          description="Start free on a single ESP32 testbench node, or scale to multi-zone leak surveillance, 365-day analytics, and ESG audit exports."
          cta={{
            label: 'Explore Telemetry Plans',
            onClick: () => {
              showToast('Scrolling to telemetry subscription tiers', 'info');
              scrollToPlans();
            },
          }}
          stats={[]}
          logos={[]}
          statement=""
          statementLabel=""
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
            const price =
              billingCycle === 'yearly'
                ? plan.priceYearlyMonthlyEquivalent
                : plan.priceMonthly;

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
                      <span>
                        {plan.id === 'premium'
                          ? 'Upgrade to Enterprise'
                          : plan.id === 'free'
                          ? 'Downgrade to Starter'
                          : 'Switch to Pro'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* DETAILED SPECIFICATION COMPARISON TABLE */}
        <div className="rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs overflow-x-auto">
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
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                  Sensor Input Capacity
                </td>
                <td className="py-3 px-4 text-slate-500">2 nodes</td>
                <td className="py-3 px-4 text-[#174A8B] dark:text-sky-400 font-bold">12 nodes</td>
                <td className="py-3 px-4 text-slate-800 dark:text-slate-200">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                  Telemetry Retention
                </td>
                <td className="py-3 px-4 text-slate-500">7 Days</td>
                <td className="py-3 px-4 text-[#174A8B] dark:text-sky-400 font-bold">365 Days</td>
                <td className="py-3 px-4 text-slate-800 dark:text-slate-200">Unlimited (Cold Storage)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                  Anomaly Alert Dispatch Speed
                </td>
                <td className="py-3 px-4 text-slate-500">15 min batch</td>
                <td className="py-3 px-4 text-[#174A8B] dark:text-sky-400 font-bold">&lt; 60 seconds</td>
                <td className="py-3 px-4 text-slate-800 dark:text-slate-200">Sub-second simulated alerts</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                  Simulated Valve Isolation Test
                </td>
                <td className="py-3 px-4 text-slate-400">Manual Only</td>
                <td className="py-3 px-4 text-[#237A57] dark:text-emerald-400 font-bold">Frontend Demonstration</td>
                <td className="py-3 px-4 text-[#237A57] dark:text-emerald-400 font-bold">Multi-Zone Demo</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                  Telemetry Audit Export
                </td>
                <td className="py-3 px-4 text-slate-400">Not Included</td>
                <td className="py-3 px-4 text-[#174A8B] dark:text-sky-400 font-bold">CSV Digest</td>
                <td className="py-3 px-4 text-slate-800 dark:text-slate-200">CSV &amp; JSON Audit Export</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                  REST &amp; MQTT Bridge
                </td>
                <td className="py-3 px-4 text-slate-400">Not Included</td>
                <td className="py-3 px-4 text-slate-400">Read-Only</td>
                <td className="py-3 px-4 text-[#237A57] dark:text-emerald-400 font-bold">Planned Webhook Blueprint</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FAQ ACCORDION PREVIEW */}
        <div className="rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-xs">
          <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = faqExpanded === idx;
              const panelId = `sub-faq-answer-${idx}`;
              return (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setFaqExpanded(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left font-semibold text-slate-900 dark:text-white gap-4 cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-[#174A8B]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p id={panelId} className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
                {pendingPlanObj
                  ? `${pendingPlanObj.name} (₹${pendingPlanPrice.toLocaleString('en-IN')}/mo${
                      billingCycle === 'yearly' && pendingPlanPrice > 0 ? ' · billed annually' : ''
                    })`
                  : ''}
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
