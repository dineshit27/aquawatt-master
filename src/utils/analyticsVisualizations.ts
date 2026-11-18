import type { DailyComparisonPoint, HourlyConsumptionPoint } from '../types';
import { computeAnalyticsFinancials } from './dashboardMetrics';

export interface HeatmapSlotCell {
  dayLabel: string;
  date: string;
  hourLabel: string;
  waterLiters: number;
  electricityKwh: number;
  baselineWater: number;
  baselineElectricity: number;
  isWaterAnomaly: boolean;
  isPowerAnomaly: boolean;
  waterIntensity: number; // 0..1
  powerIntensity: number; // 0..1
}

export interface DiurnalHeatmapSummary {
  days: string[];
  hours: string[];
  grid: HeatmapSlotCell[][];
  maxWaterSlot: number;
  maxPowerSlot: number;
  totalWaterLiters: number;
  totalPowerKwh: number;
  anomalyCount: number;
}

export interface WaterfallStep {
  id: string;
  label: string;
  start: number;
  end: number;
  range: [number, number];
  delta: number;
  kind: 'baseline' | 'savings' | 'projected';
  fact: string;
}

export interface TouCappedBarPoint {
  hour: string;
  waterLiters: number;
  electricityKwh: number;
  costInr: number;
  tariffTier: 'off-peak' | 'standard' | 'peak';
  isAnomaly: boolean;
  baselineWater: number;
  baselineElectricity: number;
}

export interface CircuitBulletItem {
  id: string;
  name: string;
  resource: 'water' | 'power';
  actual: number;
  target: number;
  maxScale: number;
  unit: 'L' | 'kWh';
  variancePercent: number;
  isOverTarget: boolean;
  fact: string;
}

export interface DailySpanPoint {
  date: string;
  dayName: string;
  powerMinKw: number;
  powerAvgKw: number;
  powerPeakKw: number;
  waterMinLph: number;
  waterAvgLph: number;
  waterPeakLph: number;
  isHighSwing: boolean;
}

/**
 * Builds a 7-day x 12-slot (2-hour) matrix whose row totals reconcile strictly
 * to DAILY_7D_DATA waterCurrent (sum = 2,674 L) and electricityCurrent (sum = 132.0 kWh).
 */
