import type { SubscriptionPlan } from '../types';

export type PlanId = SubscriptionPlan['id'];
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanComparisonRow {
  feature: string;
  freeLabel: string;
  standardLabel: string;
  premiumLabel: string;
  standardAccent?: 'blue' | 'green' | 'muted';
  premiumAccent?: 'blue' | 'green' | 'muted';
}

export function getPlanPrice(plan: SubscriptionPlan, billingCycle: BillingCycle): number {
  return billingCycle === 'yearly' ? plan.priceYearlyMonthlyEquivalent : plan.priceMonthly;
}

export function formatPlanPriceLabel(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle
): string {
  const price = getPlanPrice(plan, billingCycle);
  const suffix = billingCycle === 'yearly' && price > 0 ? ' · billed annually' : '';
  return `${plan.name} (₹${price.toLocaleString('en-IN')}/mo${suffix})`;
}

export function resolvePlanActionLabel(planId: PlanId): string {
  switch (planId) {
    case 'premium':
      return 'Upgrade to Enterprise';
    case 'free':
      return 'Downgrade to Starter';
    case 'standard':
    default:
      return 'Switch to Pro';
  }
}

export function getPlanComparisonRows(): PlanComparisonRow[] {
  return [
    {
      feature: 'Sensor Input Capacity',
      freeLabel: '2 nodes',
      standardLabel: '12 nodes',
      premiumLabel: 'Unlimited',
      standardAccent: 'blue',
    },
    {
      feature: 'Telemetry Retention',
      freeLabel: '7 Days',
      standardLabel: '365 Days',
      premiumLabel: 'Unlimited (Cold Storage)',
      standardAccent: 'blue',
    },
    {
      feature: 'Anomaly Alert Dispatch Speed',
      freeLabel: '15 min batch',
      standardLabel: 'Simulated sub-second',
      premiumLabel: 'Simulated stream',
      standardAccent: 'blue',
    },
    {
      feature: 'Simulated Valve Isolation Test',
      freeLabel: 'Manual Only',
      standardLabel: 'Frontend Demonstration',
      premiumLabel: 'Multi-Zone Demo',
      standardAccent: 'green',
      premiumAccent: 'green',
    },
    {
      feature: 'Telemetry Audit Export',
      freeLabel: 'Not Included',
      standardLabel: 'CSV Digest',
      premiumLabel: 'CSV & JSON Audit Export',
      standardAccent: 'blue',
    },
    {
      feature: 'REST & MQTT Bridge',
      freeLabel: 'Not Included',
      standardLabel: 'Read-Only Blueprint',
      premiumLabel: 'Planned Webhook Blueprint',
      standardAccent: 'muted',
      premiumAccent: 'green',
    },
  ];
}
