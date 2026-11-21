import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Droplet,
  Zap,
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MarketingNavbar } from '../components/navigation/MarketingNavbar';
import { ToastContainer } from '../components/common/ToastContainer';
import { buildPostLoginRedirectPath } from '../utils/authRouteGuard';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, isSupabaseReady, authError, clearAuthError } = useApp();

  const [fullName, setFullName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const redirectTarget = buildPostLoginRedirectPath(location.state);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedFacility = facilityName.trim() || 'AquaWatt Facility Console';

    if (trimmedName.length < 2) {
      setLocalError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      email: trimmedEmail,
      password,
      fullName: trimmedName,
      facilityName: trimmedFacility,
    });
    setSubmitting(false);

    if (result.error) {
      setLocalError(result.error);
      return;
    }

    if (result.requiresEmailConfirmation) {
      setConfirmationEmail(trimmedEmail);
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
              Create your AquaWatt Account
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Provision your personal Supabase facility profile and ESP32 telemetry workspace.
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
                  <code className="font-mono">.env.local</code> before registering users.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white dark:bg-[#0D1524] border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-sm">
            {confirmationEmail ? (
              <div className="text-xs space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#237A57] shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      Check your inbox to verify
                    </h2>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                      We sent a Supabase confirmation link to{' '}
                      <span className="font-mono font-semibold">{confirmationEmail}</span>.
                      Once verified, sign in to access your facility console.
                    </p>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#174A8B] hover:bg-[#123A6F] text-white font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <>
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
                    <label htmlFor="signup-name" className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g. Ananya Rao"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-facility" className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Facility or Testbench Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-facility"
                        type="text"
                        value={facilityName}
                        onChange={e => setFacilityName(e.target.value)}
                        placeholder="e.g. Lab Bench #1 · ESP32 Rig"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#174A8B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-email"
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
                    <label htmlFor="signup-password" className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
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
                    <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Already registered?</span>
              <Link
                to="/login"
                state={location.state}
                className="font-semibold text-[#174A8B] dark:text-sky-400 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
