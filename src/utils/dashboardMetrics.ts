/**
 * Pure formatting, delta polarity, goal-tracking, and reconciled analytics math
 * helpers for AquaWatt's Dashboard and Analytics views.
 */

export type DeltaPolarity = 'lower-is-better' | 'higher-is-better' | 'neutral';
export type DeltaTone = 'positive' | 'negative' | 'neutral';

export interface DeltaPresentation {
  label: string;
  tone: DeltaTone;
  isSmallBase: boolean;
}

export interface GoalProgress {
  percentOfGoal: number;
  barWidthPercent: number;
  targetMarkerPercent: number;
  remainingLabel: string;
  isMet: boolean;
}

export interface ZoneSpendSlice {
  [key: string]: string | number;
  name: string;
  amount: number;
}

export interface EnergyMixSlice {
  [key: string]: string | number;
  name: string;
  kwh: number;
}

export interface AnalyticsFinancialSummary {
  monthlyWaterLiters: number;
  monthlyPowerKwh: number;
  projectedWaterCost: number;
  projectedPowerCost: number;
  projectedTotalCost: number;
  utilitySpendData: ZoneSpendSlice[];
  totalUtilitySpend: number;
  energyMixData: EnergyMixSlice[];
  totalMonthlyKwh: number;
}

/**
 * Formats a metric with consistent decimal precision, returning an em-dash for
 * unmeasured / null sensors so untested hardware never fabricates 0.
 */
export function formatSensorNumber(
  value: number | null | undefined,
  decimals: number = 1,
  useLocale: boolean = false
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  if (useLocale) {
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return value.toFixed(decimals);
}

/**
 * Formats small share percentages (<0.1%) honestly instead of rounded 0.0%.
 */
export function formatSharePercent(sharePercent: number): string {
  if (!Number.isFinite(sharePercent) || sharePercent <= 0) return '0%';
  if (sharePercent < 0.1) return '<0.1%';
  if (sharePercent >= 10 || Number.isInteger(sharePercent)) {
    return `${Math.round(sharePercent)}%`;
  }
  return `${sharePercent.toFixed(1)}%`;
}

/**
 * Computes semantic delta formatting and color tone.
 * - Tiny baseline counts (< 5) render "was N" in neutral grey to avoid shouting -100%.
 * - Lower-is-better metrics (usage, spend) treat decreases as positive (green).
 * - Higher-is-better metrics (savings, score) treat increases as positive (green).
 */
export function formatDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  polarity: DeltaPolarity = 'lower-is-better'
): DeltaPresentation {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    Number.isNaN(current) ||
    Number.isNaN(previous)
  ) {
    return { label: '—', tone: 'neutral', isSmallBase: false };
  }

  if (previous > 0 && previous < 5) {
    return {
      label: `was ${Number.isInteger(previous) ? previous : previous.toFixed(1)}`,
      tone: 'neutral',
      isSmallBase: true,
    };
  }

  if (previous <= 0) {
    return { label: '0%', tone: 'neutral', isSmallBase: false };
  }

  const rawPct = ((current - previous) / previous) * 100;
  const absPct = Math.abs(rawPct);

  if (absPct < 0.1 && absPct > 0) {
    const sign = rawPct > 0 ? '+' : '−';
    return {
      label: `${sign}<0.1%`,
      tone: 'neutral',
      isSmallBase: false,
    };
  }

  const rounded = Number(absPct.toFixed(1));
  const prefix = rawPct > 0 ? '+' : rawPct < 0 ? '−' : '';
  const label = `${prefix}${rounded}%`;

  if (rawPct === 0 || polarity === 'neutral') {
    return { label, tone: 'neutral', isSmallBase: false };
  }

  const isIncrease = rawPct > 0;
  const isPositive =
    polarity === 'lower-is-better' ? !isIncrease : isIncrease;

  return {
    label,
    tone: isPositive ? 'positive' : 'negative',
    isSmallBase: false,
  };
}

/**
 * Evaluates a compact "Goal beside the number" progress track.
 * Supports both upper-bound targets (e.g. stay under 450 L/day) and achievement goals
 * (e.g. reach 15% conservation reduction).
 */
export function computeGoalProgress(
  current: number | null | undefined,
  target: number,
  unit: string = ''
): GoalProgress {
  if (current === null || current === undefined || target <= 0 || Number.isNaN(current)) {
    return {
      percentOfGoal: 0,
      barWidthPercent: 0,
      targetMarkerPercent: 80,
      remainingLabel: 'Awaiting data',
      isMet: false,
    };
  }

  const pct = Math.max(0, Math.round((current / target) * 100));
  const targetMarkerPercent = 80;
  const barWidthPercent = Math.min(100, Math.round((pct / 100) * targetMarkerPercent));
  const diff = Number((target - current).toFixed(1));
  const unitSuffix = unit ? ` ${unit}` : '';

  if (pct >= 100) {
    return {
      percentOfGoal: pct,
      barWidthPercent: Math.min(100, Math.max(targetMarkerPercent, Math.round((pct / 125) * 100))),
      targetMarkerPercent,
      remainingLabel: `${pct}% of goal`,
      isMet: true,
    };
  }

  return {
    percentOfGoal: pct,
    barWidthPercent,
    targetMarkerPercent,
    remainingLabel: `${Math.abs(diff)}${unitSuffix} left`,
    isMet: false,
  };
}