export function buildDiurnalHeatmap(
  dailyData: DailyComparisonPoint[],
  hourlyData: HourlyConsumptionPoint[]
): DiurnalHeatmapSummary {
  const hours = hourlyData.map(h => h.hour);
  const days = dailyData.map(d => d.dayName);

  const profileWaterSum = hourlyData.reduce((s, h) => s + h.waterLiters, 0) || 1;
  const profilePowerSum = hourlyData.reduce((s, h) => s + h.electricityKwh, 0) || 1;

  // Deterministic day-level anomalies matching the facility story (nocturnal irrigation drip & Sat/Wed HVAC spikes)
  const dayAnomalyBoost = (dayIdx: number, hour: string): { waterMult: number; powerMult: number } => {
    if ((dayIdx === 3 || dayIdx === 5 || dayIdx === 6) && (hour === '02:00' || hour === '04:00')) {
      return { waterMult: 1.55, powerMult: 1.0 };
    }
    if ((dayIdx === 2 || dayIdx === 6) && hour === '18:00') {
      return { waterMult: 1.12, powerMult: 1.32 };
    }
    return { waterMult: 1.0, powerMult: 1.0 };
  };

  let maxWaterSlot = 0;
  let maxPowerSlot = 0;
  let anomalyCount = 0;

  const rawGrid: HeatmapSlotCell[][] = dailyData.map((day, dayIdx) => {
    const weightedWater = hourlyData.map(h => {
      const { waterMult } = dayAnomalyBoost(dayIdx, h.hour);
      return h.waterLiters * waterMult;
    });
    const weightedPower = hourlyData.map(h => {
      const { powerMult } = dayAnomalyBoost(dayIdx, h.hour);
      return h.electricityKwh * powerMult;
    });
    const wSum = weightedWater.reduce((a, b) => a + b, 0) || profileWaterSum;
    const pSum = weightedPower.reduce((a, b) => a + b, 0) || profilePowerSum;

    let runningWater = 0;
    let runningPower = 0;

    return hourlyData.map((h, hIdx) => {
      const isLast = hIdx === hourlyData.length - 1;
      const waterLiters = isLast
        ? Math.max(0, Math.round(day.waterCurrent - runningWater))
        : Math.round((weightedWater[hIdx] / wSum) * day.waterCurrent);

      const electricityKwh = isLast
        ? Number(Math.max(0, day.electricityCurrent - runningPower).toFixed(2))
        : Number(((weightedPower[hIdx] / pSum) * day.electricityCurrent).toFixed(2));

      if (!isLast) {
        runningWater += waterLiters;
        runningPower += electricityKwh;
      }

      const baselineWater = Math.round((h.baselineWater / profileWaterSum) * day.waterPrevious);
      const baselineElectricity = Number(
        ((h.baselineElectricity / profilePowerSum) * day.electricityPrevious).toFixed(2)
      );

      const isWaterAnomaly =
        (h.hour === '02:00' || h.hour === '04:00') &&
        baselineWater > 0 &&
        waterLiters >= baselineWater * 1.8;

      const isPowerAnomaly =
        h.hour === '18:00' &&
        baselineElectricity > 0 &&
        electricityKwh >= baselineElectricity * 1.15;

      if (waterLiters > maxWaterSlot) maxWaterSlot = waterLiters;
      if (electricityKwh > maxPowerSlot) maxPowerSlot = electricityKwh;
      if (isWaterAnomaly || isPowerAnomaly) anomalyCount += 1;

      return {
        dayLabel: day.dayName,
        date: day.date,
        hourLabel: h.hour,
        waterLiters,
        electricityKwh,
        baselineWater,
        baselineElectricity,
        isWaterAnomaly,
        isPowerAnomaly,
        waterIntensity: 0,
        powerIntensity: 0,
      };
    });
  });

  const grid = rawGrid.map(row =>
    row.map(cell => ({
      ...cell,
      waterIntensity: maxWaterSlot > 0 ? Number((cell.waterLiters / maxWaterSlot).toFixed(3)) : 0,
      powerIntensity: maxPowerSlot > 0 ? Number((cell.electricityKwh / maxPowerSlot).toFixed(3)) : 0,
    }))
  );

  const totalWaterLiters = Number(
    grid.flat().reduce((s, c) => s + c.waterLiters, 0).toFixed(0)
  );
  const totalPowerKwh = Number(
    grid.flat().reduce((s, c) => s + c.electricityKwh, 0).toFixed(1)
  );

  return {
    days,
    hours,
    grid,
    maxWaterSlot,
    maxPowerSlot,
    totalWaterLiters,
    totalPowerKwh,
    anomalyCount,
  };
}

/**
 * Computes a Waterfall bridge from pre-optimization Baseline Bill to the exact
 * active Projected Monthly Bill (reconciled identically with computeAnalyticsFinancials).
 */
