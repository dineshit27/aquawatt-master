import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env variables if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.string().url().optional().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional().default('http://localhost:3000,http://127.0.0.1:3000'),
  VITE_SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  MCP_SERVER_NAME: z.string().default('aquawatt-mcp-server'),
  MCP_SERVER_VERSION: z.string().default('1.0.0'),
  MCP_RESOURCE_ID: z.string().default('aquawatt://mcp'),
  MCP_SESSION_TTL_MS: z.coerce.number().int().positive().default(1800000), // 30 minutes
  MCP_SESSION_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(300000), // 5 minutes
  TRUST_PROXY: z.union([z.boolean(), z.string(), z.number()]).default(true),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig | null = null;

export function validateEnv(customEnv?: Record<string, string | undefined>): EnvConfig {
  const source = customEnv || process.env;
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${errorDetails}`);
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export function getEnv(forceRefresh = false): EnvConfig {
  if (!parsedEnv || forceRefresh) {
    return validateEnv();
  }
  return parsedEnv;
}

export const env = getEnv();
