import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env.js';
import type { Database } from '../../src/lib/supabase.js';
import type { AuthContext } from './types.js';

/**
 * Validates if Supabase server credentials are configured and not placeholders.
 */
export function isServerSupabaseConfigured(): boolean {
  const env = getEnv();
  const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return false;
  }

  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();

  if (
    trimmedUrl === '' ||
    trimmedKey === '' ||
    trimmedUrl.includes('your-project-id') ||
    trimmedUrl.includes('placeholder') ||
    trimmedKey.includes('placeholder')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

let customClientOverride: SupabaseClient<Database> | null = null;

/**
 * Test hook to inject an in-memory or mock Supabase client for hermetic unit and MCP testing.
 * Strictly blocked in production environments to prevent credential or client tampering.
 */
export function setCustomSupabaseClient(client: SupabaseClient<Database> | null): void {
  if (process.env.NODE_ENV === 'production' && client !== null) {
    throw new Error('setCustomSupabaseClient is strictly forbidden in production mode.');
  }
  customClientOverride = client;
}

/**
 * Creates a server-side Supabase client scoped to the authenticated user.
 * 
 * When userToken is provided, it is injected into the Authorization header,
 * ensuring PostgreSQL Row Level Security (RLS) policies (auth.uid() = user_id)
 * are enforced directly by the database engine.
 * 
 * If isServiceRole is requested and SUPABASE_SERVICE_ROLE_KEY is present,
 * creates an administrative client (strict ownership checks are enforced in domain services).
 */
export function createScopedSupabaseClient(
  context?: AuthContext,
  customClient?: SupabaseClient<Database>
): SupabaseClient<Database> | null {
  // Disallow custom client overrides in production
  if (process.env.NODE_ENV === 'production') {
    if (!isServerSupabaseConfigured()) {
      return null;
    }
  } else {
    if (customClient) {
      return customClient;
    }

    if (customClientOverride) {
      return customClientOverride;
    }

    if (!isServerSupabaseConfigured()) {
      return null;
    }
  }

  const env = getEnv();
  const url = (env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!.trim();
  const anonKey = (env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)!.trim();
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  // If service-role is explicitly requested and key exists
  if (context?.isServiceRole && serviceKey) {
    return createClient<Database>(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  // User-scoped client using anon key + user Bearer JWT
  const headers: Record<string, string> = {};
  if (context?.userToken) {
    headers['Authorization'] = `Bearer ${context.userToken.trim()}`;
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });
}