export function buildSpendWaterfallSteps(
  waterRatePerLiter: number,
  electricityRatePerKwh: number
): WaterfallStep[] {
  const financials = computeAnalyticsFinancials(waterRatePerLiter, electricityRatePerKwh);
  const projected = financials.projectedTotalCost;

  // Dynamic efficiency drivers scaled proportionally to active tariffs (sums strictly to ₹840.00 at default rates)
  const elecScale = electricityRatePerKwh / 7.5;
  const waterScale = waterRatePerLiter / 0.025;
  const hvacSaved = Number((320 * elecScale).toFixed(2));
  const irrigationSaved = Number((200 * waterScale).toFixed(2));
  const ecoCycleSaved = Number((130 * elecScale).toFixed(2));
  const standbyBaseloadSaved = Number((190 * elecScale).toFixed(2));

  const totalSavings = Number(
    (hvacSaved + irrigationSaved + ecoCycleSaved + standbyBaseloadSaved).toFixed(2)
  );
  const baselineBill = Number((projected + totalSavings).toFixed(2));

  const s1End = Number((baselineBill - hvacSaved).toFixed(2));
  const s2End = Number((s1End - irrigationSaved).toFixed(2));
  const s3End = Number((s2End - ecoCycleSaved).toFixed(2));
  const s4End = projected; // absorb any sub-paisa rounding so final bridge matches projectedTotalCost identically

  return [
    {
      id: 'baseline',
      label: 'Baseline',
      start: 0,
      end: baselineBill,
      range: [0, baselineBill],
      delta: baselineBill,
      kind: 'baseline',
      fact: 'Pre-schedule',
    },
    {
      id: 'hvac_tou',
      label: 'HVAC Shift',
      start: baselineBill,
      end: s1End,
      range: [s1End, baselineBill],
      delta: -hvacSaved,
      kind: 'savings',
      fact: '−42.7 kWh peak',
    },
    {
      id: 'irrigation',
      label: 'Sunrise Drip',
      start: s1End,
      end: s2End,
      range: [s2End, s1End],
      delta: -irrigationSaved,
      kind: 'savings',
      fact: '−8.0 kL evap cut',
    },
    {
      id: 'eco_cycles',
      label: 'Cold Eco',
      start: s2End,
      end: s3End,
      range: [s3End, s2End],
      delta: -ecoCycleSaved,
      kind: 'savings',
      fact: '−17.3 kWh heater',
    },
    {
      id: 'standby_cut',
      label: 'Standby Cut',
      start: s3End,
      end: s4End,
      range: [s4End, s3End],
      delta: Number((s4End - s3End).toFixed(2)),
      kind: 'savings',
      fact: '−25.3 kWh idle',
    },
    {
      id: 'projected',
      label: 'Projected',
      start: 0,
      end: projected,
      range: [0, projected],
      delta: projected,
      kind: 'projected',
      fact: 'Active tariff',
    },
  ];
}

/**
 * Classifies 24h intervals into Off-Peak, Standard, and Peak tariff windows plus anomaly detection.
 */
export function buildTouCappedBars(
  hourlyData: HourlyConsumptionPoint[],
  waterRatePerLiter: number,
  electricityRatePerKwh: number
): TouCappedBarPoint[] {
  return hourlyData.map(point => {
    const hourNum = Number(point.hour.split(':')[0]);
    const tariffTier: TouCappedBarPoint['tariffTier'] =
      hourNum < 6
        ? 'off-peak'
        : hourNum >= 16 && hourNum <= 20
        ? 'peak'
        : 'standard';

    const isAnomaly =
      point.baselineWater > 0 && point.waterLiters >= point.baselineWater * 2.0;

    // Apply TOU multiplier subtly (0.85x off-peak, 1.0x standard, 1.25x peak) for accurate hourly cost insight
    const touMult = tariffTier === 'off-peak' ? 0.85 : tariffTier === 'peak' ? 1.25 : 1.0;
    const costInr = Number(
      (
        point.waterLiters * waterRatePerLiter +
        point.electricityKwh * electricityRatePerKwh * touMult
      ).toFixed(2)
    );

    return {
      hour: point.hour,
      waterLiters: point.waterLiters,
      electricityKwh: point.electricityKwh,
      costInr,
      tariffTier,
      isAnomaly,
      baselineWater: point.baselineWater,
      baselineElectricity: point.baselineElectricity,
    };
  });
}

/**
 * Builds reconciled Bullet Graph metrics for Water & Power circuits.
 * Water actuals sum to 9,840 L; Power actuals sum to 542.4 kWh.
 */
