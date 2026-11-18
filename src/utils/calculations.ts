/**
 * Calculation utilities and logic functions for AquaWatt
 * Prepared for INR (₹) resource pricing and ESP32 telemetry units.
 */

export const LITERS_PER_GALLON = 3.78541;
export const GALLONS_PER_LITER = 1 / LITERS_PER_GALLON;

// Carbon emission factors
export const KG_CO2_PER_KWH = 0.385; // Average grid emissions in kg CO2 per kWh
export const KG_CO2_PER_LITER_WATER = 0.00032; // Embedded energy in water supply/treatment

// Default Indian utility tariff benchmarks (Configurable in UI)
export const DEFAULT_INR_WATER_RATE = 0.025; // ₹0.025 per Liter (₹25 per 1,000 Liters / kiloliter)
export const DEFAULT_INR_ELECTRICITY_RATE = 7.50; // ₹7.50 per kWh (domestic/commercial slab)

export interface TariffConfig {
  currencySymbol: string;
  currencyCode: string;
  waterRatePerLiter: number;
  electricityRatePerKwh: number;
  baseWaterFee: number;
  baseElectricityFee: number;
}

export const DEFAULT_TARIFF: TariffConfig = {
  currencySymbol: '₹',
  currencyCode: 'INR',
  waterRatePerLiter: DEFAULT_INR_WATER_RATE,
  electricityRatePerKwh: DEFAULT_INR_ELECTRICITY_RATE,
  baseWaterFee: 50,
  baseElectricityFee: 100,
};

/**
 * Convert liters to US gallons
 */
export function litersToGallons(liters: number): number {
  return Number((liters * GALLONS_PER_LITER).toFixed(1));
}

/**
 * Convert US gallons to liters
 */
export function gallonsToLiters(gallons: number): number {
  return Number((gallons * LITERS_PER_GALLON).toFixed(1));
}

/**
 * Format large numerical values nicely with standard precision
 */
export function formatMetric(val: number, precision: number = 1): string {
  if (Math.abs(val) >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(precision)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${(val / 1_000).toFixed(precision)}k`;
  }
  return val.toFixed(precision);
}

/**
 * Format monetary values in INR (₹) or given currency symbol
 */
export function formatCurrency(amount: number, symbol: string = '₹', precision: number = 2): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
}

/**
 * Calculate estimated cost based on consumption and rate
 */
export function calculateResourceCost(
  amount: number,
  unitRate: number,
  baseServiceFee: number = 0
): number {
  if (amount < 0 || unitRate < 0) return 0;
  return Number((amount * unitRate + baseServiceFee).toFixed(2));
}

/**
 * Calculate carbon emissions avoided in kg CO2
 */
export function calculateCarbonAvoided(
  waterSavedLiters: number,
  electricitySavedKwh: number
): number {
  const waterCarbon = Math.max(0, waterSavedLiters) * KG_CO2_PER_LITER_WATER;
  const powerCarbon = Math.max(0, electricitySavedKwh) * KG_CO2_PER_KWH;
  return Number((waterCarbon + powerCarbon).toFixed(1));
}

/**
 * Calculate percentage change safely handling division by zero
 */
export function calculatePercentageChange(current: number, baseline: number): {
  percent: number;
  isIncrease: boolean;
  label: string;
} {
  if (baseline <= 0) {
    return {
      percent: 0,
      isIncrease: current > 0,
      label: current > 0 ? '+100%' : '0%',
    };
  }

  const change = ((current - baseline) / baseline) * 100;
  const rounded = Number(Math.abs(change).toFixed(1));
  const isIncrease = change > 0;
  const label = `${isIncrease ? '+' : '-'}${rounded}%`;

  return {
    percent: rounded,
    isIncrease,
    label,
  };
}

/**
 * Detect abnormal flow or power surge based on baseline threshold
 */
export function detectAnomaly(
  currentValue: number,
  expectedBaseline: number,
  sensitivityMultiplier: number = 1.35
): {
  isAnomaly: boolean;
  severity: 'normal' | 'warning' | 'critical';
  deviationRatio: number;
} {
  if (expectedBaseline <= 0) {
    return { isAnomaly: false, severity: 'normal', deviationRatio: 1 };
  }

  const ratio = currentValue / expectedBaseline;

  if (ratio >= sensitivityMultiplier * 1.5) {
    return {
      isAnomaly: true,
      severity: 'critical',
      deviationRatio: Number(ratio.toFixed(2)),
    };
  }

  if (ratio >= sensitivityMultiplier) {
    return {
      isAnomaly: true,
      severity: 'warning',
      deviationRatio: Number(ratio.toFixed(2)),
    };
  }

  return {
    isAnomaly: false,
    severity: 'normal',
    deviationRatio: Number(ratio.toFixed(2)),
  };
}

/**
 * Evaluate sustainability index score (0 to 100)
 */
export function evaluateSustainabilityScore(
  waterSavingPct: number,
  energySavingPct: number,
  unresolvedAlertsCount: number,
  completedChallengesCount: number
): number {
  let score = 50; // base score

  // water saving impact (up to +20)
  score += Math.min(20, Math.max(-15, waterSavingPct * 1.2));

  // energy saving impact (up to +20)
  score += Math.min(20, Math.max(-15, energySavingPct * 1.2));

  // penalty for unresolved leak/power warnings (-5 per unresolved alert, down to -20)
  score -= Math.min(20, unresolvedAlertsCount * 5);

  // bonus for active challenges completed (+4 each, up to +15)
  score += Math.min(15, completedChallengesCount * 4);

  // clamp between 10 and 100
  return Math.max(10, Math.min(100, Math.round(score)));
}
