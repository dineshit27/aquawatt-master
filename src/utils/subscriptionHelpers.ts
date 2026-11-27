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

export function getPlanPrice(plan: SubscriptionPlan, _billingCycle: BillingCycle = 'monthly'): number {
  return plan.priceMonthly;
}

export function formatPlanPriceValue(plan: SubscriptionPlan): string {
  const prefix = plan.pricePrefix ?? '';
  return `${prefix}₹${plan.priceMonthly.toLocaleString('en-IN')}`;
}

export function formatPlanPriceLabel(
  plan: SubscriptionPlan,
  _billingCycle: BillingCycle = 'monthly'
): string {
  return `${plan.name} (${formatPlanPriceValue(plan)}/month)`;
}

export function resolvePlanActionLabel(planId: PlanId): string {
  switch (planId) {
    case 'premium':
      return 'Contact Sales';
    case 'free':
      return 'Get Started';
    case 'standard':
    default:
      return 'Upgrade to Plus';
  }
}

export function getPlanComparisonRows(): PlanComparisonRow[] {
  return [
    {
      feature: 'Device Scope',
      freeLabel: '1 monitoring device',
      standardLabel: 'Single facility telemetry',
      premiumLabel: 'Multi-device (deployment-scoped)',
      standardAccent: 'blue',
    },
    {
      feature: 'Water Usage Analytics',
      freeLabel: 'Basic usage & totals',
      standardLabel: 'Extended trends & comparisons',
      premiumLabel: 'Facility & cross-device analytics',
      standardAccent: 'blue',
    },
    {
      feature: 'Possible-Leak & Alert Insights',
      freeLabel: 'Basic alert visibility',
      standardLabel: 'Explainable FS-S401 insights & history',
      premiumLabel: 'Facility alert review',
      standardAccent: 'green',
      premiumAccent: 'green',
    },
    {
      feature: 'AI & Sustainability Reporting',
      freeLabel: 'Dashboard overview',
      standardLabel: 'AI tips & monthly reports',
      premiumLabel: 'Facility insights & reporting',
      standardAccent: 'blue',
    },
    {
      feature: 'Data Export',
      freeLabel: 'Not included',
      standardLabel: 'CSV data export',
      premiumLabel: 'CSV & JSON data export',
      standardAccent: 'blue',
    },
    {
      feature: 'Integrations & Onboarding',
      freeLabel: 'Web console only',
      standardLabel: 'Standard setup',
      premiumLabel: 'Read-only MCP / API & custom onboarding',
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
      question: 'What is included across Starter Explorer, AquaWatt Plus, and AquaWatt Business?',
      answer:
        'Starter Explorer (₹0/month) covers 1 monitoring device with basic water usage monitoring, device health status, basic alerts, and basic usage history. AquaWatt Plus (₹149/month) adds extended water analytics, trend comparisons, explainable FS-S401 possible-leak insights, AI conservation recommendations, monthly sustainability reports, and CSV export. AquaWatt Business (starting at ₹499/month) adds multi-device monitoring, facility overview dashboards, integration access, and custom onboarding.',
    },
    {
      question: 'Are paid subscriptions available for live online checkout yet?',
      answer:
        'Not yet. Payment processing and automated billing are not active in this release. Selecting a paid tier only previews UI state without charging any payment method or activating a paid subscription; use Contact Sales for AquaWatt Business deployment inquiries.',
    },
    {
      question: 'How is AquaWatt Business priced?',
      answer:
        'AquaWatt Business starts at ₹499/month and is scoped to your facility device count, analytics configuration, and onboarding needs via the Contact Sales inquiry flow.',
    },
  ],
  hardware: [
    {
      question: 'What hardware is verified in the current AquaWatt setup?',
      answer:
        'AquaWatt runs on an ESP32 DevKit with an operational FS-S401 water flow sensor (verified actual flow readings on GPIO34) and a 16×2 LCD display. An INA219 electricity sensor is installed on the hardware rig, but calibration is still pending and it does not yet produce validated electrical readings.',
    },
    {
      question: 'Are automated valves, pressure sensors, or temperature sensors active?',
      answer:
        'No. Motorized shutoff valves, line pressure sensors, and water temperature sensors are not physically connected. Any valve toggle controls in the web console operate purely as frontend demonstrations.',
    },
    {
      question: 'Does AquaWatt monitor household AC electricity right now?',
      answer:
        'No. Validated household AC electricity monitoring and electrical anomaly detection are not active in this hardware revision because the INA219 DC module is still uncalibrated.',
    },
  ],
  security: [
    {
      question: 'How are demo profiles separated from physical Supabase telemetry?',
      answer:
        'Demo Mode displays synthetic sample profiles locally, while Physical Mode queries authenticated Supabase PostgreSQL tables via Row Level Security and keeps uncalibrated INA219 channels as null instead of fabricating readings.',
    },
    {
      question: 'How is multi-user data protected?',
      answer:
        'Authenticated routes, API endpoints, and MCP tools verify the caller’s Supabase JWT and enforce per-user ownership via PostgreSQL Row Level Security (RLS).',
    },
    {
      question: 'What data formats can I export today?',
      answer:
        'The Dashboard and Analytics views support browser-generated CSV and JSON downloads for the currently loaded telemetry window and tariff estimates.',
    },
  ],
};
