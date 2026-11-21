import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Droplet, Zap, Lock, Mail, Eye, EyeOff, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MarketingNavbar } from '../components/navigation/MarketingNavbar';
import { ToastContainer } from '../components/common/ToastContainer';
import { buildPostLoginRedirectPath } from '../utils/authRouteGuard';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isSupabaseReady, authError, clearAuthError } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const redirectTarget = buildPostLoginRedirectPath(location.state);
  const cameFromProtected = Boolean(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(trimmedEmail, password);
    setSubmitting(false);

    if (result.error) {
      setLocalError(result.error);
      return;
    }

    navigate(redirectTarget, { replace: true });
  };

  const activeError = localError || authError;

  return (
    <div className="min-h-screen bg-[#F7F9FB] dark:bg-[#070B13] text-[#17263F] dark:text-[#E2E8F0] flex flex-col">
      <MarketingNavbar />
      <ToastContainer />

      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#174A8B] text-white shadow-sm mb-3">
              <div className="relative flex items-center justify-center">
                <Droplet className="w-5 h-5 fill-white/80" />
                <Zap className="w-3 h-3 absolute -top-1 -right-1.5 text-emerald-300 fill-emerald-300" />
              </div>
            </div>
            <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
              Sign in to AquaWatt
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Access your facility telemetry console, analytics, and device streams.
            </p>
          </div>

          {!isSupabaseReady && (
            <div
              role="status"
              className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Supabase Auth Not Configured</p>
                <p className="mt-0.5 leading-relaxed opacity-90">
                  Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
                  <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in{' '}
                  <code className="font-mono">.env.local</code> to enable account sign-in.
                </p>
              </div>
            </div>
          )}

          {cameFromProtected && !activeError && (
            <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/30 p-3 text-xs text-sky-900 dark:text-sky-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#174A8B] dark:text-sky-400 shrink-0" />
              <span>Authentication is required to open protected facility routes.</span>
            </div>
          )}

          <div className="rounded-2xl bg-white dark:bg-[#0D1524] border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-sm">
            {activeError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{activeError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              <div>
                <label htmlFor="login-email" className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="operator@facility.org"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#174A8B] hover:bg-[#123A6F] disabled:opacity-60 text-white font-semibold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>New to AquaWatt?</span>
              <Link
                to="/signup"
                state={location.state}
                className="font-semibold text-[#174A8B] dark:text-sky-400 hover:underline"
              >
                Create an account
              </Link>
            </div>
          </div>

          <p className="text-center text-[11px] font-mono text-slate-400">
            Session secured via Supabase Auth · Row Level Security active
          </p>
        </div>
      </main>
    </div>
  );
};
