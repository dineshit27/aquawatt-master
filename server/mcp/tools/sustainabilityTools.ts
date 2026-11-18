import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generalService } from '../../services/generalService.js';
import { getVerifiedContext, formatToolSuccess, formatToolError } from './toolHelper.js';

export function registerSustainabilityTools(server: McpServer): void {
  // 12. get_active_alerts
  server.tool(
    'get_active_alerts',
    'Retrieve active, unresolved telemetry and hardware alerts for devices owned by the authenticated user.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }).optional(),
      severity: z.enum(['critical', 'warning', 'info', 'all']).default('all'),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const alerts = await generalService.getActiveAlerts(context, {
          deviceId: args.deviceId,
          severity: args.severity,
        });
        return formatToolSuccess({
          totalAlerts: alerts.length,
          severityFilter: args.severity,
          alerts,
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 13. generate_sustainability_report
  server.tool(
    'generate_sustainability_report',
    'Generate a comprehensive sustainability report using verified physical water telemetry, transparently distinguishing estimates from uncalibrated electrical hardware.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }).optional(),
      timeRange: z.enum(['8h', '24h', '7d', '30d']).default('30d'),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const report = await generalService.generateSustainabilityReport(context, {
          deviceId: args.deviceId,
          timeRange: args.timeRange,
        });
        return formatToolSuccess(report);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 14. get_utility_overview
  server.tool(
    'get_utility_overview',
    'Provide a consolidated overview of devices, water usage, electricity availability, active alerts, and sustainability scoring for the authenticated user.',
    {},
    async (_args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const overview = await generalService.getPlatformOverview(context);
        return formatToolSuccess(overview);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}
