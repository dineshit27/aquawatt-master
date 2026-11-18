import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAquaWattPrompts } from './prompts.js';

/**
 * Registers all 5 AquaWatt reusable MCP Prompts on the McpServer instance.
 */
export function registerAllPrompts(server: McpServer): void {
  registerAquaWattPrompts(server);
}
