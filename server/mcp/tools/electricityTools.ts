import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { electricityService } from '../../services/electricityService.js';
import { analyticsService } from '../../services/analyticsService.js';
import { telemetryService } from '../../services/telemetryService.js';
import { detectAnomaly } from '../../../src/utils/calculations.js';
import { getVerifiedContext, formatToolSuccess, formatToolError } from './toolHelper.js';

export function registerElectricityTools(server: McpServer): void {
  // 8. get_electricity_consumption
  server.tool(
    'get_electricity_consumption',
    'Retrieve electricity consumption and active power metrics. Strictly returns unavailable status with null values when INA219 DC sensor is uncalibrated.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
      period: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
      startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 string' }),
      endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 string' }),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const buckets = await electricityService.getElectricityAggregation(
          args.deviceId,
          args.period,
          { startDate: args.startDate, endDate: args.endDate },
          context
        );
        return formatToolSuccess({
          deviceId: args.deviceId,
          period: args.period,
          totalBuckets: buckets.length,
          buckets,
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 9. analyze_electricity_usage
  server.tool(
    'analyze_electricity_usage',
    'Analyze electricity consumption trends and power metrics for a relative time window (8h, 24h, 7d, 30d). Returns unavailable if INA219 is uncalibrated.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
      timeRange: z.enum(['8h', '24h', '7d', '30d']).default('24h'),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const summary = await electricityService.getElectricitySummary(args.deviceId, args.timeRange, context);
        return formatToolSuccess(summary);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 10. compare_electricity_consumption
  server.tool(
    'compare_electricity_consumption',
    'Compare electricity usage across two user-selected periods. Returns explicit hardware pending calibration notice when physical INA219 data is unavailable.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
      currentStartDate: z.string().datetime({ message: 'currentStartDate must be a valid ISO 8601 string' }),
      currentEndDate: z.string().datetime({ message: 'currentEndDate must be a valid ISO 8601 string' }),
      previousStartDate: z.string().datetime({ message: 'previousStartDate must be a valid ISO 8601 string' }),
      previousEndDate: z.string().datetime({ message: 'previousEndDate must be a valid ISO 8601 string' }),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const comparison = await analyticsService.comparePeriods(
          args.deviceId,
          'electricity',
          { startDate: args.currentStartDate, endDate: args.currentEndDate },
          { startDate: args.previousStartDate, endDate: args.previousEndDate },
          context
        );
        return formatToolSuccess(comparison);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 11. detect_energy_anomalies
  server.tool(
    'detect_energy_anomalies',
    'Detect electrical power surges and consumption anomalies. Returns explicit unavailable status when INA219 is uncalibrated (never generates simulated anomalies).',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
      startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 string' }),
      endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 string' }),
      expectedBaselineKw: z.number().positive().optional().default(1.0),
      sensitivityMultiplier: z.number().positive().optional().default(1.35),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const rows = await telemetryService.getHistoricalReadings(
          args.deviceId,
          { startDate: args.startDate, endDate: args.endDate },
          context
        );

        const hasElectricalData = rows.some(r => r.active_power_kw != null);

        if (!hasElectricalData) {
          return formatToolSuccess({
            deviceId: args.deviceId,
            isAvailable: false,
            hardwareStatus: 'uncalibrated_hardware',
            statusNote: 'INA219 DC sensor is pending electrical calibration. Power anomaly detection is unavailable to prevent simulated alerts.',
            anomaliesDetected: [],
          });
        }

        const anomalies: Array<{
          recordedAt: string;
          powerKw: number;
          expectedBaselineKw: number;
          severity: string;
          deviationRatio: number;
        }> = [];

        for (const r of rows) {
          if (r.active_power_kw != null) {
            const kw = Number(r.active_power_kw);
            const evaluation = detectAnomaly(kw, args.expectedBaselineKw, args.sensitivityMultiplier);
            if (evaluation.isAnomaly) {
              anomalies.push({
                recordedAt: r.recorded_at,
                powerKw: kw,
                expectedBaselineKw: args.expectedBaselineKw,
                severity: evaluation.severity,
                deviationRatio: evaluation.deviationRatio,
              });
            }
          }
        }

        return formatToolSuccess({
          deviceId: args.deviceId,
          isAvailable: true,
          hardwareStatus: 'operational',
          totalSamplesAnalyzed: rows.length,
          anomaliesCount: anomalies.length,
          anomaliesDetected: anomalies,
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}
