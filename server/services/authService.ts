import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase.js';
import { createScopedSupabaseClient, isServerSupabaseConfigured } from './supabaseClient.js';
import {
  AuthContext,
  UnauthenticatedError,
  InvalidTokenError,
  DatabaseUnavailableError,
} from './types.js';

export type TokenVerifier = (token: string) => Promise<{ id: string; email?: string; role?: string } | null>;

export class AuthService {
  private customVerifier?: TokenVerifier;

  /**
   * For testing or custom auth integrations.
   * Strictly blocked in production environments to prevent authentication bypass.
   */
  public setCustomVerifier(verifier?: TokenVerifier) {
    if (process.env.NODE_ENV === 'production' && verifier) {
      throw new Error('setCustomVerifier is strictly forbidden in production mode.');
    }
    this.customVerifier = verifier;
  }

  /**
   * Verifies an incoming authorization header or raw JWT token server-side.
   * 
   * SECURITY RULE:
   * AuthContext.userId is DERIVED EXCLUSIVELY from the verified cryptographic JWT.
   * Any client-provided or caller-claimed userId is strictly ignored.
   */
  async authenticateUser(
    authHeaderOrToken?: string | null,
    customClient?: SupabaseClient<Database>
  ): Promise<AuthContext> {
    if (!authHeaderOrToken || typeof authHeaderOrToken !== 'string') {
      throw new UnauthenticatedError('Missing or empty authentication credentials.');
    }

    // Strip optional 'Bearer ' prefix
    const token = authHeaderOrToken.trim().replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      throw new UnauthenticatedError('Authentication token format is invalid (empty Bearer token).');
    }

    // 1. If custom verifier is provided (e.g. in test suite and strictly not in production)
    if (this.customVerifier && process.env.NODE_ENV !== 'production') {
      const verified = await this.customVerifier(token);
      if (!verified || !verified.id) {
        throw new InvalidTokenError('Supplied JWT token could not be verified by auth provider.');
      }
      return {
        userId: verified.id,
        userToken: token,
        email: verified.email,
        role: verified.role,
      };
    }

    // 2. Verify with Supabase Auth server
    const client = createScopedSupabaseClient({ userId: '', userToken: token }, customClient);
    if (!client) {
      if (!isServerSupabaseConfigured()) {
        throw new DatabaseUnavailableError('Supabase authentication is not configured in environment.');
      }
      throw new InvalidTokenError('Failed to initialize authentication verification client.');
    }

    try {
      const { data, error } = await client.auth.getUser(token);

      if (error || !data || !data.user) {
        throw new InvalidTokenError(
          error ? `JWT validation failed: ${error.message}` : 'Token verification returned empty user identity.'
        );
      }

      const user = data.user;

      // STRICT SECURITY: userId is derived exclusively from verified JWT user.id
      return {
        userId: user.id,
        userToken: token,
        email: user.email,
        role: user.role,
      };
    } catch (err) {
      if (err instanceof InvalidTokenError || err instanceof UnauthenticatedError || err instanceof DatabaseUnavailableError) {
        throw err;
      }
      throw new InvalidTokenError(
        `Unexpected error verifying token: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

export const authService = new AuthService();
