import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase.js';
import { waterService } from './waterService.js';
import { electricityService } from './electricityService.js';
import {
  AuthContext,
  DateRange,
  DateRangeSchema,
  AggregationPeriod,
  AggregatedBucketDto,
  PeriodComparisonDto,
} from './types.js';
import {
  calculatePercentageChange,
  calculateCarbonAvoided,
  formatMetric,
} from '../../src/utils/calculations.js';

export class AnalyticsService {
  /**
   * Generates combined water & electricity aggregation for a device.
   */
  async aggregateTelemetry(
    deviceId: string,
    period: AggregationPeriod,
    dateRange: DateRange,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<AggregatedBucketDto[]> {
    DateRangeSchema.parse(dateRange);

    const [waterBuckets, electricBuckets] = await Promise.all([
      waterService.getWaterAggregation(deviceId, period, dateRange, context, customClient),
      electricityService.getElectricityAggregation(deviceId, period, dateRange, context, customClient),
    ]);

    // Align buckets by label
    const combinedMap = new Map<string, AggregatedBucketDto>();

    for (const wb of waterBuckets) {
      combinedMap.set(wb.periodLabel, {
        periodLabel: wb.periodLabel,
        periodStart: wb.periodStart,
        periodEnd: wb.periodEnd,
        water: {
          totalLiters: wb.totalLiters,
          totalGallons: wb.totalGallons,
          averageFlowRateLpm: wb.averageFlowRateLpm,
          maxFlowRateLpm: wb.maxFlowRateLpm,
          minFlowRateLpm: wb.minFlowRateLpm,
          sampleCount: wb.sampleCount,
          costInr: wb.estimatedCostInr,
        },
        electricity: {
          isAvailable: false,
          totalKwh: null,
          averagePowerKw: null,
          maxPowerKw: null,
          costInr: null,
          sampleCount: 0,
        },
      });
    }

    for (const eb of electricBuckets) {
      const existing = combinedMap.get(eb.periodLabel);
      if (existing) {
        existing.electricity = {
          isAvailable: eb.isAvailable,
          totalKwh: eb.totalKwh,
          averagePowerKw: eb.averagePowerKw,
          maxPowerKw: eb.maxPowerKw,
          costInr: eb.estimatedCostInr,
          sampleCount: eb.sampleCount,
        };
      } else {
        combinedMap.set(eb.periodLabel, {
          periodLabel: eb.periodLabel,
          periodStart: eb.periodStart,
          periodEnd: eb.periodEnd,
          water: {
            totalLiters: 0,
            totalGallons: 0,
            averageFlowRateLpm: 0,
            maxFlowRateLpm: 0,
            minFlowRateLpm: 0,
            sampleCount: 0,
            costInr: 0,
          },
          electricity: {
            isAvailable: eb.isAvailable,
            totalKwh: eb.totalKwh,
            averagePowerKw: eb.averagePowerKw,
            maxPowerKw: eb.maxPowerKw,
            costInr: eb.estimatedCostInr,
            sampleCount: eb.sampleCount,
          },
        });
      }
    }

    return Array.from(combinedMap.values());
  }

  /**
   * Compares consumption metrics across two discrete periods.
   */
  async comparePeriods(
    deviceId: string,
    metric: 'water' | 'electricity',
    currentPeriod: DateRange,
    previousPeriod: DateRange,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<PeriodComparisonDto> {
    DateRangeSchema.parse(currentPeriod);
    DateRangeSchema.parse(previousPeriod);

    if (metric === 'water') {
      const [currentBuckets, prevBuckets] = await Promise.all([
        waterService.getWaterAggregation(deviceId, 'daily', currentPeriod, context, customClient),
        waterService.getWaterAggregation(deviceId, 'daily', previousPeriod, context, customClient),
      ]);

      const currentTotal = currentBuckets.reduce((acc, b) => acc + b.totalLiters, 0);
      const prevTotal = prevBuckets.reduce((acc, b) => acc + b.totalLiters, 0);
      const currentCost = currentBuckets.reduce((acc, b) => acc + b.estimatedCostInr, 0);
      const prevCost = prevBuckets.reduce((acc, b) => acc + b.estimatedCostInr, 0);

      const changePct = calculatePercentageChange(currentTotal, prevTotal);
      const absoluteDiff = Number((currentTotal - prevTotal).toFixed(2));
      const waterSaved = absoluteDiff < 0 ? Math.abs(absoluteDiff) : 0;
      const carbonAvoided = calculateCarbonAvoided(waterSaved, 0);

      const summary =
        prevTotal === 0 && currentTotal === 0
          ? 'No water consumption recorded in either period.'
          : `Water consumption is ${currentTotal.toFixed(1)} Liters (${changePct.label} vs previous period of ${prevTotal.toFixed(1)} Liters). ${
              waterSaved > 0
                ? `Conservation effort avoided ~${carbonAvoided} kg CO2 equivalent.`
                : 'Consumption increased relative to baseline period.'
            }`;

      return {
        deviceId,
        metric: 'water',
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          totalUsage: Number(currentTotal.toFixed(2)),
          unit: 'Liters',
          costInr: Number(currentCost.toFixed(2)),
        },
        previousPeriod: {
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
          totalUsage: Number(prevTotal.toFixed(2)),
          unit: 'Liters',
          costInr: Number(prevCost.toFixed(2)),
        },
        change: {
          absoluteChange: absoluteDiff,
          percentageChange: changePct.percent,
          isIncrease: changePct.isIncrease,
          label: changePct.label,
        },
        carbonAvoidedKg: carbonAvoided,
        summary,
      };
    } else {
      // Electricity comparison
      const [currentBuckets, prevBuckets] = await Promise.all([
        electricityService.getElectricityAggregation(deviceId, 'daily', currentPeriod, context, customClient),
        electricityService.getElectricityAggregation(deviceId, 'daily', previousPeriod, context, customClient),
      ]);

      const currentHasData = currentBuckets.some(b => b.isAvailable && b.totalKwh != null);
      const prevHasData = prevBuckets.some(b => b.isAvailable && b.totalKwh != null);

      if (!currentHasData || !prevHasData) {
        return {
          deviceId,
          metric: 'electricity',
          currentPeriod: {
            startDate: currentPeriod.startDate,
            endDate: currentPeriod.endDate,
            totalUsage: null,
            unit: 'kWh',
            costInr: null,
          },
          previousPeriod: {
            startDate: previousPeriod.startDate,
            endDate: previousPeriod.endDate,
            totalUsage: null,
            unit: 'kWh',
            costInr: null,
          },
          change: {
            absoluteChange: null,
            percentageChange: 0,
            isIncrease: false,
            label: 'N/A (INA219 Uncalibrated)',
          },
          carbonAvoidedKg: null,
          summary:
            'Electricity comparison unavailable: INA219 sensor is pending physical calibration and real verified kWh data is not present in both periods.',
        };
      }

      const currentKwh = currentBuckets.reduce((acc, b) => acc + (b.totalKwh || 0), 0);
      const prevKwh = prevBuckets.reduce((acc, b) => acc + (b.totalKwh || 0), 0);
      const currentCost = currentBuckets.reduce((acc, b) => acc + (b.estimatedCostInr || 0), 0);
      const prevCost = prevBuckets.reduce((acc, b) => acc + (b.estimatedCostInr || 0), 0);

      const changePct = calculatePercentageChange(currentKwh, prevKwh);
      const absoluteDiff = Number((currentKwh - prevKwh).toFixed(4));
      const powerSaved = absoluteDiff < 0 ? Math.abs(absoluteDiff) : 0;
      const carbonAvoided = calculateCarbonAvoided(0, powerSaved);

      return {
        deviceId,
        metric: 'electricity',
        currentPeriod: {
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          totalUsage: Number(currentKwh.toFixed(4)),
          unit: 'kWh',
          costInr: Number(currentCost.toFixed(2)),
        },
        previousPeriod: {
          startDate: previousPeriod.startDate,
          endDate: previousPeriod.endDate,
          totalUsage: Number(prevKwh.toFixed(4)),
          unit: 'kWh',
          costInr: Number(prevCost.toFixed(2)),
        },
        change: {
          absoluteChange: absoluteDiff,
          percentageChange: changePct.percent,
          isIncrease: changePct.isIncrease,
          label: changePct.label,
        },
        carbonAvoidedKg: carbonAvoided,
        summary: `Electricity usage is ${formatMetric(currentKwh, 2)} kWh (${changePct.label} vs baseline ${formatMetric(prevKwh, 2)} kWh).`,
      };
    }
  }
}

export const analyticsService = new AnalyticsService();