export function buildCircuitBulletTargets(): CircuitBulletItem[] {
  const raw: Array<Omit<CircuitBulletItem, 'variancePercent' | 'isOverTarget' | 'fact'>> = [
    {
      id: 'b_hvac',
      name: 'HVAC Compressor',
      resource: 'power',
      actual: 184.4,
      target: 195.0,
      maxScale: 240,
      unit: 'kWh',
    },
    {
      id: 'b_bath_p',
      name: 'Water Heating',
      resource: 'power',
      actual: 151.8,
      target: 160.0,
      maxScale: 240,
      unit: 'kWh',
    },
    {
      id: 'b_kitchen_p',
      name: 'Kitchen Appliances',
      resource: 'power',
      actual: 130.2,
      target: 135.0,
      maxScale: 240,
      unit: 'kWh',
    },
    {
      id: 'b_light_p',
      name: 'Lighting & Standby',
      resource: 'power',
      actual: 76.0,
      target: 68.0,
      maxScale: 240,
      unit: 'kWh',
    },
    {
      id: 'b_bath_w',
      name: 'Bath & Laundry',
      resource: 'water',
      actual: 4330,
      target: 4500,
      maxScale: 5200,
      unit: 'L',
    },
    {
      id: 'b_kitchen_w',
      name: 'Kitchen & Dining',
      resource: 'water',
      actual: 3148,
      target: 3300,
      maxScale: 5200,
      unit: 'L',
    },
    {
      id: 'b_garden_w',
      name: 'Garden Irrigation',
      resource: 'water',
      actual: 1771,
      target: 1450,
      maxScale: 5200,
      unit: 'L',
    },
    {
      id: 'b_other_w',
      name: 'Other Circuits',
      resource: 'water',
      actual: 591,
      target: 650,
      maxScale: 5200,
      unit: 'L',
    },
  ];

  return raw.map(item => {
    const variancePercent = Number((((item.actual - item.target) / item.target) * 100).toFixed(1));
    const isOverTarget = item.actual > item.target;
    const sign = variancePercent > 0 ? '+' : '−';
    return {
      ...item,
      variancePercent,
      isOverTarget,
      fact: `${sign}${Math.abs(variancePercent)}% vs cap`,
    };
  });
}

/**
 * Derives daily baseload-min to peak-max range metrics from 7-day telemetry.
 */
export function buildDailySpanRange(dailyData: DailyComparisonPoint[]): DailySpanPoint[] {
  return dailyData.map((day, idx) => {
    const powerAvgKw = Number((day.electricityCurrent / 24).toFixed(2));
    // Night idle baseload stays ~0.34-0.46 kW; weekend & Wed evening compressor peaks rise up to ~2.45-3.45 kW
    const isWeekendOrPeak = day.dayName === 'Sat' || day.dayName === 'Sun' || idx === dailyData.length - 1;
    const powerMinKw = Number((0.34 + (idx % 3) * 0.04).toFixed(2));
    const powerPeakKw = Number(
      (powerAvgKw * (isWeekendOrPeak ? 3.55 : 2.95)).toFixed(2)
    );

    const waterAvgLph = Number((day.waterCurrent / 24).toFixed(1));
    const waterMinLph = Number((isWeekendOrPeak ? 4.2 : 1.5).toFixed(1));
    const waterPeakLph = Number(
      (waterAvgLph * (isWeekendOrPeak ? 4.4 : 3.7)).toFixed(1)
    );

    const isHighSwing = powerPeakKw - powerMinKw >= 2.3 || waterPeakLph - waterMinLph >= 68;

    return {
      date: day.date,
      dayName: day.dayName,
      powerMinKw,
      powerAvgKw,
      powerPeakKw,
      waterMinLph,
      waterAvgLph,
      waterPeakLph,
      isHighSwing,
    };
  });
}
