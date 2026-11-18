import path from 'path';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { getEnv } from './server/config/env.js';
import { createMcpServer, type McpInstance } from './server/mcp/server.js';
import { authService } from './server/services/authService.js';
import { assistantService } from './server/services/assistantService.js';
import {
  UnauthenticatedError,
  InvalidTokenError,
  UnauthorizedDeviceAccessError,
  DeviceNotFoundError,
  DomainServiceError,
} from './server/services/types.js';

export interface AppServerContext {
  app: express.Express;
  mcp: McpInstance;
  close: () => Promise<void>;
}

export interface CreateAppOptions {
  disableVite?: boolean;
}

/**
 * Creates and configures the Express application with MCP and Vite/static integration.
 */
export async function createApp(options?: CreateAppOptions): Promise<AppServerContext> {
  const env = getEnv(true);
  const app = express();
  let viteInstance: { close: () => Promise<void> } | null = null;

  // Configure reverse proxy trust for Cloud Run / TLS ingress
  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  // Enhanced security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // CORS configuration
  const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. CLI tools, desktop MCP clients, curl)
        if (!origin) return callback(null, true);

        // Allow localhost and specified origins
        const isLocalhost =
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('https://localhost:');

        if (env.NODE_ENV !== 'production' || isLocalhost || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('CORS origin denied'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'mcp-session-id', 'last-event-id', 'x-requested-with'],
      exposedHeaders: ['mcp-session-id', 'WWW-Authenticate'],
    })
  );

  // Parse JSON bodies for standard API endpoints and MCP POST requests
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize AquaWatt MCP Server instance
  const mcp = await createMcpServer();

  // 1. Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: 'aquawatt-platform',
      version: '1.0.0',
      mcp: 'enabled',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      activeSessions: mcp.getActiveSessionCount(),
    });
  });

  // 2. RFC 9728 Protected Resource Metadata endpoint
  const sendProtectedResourceMetadata = (_req: Request, res: Response) => {
    const currentEnv = getEnv();
    const appUrl = (currentEnv.APP_URL || `http://${currentEnv.HOST}:${currentEnv.PORT}`).replace(/\/$/, '');
    const supabaseUrl = currentEnv.VITE_SUPABASE_URL || 'https://supabase.co';
    const authServerUrl = `${supabaseUrl}/auth/v1`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).json({
      resource: `${appUrl}/mcp`,
      authorization_servers: [authServerUrl],
      scopes_supported: [
        'read:telemetry',
        'read:devices',
        'read:alerts',
        'read:analytics',
      ],
      bearer_methods_supported: ['header'],
      resource_documentation: `${appUrl}/docs/mcp-authentication.md`,
    });
  };

  app.get('/.well-known/oauth-protected-resource', sendProtectedResourceMetadata);
  app.get('/.well-known/oauth-protected-resource/mcp', sendProtectedResourceMetadata);

  // 3. Authenticated AI Assistant endpoint (Stage 7)
  const chatRequestSchema = z.object({
    message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message exceeds 2000 characters limit'),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(4000),
    })).optional(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(4000),
    })).optional(),
    deviceId: z.string().uuid({ message: 'deviceId must be a valid UUID' }).optional(),
  }).transform(data => ({
    message: data.message,
    conversationHistory: data.conversationHistory || data.history || [],
    deviceId: data.deviceId,
  }));

  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];
    const currentEnv = getEnv();
    const appUrl = (currentEnv.APP_URL || `http://${currentEnv.HOST}:${currentEnv.PORT}`).replace(/\/$/, '');
    const resourceMetadataUrl = `${appUrl}/.well-known/oauth-protected-resource/mcp`;

    if (!authHeader) {
      res.setHeader(
        'WWW-Authenticate',
        `Bearer realm="AquaWatt MCP", error="invalid_token", error_description="Missing Authorization header", resource_metadata="${resourceMetadataUrl}"`
      );
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Provide a valid Supabase JWT in the Authorization header.',
      });
      return;
    }

    let authContext;
    try {
      authContext = await authService.authenticateUser(authHeader);
    } catch (err) {
      res.setHeader(
        'WWW-Authenticate',
        `Bearer realm="AquaWatt MCP", error="invalid_token", error_description="Invalid or expired token", resource_metadata="${resourceMetadataUrl}"`
      );
      res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN',
        message: err instanceof Error ? err.message : 'Invalid or expired authentication credentials.',
      });
      return;
    }

    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body format',
        errors: parseResult.error.flatten(),
      });
      return;
    }

    try {
      const response = await assistantService.processChat(parseResult.data, authContext);
      res.status(200).json({
        status: 'success',
        ...response,
      });
    } catch (err) {
      if (err instanceof UnauthorizedDeviceAccessError) {
        res.status(403).json({
          status: 'error',
          code: 'ACCESS_DENIED',
          message: err.message,
        });
        return;
      }
      if (err instanceof DeviceNotFoundError) {
        res.status(404).json({
          status: 'error',
          code: 'NOT_FOUND',
          message: err.message,
        });
        return;
      }
      if (err instanceof DomainServiceError) {
        res.status(err.statusCode || 400).json({
          status: 'error',
          code: err.code || 'SERVICE_ERROR',
          message: err.message,
        });
        return;
      }
      console.error('[Assistant Chat Route Error]', err);
      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to process assistant request. Please try again.',
      });
    }
  });

  // 4. Streamable HTTP MCP endpoint (GET for SSE stream, POST for RPC messages, DELETE for session)
  app.all('/mcp', async (req: Request, res: Response) => {
    await mcp.handleRequest(req, res);
  });

  // 4. Vite development middleware or production static serving
  const shouldSkipVite = options?.disableVite || env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test';

  if (!shouldSkipVite && env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    viteInstance = vite;
    app.use(vite.middlewares);
  } else if (!shouldSkipVite && env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 4. Centralized error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Server Error]', err);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
    }
  });

  const close = async (): Promise<void> => {
    if (viteInstance) {
      await viteInstance.close();
    }
    await mcp.close();
  };

  return { app, mcp, close };
}

/**
 * Server runner for standalone and development execution.
 */
export async function startServer(): Promise<void> {
  const env = getEnv();
  const { app } = await createApp();

  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`[AquaWatt] Server running at http://${env.HOST}:${env.PORT}`);
    console.log(`[AquaWatt] Environment: ${env.NODE_ENV}`);
    console.log(`[AquaWatt] MCP Streamable HTTP endpoint: http://${env.HOST}:${env.PORT}/mcp`);
    console.log(`[AquaWatt] Health endpoint: http://${env.HOST}:${env.PORT}/health`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('[AquaWatt] Shutting down server...');
    server.close(() => {
      console.log('[AquaWatt] Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start server only when executed directly as entrypoint
import { fileURLToPath } from 'url';

const isDirectRun =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('/server.ts') ||
    process.argv[1].endsWith('\\server.ts') ||
    process.argv[1].endsWith('/server.js') ||
    process.argv[1].endsWith('\\server.js'));

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('[AquaWatt] Fatal startup error:', err);
    process.exit(1);
  });
}
