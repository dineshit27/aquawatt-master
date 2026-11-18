import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { getEnv } from '../config/env.js';
import { registerAllTools } from './tools/registerTools.js';
import { registerAllResources } from './resources/registerResources.js';
import { registerAllPrompts } from './prompts/registerPrompts.js';
import { authService } from '../services/authService.js';
import {
  AuthContext,
  UnauthenticatedError,
} from '../services/types.js';

export interface McpInstance {
  server: McpServer;
  transport?: StreamableHTTPServerTransport;
  handleRequest: (req: Request, res: Response) => Promise<void>;
  close: () => Promise<void>;
  getSessionAuth: (sessionId: string) => AuthContext | null;
  requireSessionAuth: (sessionId?: string, req?: Request) => AuthContext;
  sweepExpiredSessions: () => number;
  getActiveSessionCount: () => number;
  terminateSession: (sessionId: string) => Promise<boolean>;
}

interface McpSessionRecord {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  authContext: AuthContext | null;
  createdAt: number;
  lastSeen: number;
}

/**
 * Tracks authenticated user contexts and transports per active MCP session.
 */
const sessionMap = new Map<string, McpSessionRecord>();

export function getSessionAuthContext(sessionId: string): AuthContext | null {
  const session = sessionMap.get(sessionId);
  if (!session) return null;
  session.lastSeen = Date.now();
  return session.authContext;
}

export function setSessionAuthContext(sessionId: string, authContext: AuthContext): void {
  const session = sessionMap.get(sessionId);
  if (session) {
    session.authContext = authContext;
    session.lastSeen = Date.now();
  }
}

export function clearSessionAuthContext(sessionId: string): void {
  sessionMap.delete(sessionId);
}

export function getActiveSessionCount(): number {
  return sessionMap.size;
}

export async function terminateMcpSession(sessionId: string): Promise<boolean> {
  const session = sessionMap.get(sessionId);
  if (!session) return false;
  try {
    await session.transport.close();
    await session.server.close();
  } catch {}
  sessionMap.delete(sessionId);
  return true;
}

export function sweepExpiredMcpSessions(ttlMs: number): number {
  const now = Date.now();
  let swept = 0;
  for (const [sid, session] of sessionMap.entries()) {
    if (now - session.lastSeen > ttlMs) {
      try {
        session.transport.close();
        session.server.close();
      } catch {}
      sessionMap.delete(sid);
      swept++;
    }
  }
  return swept;
}

function createServerInstance(name: string, version: string): McpServer {
  const server = new McpServer({
    name,
    version,
  });
  registerAllTools(server);
  registerAllResources(server);
  registerAllPrompts(server);
  return server;
}

/**
 * Creates and initializes the AquaWatt MCP Server instance
 * using the official MCP TypeScript SDK Streamable HTTP transport
 * with strict server-side JWT authentication and multi-session support.
 */