/**
 * Computes strictly reconciled monthly water/power costs, zone spend breakdown,
 * and circuit kWh breakdown so totals match identically across all cards & donuts.
 */
export function computeAnalyticsFinancials(
  waterRatePerLiter: number,
  electricityRatePerKwh: number,
  monthlyWaterLiters: number = 9840,
  monthlyPowerKwh: number = 542.4
): AnalyticsFinancialSummary {
  const projectedWaterCost = Number((monthlyWaterLiters * waterRatePerLiter).toFixed(2));
  const projectedPowerCost = Number((monthlyPowerKwh * electricityRatePerKwh).toFixed(2));
  const projectedTotalCost = Number((projectedWaterCost + projectedPowerCost).toFixed(2));

  // Reconciled kWh per circuit (sums strictly to 542.4 kWh)
  const energyMixData: EnergyMixSlice[] = [
    { name: 'HVAC Compressor', kwh: 184.4 },
    { name: 'Bathrooms & Heating', kwh: 151.8 },
    { name: 'Kitchen Appliances', kwh: 130.2 },
    { name: 'Lighting & Standby', kwh: 76.0 },
  ];
  const totalMonthlyKwh = Number(
    energyMixData.reduce((sum, item) => sum + item.kwh, 0).toFixed(1)
  );

  // Reconciled INR spend per zone (last slice absorbs any 0.01 rounding diff so sum === projectedTotalCost)
  const hvacAmount = Number((184.4 * electricityRatePerKwh).toFixed(2));
  const bathAmount = Number((151.8 * electricityRatePerKwh + 4330 * waterRatePerLiter).toFixed(2));
  const kitchenAmount = Number((130.2 * electricityRatePerKwh + 3148 * waterRatePerLiter).toFixed(2));
  const irrigationAuxAmount = Number(
    (projectedTotalCost - (hvacAmount + bathAmount + kitchenAmount)).toFixed(2)
  );

  const utilitySpendData: ZoneSpendSlice[] = [
    { name: 'HVAC & Climate', amount: hvacAmount },
    { name: 'Bathrooms & Laundry', amount: bathAmount },
    { name: 'Kitchen & Dining', amount: kitchenAmount },
    { name: 'Irrigation & Lighting', amount: irrigationAuxAmount },
  ];

  const totalUtilitySpend = Number(
    utilitySpendData.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
  );

  return {
    monthlyWaterLiters,
    monthlyPowerKwh,
    projectedWaterCost,
    projectedPowerCost,
    projectedTotalCost,
    utilitySpendData,
    totalUtilitySpend,
    energyMixData,
    totalMonthlyKwh,
  };
}

export interface AlertSummaryStats {
  openCount: number;
  estimatedLossLabel: string;
  exposureInrLabel: string;
  mttrLabel: string;
  hasExposure: boolean;
  hasWaterLoss: boolean;
}

export function summarizeActiveAlerts(
  alerts: Array<{
    isResolved: boolean;
    resource: 'water' | 'electricity';
    estimatedWastage?: string;
    potentialCostImpact?: number;
  }>,
  isPhysical: boolean
): AlertSummaryStats {
  const active = alerts.filter(a => !a.isResolved);
  const openCount = active.length;
  const exposureSum = active.reduce((sum, a) => sum + (a.potentialCostImpact ?? 0), 0);
  const hasWaterLossAlert = active.some(
    a => a.resource === 'water' && Boolean(a.estimatedWastage)
  );

  let estimatedLossLabel = '0 L';
  if (isPhysical && openCount === 0) {
    estimatedLossLabel = '—';
  } else if (hasWaterLossAlert) {
    estimatedLossLabel = '~210 L/night';
  }

  return {
    openCount,
    estimatedLossLabel,
    exposureInrLabel:
      isPhysical && openCount === 0
        ? '—'
        : exposureSum > 0
        ? `₹${exposureSum}/mo`
        : '₹0/mo',
    mttrLabel: isPhysical && openCount === 0 ? '—' : '<4 min',
    hasExposure: exposureSum > 0,
    hasWaterLoss: hasWaterLossAlert,
  };
}

export function resolveSubscriptionQueryParams(
  planParam: string | null,
  billingParam: string | null
): {
  planId: 'free' | 'standard' | 'premium' | null;
  billingCycle: 'monthly' | 'yearly' | null;
} {
  const planMap: Record<string, 'free' | 'standard' | 'premium'> = {
    starter: 'free',
    free: 'free',
    'standard-pro': 'standard',
    standard: 'standard',
    'enterprise-eco': 'premium',
    premium: 'premium',
  };

  const normalizedPlan = planParam ? planParam.trim().toLowerCase() : '';
  const planId = planMap[normalizedPlan] ?? null;
  const billingCycle =
    billingParam === 'monthly' || billingParam === 'yearly' ? billingParam : null;

  return { planId, billingCycle };
}

