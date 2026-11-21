import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { ProfileRow } from '../lib/supabase';
import type { UserProfile } from '../types';

export type RouteGuardDecision = 'loading' | 'allow' | 'redirect_login' | 'redirect_app';

export function evaluateProtectedRoute(params: {
  authLoading: boolean;
  isAuthenticated: boolean;
}): RouteGuardDecision {
  if (params.authLoading) return 'loading';
  return params.isAuthenticated ? 'allow' : 'redirect_login';
}

export function evaluatePublicOnlyRoute(params: {
  authLoading: boolean;
  isAuthenticated: boolean;
}): RouteGuardDecision {
  if (params.authLoading) return 'loading';
  return params.isAuthenticated ? 'redirect_app' : 'allow';
}

export function buildPostLoginRedirectPath(locationState: unknown): string {
  if (!locationState || typeof locationState !== 'object') {
    return '/dashboard';
  }
  const from = (locationState as { from?: { pathname?: string; search?: string } }).from;
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  const search = typeof from?.search === 'string' ? from.search : '';

  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname === '/login' ||
    pathname === '/signup'
  ) {
    return '/dashboard';
  }

  return `${pathname}${search}`;
}

export function normalizePlanTier(tier?: string | null): UserProfile['tier'] {
  if (tier === 'Free Explorer' || tier === 'Standard Pro' || tier === 'Enterprise Eco') {
    return tier;
  }
  return 'Standard Pro';
}

export function normalizeFacilityType(type?: string | null): UserProfile['facilityType'] {
  if (type === 'Residential' || type === 'Commercial' || type === 'Multi-unit' || type === 'Industrial') {
    return type;
  }
  return 'Residential';
}

export function mapSupabaseAuthUserToProfile(
  authUser: SupabaseAuthUser,
  profileRow?: ProfileRow | null
): UserProfile {
  const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
  const email = profileRow?.email || authUser.email || '';
  const fallbackName = email ? email.split('@')[0] : 'AquaWatt Operator';
  const fullName =
    (profileRow?.full_name && profileRow.full_name.trim()) ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    fallbackName;

  const facilityName =
    (profileRow?.facility_name && profileRow.facility_name.trim()) ||
    (typeof meta.facility_name === 'string' && meta.facility_name.trim()) ||
    'AquaWatt Facility Console';

  const joinedDate = authUser.created_at
    ? new Date(authUser.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Active Session';

  return {
    id: authUser.id,
    fullName,
    email,
    avatarUrl: profileRow?.avatar_url || '',
    facilityName,
    facilityType: normalizeFacilityType(profileRow?.facility_type),
    address: profileRow?.address || 'ESP32 Telemetry Bench',
    preferredUnitWater: profileRow?.preferred_unit_water === 'gallons' ? 'gallons' : 'liters',
    preferredUnitEnergy: profileRow?.preferred_unit_energy === 'mwh' ? 'mwh' : 'kwh',
    joinedDate,
    tier: normalizePlanTier(profileRow?.tier),
    sustainabilityScore:
      typeof profileRow?.sustainability_score === 'number' ? profileRow.sustainability_score : 85,
  };
}

export function normalizeAuthErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error || 'Authentication error');

  const lower = raw.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address via the verification link before signing in.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lower.includes('jwt expired') || lower.includes('refresh token') || lower.includes('session')) {
    return 'Your authentication session expired or is invalid. Please sign in again.';
  }
  if (lower.includes('password') && lower.includes('6')) {
    return 'Password must be at least 6 characters long.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Unable to reach Supabase authentication service. Check your connection and project URL.';
  }
  return raw;
}