export async function createMcpServer(customName?: string, customVersion?: string): Promise<McpInstance> {
  const env = getEnv();
  const name = customName || env.MCP_SERVER_NAME;
  const version = customVersion || env.MCP_SERVER_VERSION;

  const primaryServer = createServerInstance(name, version);

  /**
   * Helper to retrieve verified AuthContext from session or request.
   * Throws UnauthenticatedError if no verified user identity is present.
   */
  const requireSessionAuth = (sessionId?: string, req?: Request): AuthContext => {
    if (req && (req as any).authContext) {
      return (req as any).authContext as AuthContext;
    }

    if (sessionId) {
      const auth = getSessionAuthContext(sessionId);
      if (auth) return auth;
    }

    throw new UnauthenticatedError(
      'Protected MCP operation denied: No verified authentication context found for this request or session.'
    );
  };

  const appUrl = (env.APP_URL || `http://${env.HOST}:${env.PORT}`).replace(/\/$/, '');
  const resourceMetadataUrl = `${appUrl}/.well-known/oauth-protected-resource/mcp`;

  const send401 = (res: Response, req: Request, message: string) => {
    // Escape quotes in message for header safety
    const safeDesc = message.replace(/"/g, "'");
    res.setHeader(
      'WWW-Authenticate',
      `Bearer realm="AquaWatt MCP", error="invalid_token", error_description="${safeDesc}", resource_metadata="${resourceMetadataUrl}"`
    );
    res.status(401).json({
      jsonrpc: '2.0',
      id: req.body?.id ?? null,
      error: {
        code: -32001,
        message,
      },
    });
  };

  // Background timer to sweep expired sessions
  const cleanupInterval = setInterval(() => {
    sweepExpiredMcpSessions(env.MCP_SESSION_TTL_MS);
  }, env.MCP_SESSION_CLEANUP_INTERVAL_MS);
  cleanupInterval.unref();

  const handleRequest = async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;

    // Handle DELETE method for explicit session termination
    if (req.method === 'DELETE') {
      if (!sessionIdHeader) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: Missing mcp-session-id header for session termination',
          },
        });
        return;
      }

      const terminated = await terminateMcpSession(sessionIdHeader);
      if (terminated) {
        res.status(200).json({
          status: 'session_terminated',
          sessionId: sessionIdHeader,
        });
        return;
      }

      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Session not found',
        },
      });
      return;
    }

    let verifiedAuth: AuthContext | null = null;

    // 1. If an Authorization header is provided, verify it immediately
    if (authHeader) {
      try {
        verifiedAuth = await authService.authenticateUser(authHeader);
        (req as any).authContext = verifiedAuth;
        (req as any).auth = verifiedAuth; // Pass through to MCP transport request context

        if (sessionIdHeader) {
          setSessionAuthContext(sessionIdHeader, verifiedAuth);
        }
      } catch (err) {
        // Explicitly reject invalid or expired tokens with RFC-compliant 401 & challenge
        send401(res, req, err instanceof Error ? err.message : 'Invalid or expired authentication credentials.');
        return;
      }
    } else if (sessionIdHeader) {
      // Check if this existing session already has an authenticated user context
      verifiedAuth = getSessionAuthContext(sessionIdHeader);
      if (verifiedAuth) {
        (req as any).authContext = verifiedAuth;
        (req as any).auth = verifiedAuth;
      }
    }

    // 2. Protect sensitive MCP operations from unauthenticated access
    const method = req.body?.method;
    const isProtectedMethod =
      method === 'tools/call' ||
      method === 'resources/read' ||
      method === 'prompts/get';

    if (isProtectedMethod && !verifiedAuth) {
      send401(res, req, 'Authentication required. Provide a valid Supabase JWT in the Authorization header.');
      return;
    }

    try {
      // 3. Route to active session or initialize a new Streamable HTTP session
      const isInit = isInitializeRequest(req.body);

      if (!sessionIdHeader && isInit) {
        // Initialize new transport & server session
        const sessionServer = createServerInstance(name, version);
        let createdSid = '';

        const sessionTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            createdSid = sid;
            const now = Date.now();
            sessionMap.set(sid, {
              server: sessionServer,
              transport: sessionTransport,
              authContext: verifiedAuth,
              createdAt: now,
              lastSeen: now,
            });
          },
        });

        sessionTransport.onclose = () => {
          const sid = sessionTransport.sessionId || createdSid;
          if (sid && sessionMap.has(sid)) {
            sessionMap.delete(sid);
          }
        };

        await sessionServer.connect(sessionTransport);
        (req as any).authContext = verifiedAuth;
        (req as any).auth = verifiedAuth;

        await sessionTransport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionIdHeader) {
        const existingSession = sessionMap.get(sessionIdHeader);
        if (!existingSession) {
          res.status(404).json({
            jsonrpc: '2.0',
            id: req.body?.id ?? null,
            error: {
              code: -32001,
              message: 'Session not found',
            },
          });
          return;
        }

        existingSession.lastSeen = Date.now();
        if (verifiedAuth) {
          existingSession.authContext = verifiedAuth;
        }

        (req as any).authContext = existingSession.authContext;
        (req as any).auth = existingSession.authContext;

        await existingSession.transport.handleRequest(req, res, req.body);
        return;
      }

      // No session ID provided and not an initialization request
      res.status(400).json({
        jsonrpc: '2.0',
        id: req.body?.id ?? null,
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal MCP server error',
            data: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  };

  const close = async (): Promise<void> => {
    try {
      clearInterval(cleanupInterval);
      for (const [, session] of sessionMap) {
        try {
          await session.transport.close();
          await session.server.close();
        } catch {
          // Ignore individual session close errors on shutdown
        }
      }
      sessionMap.clear();
      await primaryServer.close();
    } catch (err) {
      console.error('[MCP] Error while closing server:', err);
    }
  };

  return {
    server: primaryServer,
    handleRequest,
    close,
    getSessionAuth: getSessionAuthContext,
    requireSessionAuth,
    sweepExpiredSessions: () => sweepExpiredMcpSessions(env.MCP_SESSION_TTL_MS),
    getActiveSessionCount,
    terminateSession: terminateMcpSession,
  };
}
