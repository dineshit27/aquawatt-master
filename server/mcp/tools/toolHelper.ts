import { getSessionAuthContext } from '../server.js';
import { AuthContext, UnauthenticatedError, DomainServiceError } from '../../services/types.js';

/**
 * Extracts and verifies the AuthContext from the MCP tool execution context.
 * Strictly guarantees that userId is derived from the verified Supabase JWT
 * and cannot be spoofed or overridden by caller parameters.
 */
export function getVerifiedContext(extra: any): AuthContext {
  const auth = extra?.authInfo || (extra?.sessionId ? getSessionAuthContext(extra.sessionId) : null);

  if (!auth || !auth.userId) {
    throw new UnauthenticatedError(
      'Protected MCP tool execution rejected: No verified session identity found. Provide a valid Bearer JWT.'
    );
  }

  return auth;
}

/**
 * Formats a successful tool execution payload as standard MCP content.
 */
export function formatToolSuccess(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Formats a domain error or exception into a predictable, structured MCP error response
 * without exposing internal secrets, stack traces, or credentials.
 */
export function formatToolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof DomainServiceError ? error.code : 'TOOL_EXECUTION_ERROR';

  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            error: {
              code,
              message,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
