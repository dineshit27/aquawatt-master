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

export type SubscriptionFaqCategoryKey = 'plans' | 'hardware' | 'security';

export interface SubscriptionFaqEntry {
  question: string;
  answer: string;
}

export const SUBSCRIPTION_FAQ_CATEGORIES: Record<SubscriptionFaqCategoryKey, string> = {
  plans: 'Plans & Billing',
  hardware: 'Hardware & Sensors',
  security: 'Data & Security',
};

export const SUBSCRIPTION_FAQ_DATA: Record<
  SubscriptionFaqCategoryKey,
  SubscriptionFaqEntry[]
> = {
  plans: [
    {
      question: 'What is included across Starter Explorer, Standard Pro, and Enterprise Eco?',
      answer:
        'Starter Explorer supports up to 2 sensor nodes with 7-day history for single-bench evaluation. Standard Pro scales to 12 ESP32 nodes, 365-day retention, and CSV digests, while Enterprise Eco adds unlimited node capacity, multi-site hierarchy, and JSON audit exports.',
    },
    {
      question: 'Does switching plans here charge a real payment method?',
      answer:
        'No. Plan switching in this console operates in demonstration mode so facility teams can preview tier limits and INR ₹ tariff views without processing live credit card or UPI payments.',
    },
    {
      question: 'How does the Monthly vs. Yearly billing toggle work?',
      answer:
        'Selecting Yearly Billing displays the 20% annual discount equivalent (₹399/mo for Standard Pro and ₹1,199/mo for Enterprise Eco, billed annually), while Monthly Billing shows standard month-to-month rates.',
    },
  ],
  hardware: [
    {
      question: 'What hardware architecture does AquaWatt support?',
      answer:
        'AquaWatt targets ESP32 microcontrollers paired with an operational FS-S401 Hall-effect pulse water flow sensor (GPIO34) and a local 16×2 character LCD display. An INA219 DC power module is modeled in the hardware design with physical calibration pending.',
    },
    {
      question: 'Are the valve shutoff controls on the dashboard physically connected?',
      answer:
        'No. Valve trips, relay toggles, and load-shift controls in the web console are interactive software simulations that demonstrate automated isolation logic without actuating physical valves.',
    },
    {
      question: 'How are bench readings transferred from the ESP32?',
      answer:
        'Bench instrumentation outputs flow diagnostics over Serial at 115200 baud and on the local 16×2 LCD. Wi-Fi MQTT-to-Supabase ingestion schemas and services are implemented while end-to-end live hardware pipeline verification remains pending.',
    },
  ],
  security: [
    {
      question: 'How are simulated demo baselines separated from physical Supabase data?',
      answer:
        'Demo Mode runs synthetic residential and lab consumption profiles locally, whereas Physical Mode queries authenticated Supabase PostgreSQL tables via Row Level Security and preserves null values for uncalibrated INA219 channels.',
    },
    {
      question: 'How is multi-user facility data isolated?',
      answer:
        'All authenticated API routes, MCP tools, and Supabase queries verify the caller’s Supabase JWT and enforce user ownership via PostgreSQL Row Level Security (RLS), preventing cross-tenant access.',
    },
    {
      question: 'Can I export consumption and ledger records for audits?',
      answer:
        'Yes. Export actions generate structured .CSV and .JSON files containing timestamped flow readings, INR ₹ cost calculations, and event ledger entries.',
    },
  ],
};

