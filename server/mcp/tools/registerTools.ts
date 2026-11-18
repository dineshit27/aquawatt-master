import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDeviceTools } from './deviceTools.js';
import { registerWaterTools } from './waterTools.js';
import { registerElectricityTools } from './electricityTools.js';
import { registerSustainabilityTools } from './sustainabilityTools.js';

/**
 * Registers all 14 AquaWatt domain tools on the McpServer instance.
 */
export function registerAllTools(server: McpServer): void {
  // Device Management (Tools 1 & 2)
  registerDeviceTools(server);

  // Water Monitoring (Tools 3, 4, 5, 6, 7)
  registerWaterTools(server);

  // Electricity Monitoring (Tools 8, 9, 10, 11)
  registerElectricityTools(server);

  // Alerts & Sustainability (Tools 12, 13, 14)
  registerSustainabilityTools(server);
}
