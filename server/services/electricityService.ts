import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase.js';
import { telemetryService } from './telemetryService.js';
import {
  AuthContext,
  DateRange,
  DateRangeSchema,
  AggregationPeriod,
  TimeRangePreset,
  ElectricityMetricsDto,
} from './types.js';
import {
  calculateResourceCost,
  DEFAULT_INR_ELECTRICITY_RATE,
} from '../../src/utils/calculations.js';

export interface ElectricityBucketDto {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  isAvailable: boolean;
  totalKwh: number | null;
  averagePowerKw: number | null;
  maxPowerKw: number | null;
  minPowerKw: number | null;
  sampleCount: number;
  estimatedCostInr: number | null;
  statusNote: string;
}

export class ElectricityService {
  /**
   * Retrieves the current electricity telemetry metrics for a device.
   * If INA219 is unverified or null in database, isAvailable is false and metrics are null.
   */
  async getElectricityMetrics(
    deviceId: string,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<ElectricityMetricsDto> {
    const snapshot = await telemetryService.getLatestReading(deviceId, context, customClient);
    return snapshot.electricity;
  }

  /**
   * Aggregates electricity telemetry data into time buckets.
   * If INA219 readings are missing/uncalibrated in physical mode,
   * returns isAvailable: false with null metrics, never fabricating data.
   */
  async getElectricityAggregation(
    deviceId: string,
    period: AggregationPeriod,
    dateRange: DateRange,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<ElectricityBucketDto[]> {
    DateRangeSchema.parse(dateRange);
    const rows = await telemetryService.getHistoricalReadings(deviceId, dateRange, context, customClient);

    if (rows.length === 0) {
      return [];
    }

    // Check if ANY row has non-null electrical measurements
    const hasAnyMeasurement = rows.some(
      r => r.active_power_kw != null || r.power_w != null || r.daily_total_kwh != null
    );

    if (!hasAnyMeasurement) {
      // INA219 uncalibrated in physical hardware mode
      const start = rows[0]?.recorded_at || dateRange.startDate;
      const end = rows[rows.length - 1]?.recorded_at || dateRange.endDate;
      return [
        {
          periodLabel: 'INA219 Pending Hardware Calibration',
          periodStart: start,
          periodEnd: end,
          isAvailable: false,
          totalKwh: null,
          averagePowerKw: null,
          maxPowerKw: null,
          minPowerKw: null,
          sampleCount: rows.length,
          estimatedCostInr: null,
          statusNote: 'INA219 DC sensor is physically installed on ESP32 but pending electrical calibration.',
        },
      ];
    }

    // If verified measurements exist, aggregate them by time bucket
    const bucketMap = new Map<string, typeof rows>();

    for (const row of rows) {
      const date = new Date(row.recorded_at);
      let key = '';

      if (period === 'hourly') {
        key = `${date.toISOString().slice(0, 13)}:00:00Z`;
      } else if (period === 'daily') {
        key = `${date.toISOString().slice(0, 10)}`;
      } else if (period === 'weekly') {
        const d = new Date(date);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        d.setUTCDate(diff);
        key = `Week of ${d.toISOString().slice(0, 10)}`;
      } else {
        key = `${date.toISOString().slice(0, 7)}`;
      }

      const existing = bucketMap.get(key) || [];
      existing.push(row);
      bucketMap.set(key, existing);
    }

    const results: ElectricityBucketDto[] = [];

    for (const [key, rawBucketRows] of bucketMap.entries()) {
      // Sort chronologically ascending
      const bucketRows = [...rawBucketRows].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );

      let maxKw = 0;
      let minKw = Number.MAX_VALUE;
      let sumKw = 0;
      let validKwCount = 0;

      for (const r of bucketRows) {
        if (r.active_power_kw != null) {
          const kw = Number(r.active_power_kw);
          if (kw > maxKw) maxKw = kw;
          if (kw < minKw) minKw = kw;
          sumKw += kw;
          validKwCount++;
        }
      }

      const hasMeasurements = validKwCount > 0;
      const avgKw = hasMeasurements ? Number((sumKw / validKwCount).toFixed(3)) : null;

      // Calculate total kWh in bucket using monotonic delta accumulation
      let totalKwh: number | null = null;
      const kwhRows = bucketRows.filter(r => r.daily_total_kwh != null);

      if (kwhRows.length > 0) {
        let accumulated = 0;
        if (kwhRows.length === 1) {
          accumulated = 0;
        } else {
          for (let i = 1; i < kwhRows.length; i++) {
            const prev = Number(kwhRows[i - 1].daily_total_kwh);
            const curr = Number(kwhRows[i].daily_total_kwh);
            if (curr >= prev) {
              accumulated += (curr - prev);
            } else {
              // Reset detected
              accumulated += curr;
            }
          }
        }
        totalKwh = Number(accumulated.toFixed(4));
      }

      const cost = totalKwh != null ? calculateResourceCost(totalKwh, DEFAULT_INR_ELECTRICITY_RATE) : null;

      results.push({
        periodLabel: key,
        periodStart: bucketRows[0].recorded_at,
        periodEnd: bucketRows[bucketRows.length - 1].recorded_at,
        isAvailable: hasMeasurements,
        totalKwh,
        averagePowerKw: avgKw,
        maxPowerKw: hasMeasurements ? Number(maxKw.toFixed(3)) : null,
        minPowerKw: hasMeasurements && minKw !== Number.MAX_VALUE ? Number(minKw.toFixed(3)) : null,
        sampleCount: bucketRows.length,
        estimatedCostInr: cost,
        statusNote: hasMeasurements ? 'Verified readings' : 'Uncalibrated hardware',
      });
    }

    return results;
  }

  /**
   * Helper to compute electricity summary for a relative preset
   */
  async getElectricitySummary(
    deviceId: string,
    preset: TimeRangePreset,
    context: AuthContext,
    customClient?: SupabaseClient<Database>
  ): Promise<{
    preset: TimeRangePreset;
    metrics: ElectricityMetricsDto;
    aggregation: ElectricityBucketDto[];
  }> {
    const metrics = await this.getElectricityMetrics(deviceId, context, customClient);
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

    const aggregation = await this.getElectricityAggregation(
      deviceId,
      period,
      { startDate, endDate },
      context,
      customClient
    );

    return { preset, metrics, aggregation };
  }
}

export const electricityService = new ElectricityService();
