import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDeviceResources } from './deviceResources.js';

/**
 * Registers all 6 AquaWatt MCP Resources and Resource Templates on the McpServer instance.
 */
export function registerAllResources(server: McpServer): void {
  registerDeviceResources(server);
}
