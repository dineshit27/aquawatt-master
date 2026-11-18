import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deviceService } from '../../services/deviceService.js';
import { getVerifiedContext, formatToolSuccess, formatToolError } from './toolHelper.js';

export function registerDeviceTools(server: McpServer): void {
  // 1. get_device_status
  server.tool(
    'get_device_status',
    'Retrieve device operational connectivity, hardware status, and synchronization state for a registered AquaWatt IoT node.',
    {
      deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }),
    },
    async (args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const result = await deviceService.getDeviceStatus(args.deviceId, context);
        return formatToolSuccess(result);
      } catch (err) {
        return formatToolError(err);
      }
    }
  );

  // 2. list_user_devices
  server.tool(
    'list_user_devices',
    'List all AquaWatt sensor monitoring devices owned by the authenticated user.',
    {},
    async (_args, extra) => {
      try {
        const context = getVerifiedContext(extra);
        const devices = await deviceService.getDevices(context);
        return formatToolSuccess({
          totalDevices: devices.length,
          devices,
        });
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}
