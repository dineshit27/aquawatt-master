import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { telemetryService } from '../../services/telemetryService.js';
import { waterService } from '../../services/waterService.js';
import { analyticsService } from '../../services/analyticsService.js';
import { anomalyService } from '../../services/anomalyService.js';
import { getVerifiedContext, formatToolSuccess, formatToolError } from './toolHelper.js';

export function registerWaterTools(server: McpServer): void {
  // 3. get_latest_readings
  server.tool(
    'get_latest_readings',
    'Retrieve the latest physical water and electrical telemetry snapshot recorded by an AquaWatt monitoring device.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const snapshot = await telemetryService.getLatestReading(args.deviceId, context);
        return formatToolSuccess(snapshot);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 4. get_water_consumption
  server.tool(
    'get_water_consumption',
    'Retrieve water consumption aggregated into hourly, daily, weekly, or monthly time buckets for a specified date range.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
      period: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
      startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 string' }),
      endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 string' }),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const buckets = await waterService.getWaterAggregation(
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

  // 5. analyze_water_usage
  server.tool(
    'analyze_water_usage',
    'Analyze water consumption patterns, averages, peak flow rates, and volume metrics for a relative time window (8h, 24h, 7d, 30d).',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
      timeRange: z.enum(['8h', '24h', '7d', '30d']).default('24h'),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const summary = await waterService.getWaterSummary(args.deviceId, args.timeRange, context);
        return formatToolSuccess(summary);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 6. compare_water_consumption
  server.tool(
    'compare_water_consumption',
    'Compare water consumption between two user-selected periods, evaluating percentage change, volumetric difference, and carbon impact.',
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
          'water',
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

  // 7. detect_possible_leaks
  server.tool(
    'detect_possible_leaks',
    'Run explainable possible-leak detection using actual FS-S401 turbine flow readings. Strictly reports findings with transparent evidence and caveats (never claims a confirmed leak).',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
      startDate: z.string().datetime({ message: 'startDate must be a valid ISO 8601 string' }),
      endDate: z.string().datetime({ message: 'endDate must be a valid ISO 8601 string' }),
      timezone: z.string().optional().default('Asia/Kolkata'),
      nightStartHour: z.number().int().min(0).max(23).optional().default(1),
      nightEndHour: z.number().int().min(0).max(23).optional().default(5),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const analysis = await anomalyService.detectPossibleLeak(
          args.deviceId,
          { startDate: args.startDate, endDate: args.endDate },
          context,
          {
            timezone: args.timezone,
            nightStartHour: args.nightStartHour,
            nightEndHour: args.nightEndHour,
          }
        );
        return formatToolSuccess(analysis);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}
