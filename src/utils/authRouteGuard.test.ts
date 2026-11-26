import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.js';
import { AppProvider } from '../context/AppContext.js';
import { Login } from '../pages/Login.js';
import { Signup } from '../pages/Signup.js';
import {
  buildPostLoginRedirectPath,
  evaluatePasswordStrength,
  evaluateProtectedRoute,
  evaluatePublicOnlyRoute,
  mapSupabaseAuthUserToProfile,
  normalizeAuthErrorMessage,
  normalizeFacilityType,
  normalizePlanTier,
} from './authRouteGuard.js';

describe('Auth Route Guard & Identity Mapping', () => {
  it('holds loading state while session is restoring on protected and public-only routes', () => {
    assert.strictEqual(
      evaluateProtectedRoute({ authLoading: true, isAuthenticated: false }),
      'loading'
    );
    assert.strictEqual(
      evaluatePublicOnlyRoute({ authLoading: true, isAuthenticated: true }),
      'loading'
    );
  });

  it('redirects unauthenticated requests away from protected routes and allows authenticated ones', () => {
    assert.strictEqual(
      evaluateProtectedRoute({ authLoading: false, isAuthenticated: false }),
      'redirect_login'
    );
    assert.strictEqual(
      evaluateProtectedRoute({ authLoading: false, isAuthenticated: true }),
      'allow'
    );
  });

  it('redirects authenticated users away from /login and /signup toward the console', () => {
    assert.strictEqual(
      evaluatePublicOnlyRoute({ authLoading: false, isAuthenticated: true }),
      'redirect_app'
    );
    assert.strictEqual(
      evaluatePublicOnlyRoute({ authLoading: false, isAuthenticated: false }),
      'allow'
    );
  });

  it('validates post-login redirect paths safely and blocks open redirects or auth-page loops', () => {
    assert.strictEqual(buildPostLoginRedirectPath(null), '/dashboard');
    assert.strictEqual(
      buildPostLoginRedirectPath({ from: { pathname: '//evil.example', search: '?x=1' } }),
      '/dashboard'
    );
    assert.strictEqual(
      buildPostLoginRedirectPath({ from: { pathname: '/login', search: '' } }),
      '/dashboard'
    );
    assert.strictEqual(
      buildPostLoginRedirectPath({ from: { pathname: '/signup', search: '' } }),
      '/dashboard'
    );
    assert.strictEqual(
      buildPostLoginRedirectPath({ from: { pathname: '/analytics', search: '?tab=water' } }),
      '/analytics?tab=water'
    );
  });

  it('maps Supabase auth user metadata and optional DB profile row into a UserProfile', () => {
    const authUser = {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'operator@example.com',
      created_at: '2026-11-01T10:00:00Z',
      user_metadata: {
        full_name: 'Lab Operator',
        facility_name: 'Testbench Building A',
      },
    } as unknown as SupabaseAuthUser;

    const fromMetaOnly = mapSupabaseAuthUserToProfile(authUser, null);
    assert.strictEqual(fromMetaOnly.id, '11111111-1111-4111-a111-111111111111');
    assert.strictEqual(fromMetaOnly.fullName, 'Lab Operator');
    assert.strictEqual(fromMetaOnly.facilityName, 'Testbench Building A');
    assert.strictEqual(fromMetaOnly.tier, 'Standard Pro');

    const withDbRow = mapSupabaseAuthUserToProfile(authUser, {
      id: '11111111-1111-4111-a111-111111111111',
      full_name: 'Verified Operator',
      email: 'operator@example.com',
      avatar_url: null,
      facility_name: 'Facility Override',
      facility_type: 'Commercial',
      address: 'Bench #2',
      preferred_unit_water: 'gallons',
      preferred_unit_energy: 'mwh',
      tier: 'Enterprise Eco',
      sustainability_score: 91,
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    });

    assert.strictEqual(withDbRow.fullName, 'Verified Operator');
    assert.strictEqual(withDbRow.facilityName, 'Facility Override');
    assert.strictEqual(withDbRow.facilityType, 'Commercial');
    assert.strictEqual(withDbRow.preferredUnitWater, 'gallons');
    assert.strictEqual(withDbRow.preferredUnitEnergy, 'mwh');
    assert.strictEqual(withDbRow.tier, 'Enterprise Eco');
    assert.strictEqual(withDbRow.sustainabilityScore, 91);
  });

  it('normalizes tiers, facility types, and common Supabase auth error messages', () => {
    assert.strictEqual(normalizePlanTier('Invalid'), 'Standard Pro');
    assert.strictEqual(normalizeFacilityType('Unknown'), 'Residential');
    assert.ok(
      normalizeAuthErrorMessage(new Error('Invalid login credentials')).includes('Invalid email or password')
    );
    assert.ok(
      normalizeAuthErrorMessage(new Error('User already registered')).includes('already exists')
    );
    assert.ok(
      normalizeAuthErrorMessage(new Error('Email not confirmed')).includes('confirm your email')
    );
  });

  it('renders split-screen Login and Signup pages cleanly via SSR with AquaWatt branding', () => {
    const loginHtml = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          AppProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: ['/login'] },
            React.createElement(Login)
          )
        )
      )
    );

    assert.ok(loginHtml.includes('Sign in to your Account'));
    assert.ok(loginHtml.includes('Login with Google'));
    assert.ok(loginHtml.includes('Back to Website'));
    assert.ok(loginHtml.includes('AquaWatt'));
    assert.ok(!loginHtml.includes('Watermelon'));
    assert.ok(!loginHtml.includes('watermelon.sh'));
    assert.ok(!loginHtml.includes('signup-password-strength'));

    const signupHtml = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          AppProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: ['/signup'] },
            React.createElement(Signup)
          )
        )
      )
    );

    assert.ok(signupHtml.includes('Create your Account'));
    assert.ok(signupHtml.includes('Sign up with Google'));
    assert.ok(signupHtml.includes('Terms of Service'));
    assert.ok(signupHtml.includes('Privacy Policy'));
    assert.ok(signupHtml.includes('signup-password-strength'));
    assert.ok(signupHtml.includes('role="progressbar"'));
    assert.ok(signupHtml.includes('8+ characters'));
    assert.ok(!signupHtml.includes('Watermelon'));
    assert.ok(!signupHtml.includes('30 days free trial'));
  });

  it('evaluates password strength levels accurately in real time', () => {
    const empty = evaluatePasswordStrength('');
    assert.strictEqual(empty.level, 'empty');
    assert.strictEqual(empty.percent, 0);

    const tooShort = evaluatePasswordStrength('Ab1!');
    assert.strictEqual(tooShort.level, 'weak');
    assert.strictEqual(tooShort.label, 'Too short');
    assert.strictEqual(tooShort.percent, 25);

    const weak = evaluatePasswordStrength('abcdef');
    assert.strictEqual(weak.level, 'weak');
    assert.strictEqual(weak.label, 'Weak');
    assert.strictEqual(weak.percent, 25);

    const fair = evaluatePasswordStrength('abcdefgh1');
    assert.strictEqual(fair.level, 'fair');
    assert.strictEqual(fair.percent, 50);

    const good = evaluatePasswordStrength('Abcdefgh1');
    assert.strictEqual(good.level, 'good');
    assert.strictEqual(good.percent, 75);

    const strong = evaluatePasswordStrength('AquaWatt#2026');
    assert.strictEqual(strong.level, 'strong');
    assert.strictEqual(strong.label, 'Strong');
    assert.strictEqual(strong.percent, 100);
    assert.strictEqual(strong.criteriaMetCount, 4);
  });
});

