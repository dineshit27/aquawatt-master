import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase.js';
import { telemetryService } from './telemetryService.js';
import {
  AuthContext,
  DateRange,
  DateRangeSchema,
  AggregationPeriod,
  TimeRangePreset,
  WaterMetricsDto,
} from './types.js';
import {
  calculateResourceCost,
  DEFAULT_INR_WATER_RATE,
  litersToGallons,
} from '../../src/utils/calculations.js';

export interface WaterBucketDto {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  totalLiters: number;
  totalGallons: number;
  averageFlowRateLpm: number;
  maxFlowRateLpm: number;
  minFlowRateLpm: number;
  sampleCount: number;
  estimatedCostInr: number;
}

export class WaterService {
  /**
   * Retrieves the current water telemetry metrics for a device.
   */
  async getWaterMetrics(
    deviceId: string,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<WaterMetricsDto> {
    const snapshot = await telemetryService.getLatestReading(deviceId, context, customClient);
    return snapshot.water;
  }

  /**
   * Aggregates water telemetry data into hourly, daily, weekly, or monthly buckets.
   */
  async getWaterAggregation(
    deviceId: string,
    period: AggregationPeriod,
    dateRange: DateRange,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<WaterBucketDto[]> {
    DateRangeSchema.parse(dateRange);
    const rows = await telemetryService.getHistoricalReadings(deviceId, dateRange, context, customClient);

    if (rows.length === 0) {
      return [];
    }

    // Group rows into time buckets
    const bucketMap = new Map<string, typeof rows>();

    for (const row of rows) {
      const date = new Date(row.recorded_at);
      let key: string;

      if (period === 'hourly') {
        key = `${date.toISOString().slice(0, 13)}:00:00Z`;
      } else if (period === 'daily') {
        key = `${date.toISOString().slice(0, 10)}`;
      } else if (period === 'weekly') {
        // Calculate Monday of week
        const d = new Date(date);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        d.setUTCDate(diff);
        key = `Week of ${d.toISOString().slice(0, 10)}`;
      } else {
        // Monthly
        key = `${date.toISOString().slice(0, 7)}`;
      }

      const existing = bucketMap.get(key) || [];
      existing.push(row);
      bucketMap.set(key, existing);
    }

    const results: WaterBucketDto[] = [];

    for (const [key, rawBucketRows] of bucketMap.entries()) {
      // 1. Sort strictly in ascending chronological order to handle out-of-order timestamps
      const bucketRows = [...rawBucketRows].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );

      let maxFlow = 0;
      let minFlow = Number.MAX_VALUE;
      let sumFlow = 0;

      for (const r of bucketRows) {
        const flow = Number(r.flow_rate_lpm ?? 0);
        if (flow > maxFlow) maxFlow = flow;
        if (flow < minFlow) minFlow = flow;
        sumFlow += flow;
      }

      if (minFlow === Number.MAX_VALUE) minFlow = 0;

      const avgFlow = bucketRows.length > 0 ? Number((sumFlow / bucketRows.length).toFixed(2)) : 0;

      // 2. Monotonic Delta Aggregation for Cumulative Counters:
      // Prevents double-counting cumulative daily totals and handles counter resets / reboots safely.
      let totalLiters = 0;

      if (bucketRows.length === 1) {
        // Single sample in bucket: use current session liters or fallback to 0 if zero flow
        const r = bucketRows[0];
        const flow = Number(r.flow_rate_lpm ?? 0);
        const currLiters = Number(r.current_liters ?? 0);
        totalLiters = currLiters > 0 ? currLiters : (flow > 0 ? Number((flow * 1).toFixed(2)) : 0);
      } else {
        for (let i = 1; i < bucketRows.length; i++) {
          const prev = bucketRows[i - 1];
          const curr = bucketRows[i];

          const prevDaily = Number(prev.daily_total_liters ?? 0);
          const currDaily = Number(curr.daily_total_liters ?? 0);

          if (currDaily >= prevDaily) {
            // Normal monotonic accumulation
            totalLiters += (currDaily - prevDaily);
          } else {
            // Counter reset detected (e.g. ESP32 reboot or midnight rollover)
            // Accumulate volume reported by new counter from 0
            const resetDelta = currDaily > 0 ? currDaily : Number(curr.current_liters ?? 0);
            totalLiters += resetDelta;
          }
        }
      }

      totalLiters = Number(totalLiters.toFixed(2));
      const start = bucketRows[0].recorded_at;
      const end = bucketRows[bucketRows.length - 1].recorded_at;

      results.push({
        periodLabel: key,
        periodStart: start,
        periodEnd: end,
        totalLiters,
        totalGallons: litersToGallons(totalLiters),
        averageFlowRateLpm: avgFlow,
        maxFlowRateLpm: Number(maxFlow.toFixed(2)),
        minFlowRateLpm: Number(minFlow.toFixed(2)),
        sampleCount: bucketRows.length,
        estimatedCostInr: calculateResourceCost(totalLiters, DEFAULT_INR_WATER_RATE),
      });
    }

    return results;
  }

  /**
   * Helper to compute water summary for a relative preset (8h, 24h, 7d, 30d)
   */
  async getWaterSummary(
    deviceId: string,
    preset: TimeRangePreset,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<{
    preset: TimeRangePreset;
    metrics: WaterMetricsDto;
    aggregation: WaterBucketDto[];
  }> {
    const metrics = await this.getWaterMetrics(deviceId, context, customClient);
    const now = new Date();
    let hoursBack = 24;
    let period: AggregationPeriod = 'hourly';

    if (preset === '8h') {
      hoursBack = 8;
      period = 'hourly';
    } else if (preset === '24h') {
      hoursBack = 24;
      period = 'hourly';
    } else if (preset === '7d') {
      hoursBack = 24 * 7;
      period = 'daily';
    } else if (preset === '30d') {
      hoursBack = 24 * 30;
      period = 'daily';
    }

    const startDate = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();
    const endDate = now.toISOString();

    const aggregation = await this.getWaterAggregation(
      deviceId,
      period,
      { startDate, endDate },
      context,
      customClient
    );

    return { preset, metrics, aggregation };
  }
}

export const waterService = new WaterService();
