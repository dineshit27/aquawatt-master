import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AlertTriangle, Check, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ToastContainer } from '../common/ToastContainer';
import { BrandLogo } from '../common/BrandLogo';
import {
  buildPostLoginRedirectPath,
  evaluatePasswordStrength,
  type PasswordStrengthLevel,
} from '../../utils/authRouteGuard';

const AUTH_BACKDROP_SRC = '/src/assets/images/auth_water_backdrop_1795535944875.jpg';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export interface SplitAuthPageProps {
  mode: 'login' | 'signup';
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

const STRENGTH_BAR_CLASSES: Record<PasswordStrengthLevel, string> = {
  empty: 'bg-neutral-300 dark:bg-slate-700',
  weak: 'bg-rose-600 dark:bg-rose-500',
  fair: 'bg-amber-500 dark:bg-amber-400',
  good: 'bg-sky-600 dark:bg-sky-400',
  strong: 'bg-[#16A34A] dark:bg-emerald-400',
};

const STRENGTH_TEXT_CLASSES: Record<PasswordStrengthLevel, string> = {
  empty: 'text-neutral-500 dark:text-slate-400',
  weak: 'text-rose-700 dark:text-rose-300',
  fair: 'text-amber-700 dark:text-amber-300',
  good: 'text-sky-700 dark:text-sky-300',
  strong: 'text-[#16A34A] dark:text-emerald-400',
};

export const SplitAuthPage: React.FC<SplitAuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { signIn, signUp, signInWithOAuth, isSupabaseReady, authError, clearAuthError } = useApp();

  const isSignup = mode === 'signup';

  const [fullName, setFullName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'github' | null>(null);
  const oauthSubmitting = oauthProvider !== null;
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const redirectTarget = buildPostLoginRedirectPath(location.state);
  const cameFromProtected = Boolean(
    !isSignup && (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  );

  useEffect(() => {
    setLocalError(null);
    setConfirmationEmail(null);
    clearAuthError();
  }, [mode, clearAuthError]);

  useEffect(() => {
    if (!legalModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLegalModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [legalModal]);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLocalError(null);
    clearAuthError();
    setOauthProvider(provider);

    const result = await signInWithOAuth(
      provider,
      `${window.location.origin}${redirectTarget}`
    );

    if (result.error) {
      setLocalError(result.error);
      setOauthProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const trimmedEmail = email.trim();
    if (isSignup) {
      const trimmedName = fullName.trim();
      if (trimmedName.length < 2) {
        setLocalError('Please enter your full name (at least 2 characters).');
        return;
      }
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (isSignup && !acceptedTerms) {
      setLocalError('Please review and accept the Terms & Privacy terms to register.');
      return;
    }

    setSubmitting(true);

    if (isSignup) {
      const result = await signUp({
        email: trimmedEmail,
        password,
        fullName: fullName.trim(),
        facilityName: facilityName.trim() || 'AquaWatt Facility Console',
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
      return;
    }

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
    <div className="flex min-h-screen w-full flex-col bg-white dark:bg-[#070B13] font-sans text-neutral-950 dark:text-slate-100 antialiased selection:bg-blue-500/30 selection:text-neutral-900 dark:selection:text-white lg:flex-row">
      <ToastContainer />

      {/* Left Image Panel */}
      <aside className="relative flex w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#061529] via-[#0B2B57] to-[#114282] p-8 md:p-12 lg:w-1/2 min-h-[40vh] lg:min-h-screen">
        {!backdropFailed && (
          <img
            src={AUTH_BACKDROP_SRC}
            alt="Refractive deep blue water layers"
            referrerPolicy="no-referrer"
            onError={() => setBackdropFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Measured Contrast Scrim */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#040D1A]/85 via-[#071A33]/35 to-[#040D1A]/60"
        />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 text-base md:text-lg lg:text-xl font-semibold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white rounded-sm group"
          >
            <BrandLogo
              size="sm"
              decorative
              className="group-hover:scale-105 transition-transform"
            />
            <span>AquaWatt</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 min-h-[44px] px-2 text-xs md:text-sm lg:text-base font-medium text-white/90 transition-colors hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-md"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 shrink-0" />
            <span>Back to Website</span>
          </Link>
        </div>

        {/* Bottom Editorial Hero Content */}
        <div className="relative z-10 mt-12 lg:mt-0">
          <h1 className="mb-4 max-w-xl text-4xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl text-balance">
            Where Telemetry
            <br />
            Meets Conservation.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/90 sm:text-lg">
            AquaWatt empowers facility teams to monitor ESP32 hydraulic flow, surface baseline drift,
            and manage water and energy resources.
          </p>
        </div>
      </aside>

      {/* Right Form Panel */}
      <main className="flex w-full items-center justify-center p-6 sm:p-10 md:p-14 lg:w-1/2">
        <motion.div
          className="w-full max-w-[420px]"
          variants={containerVariants}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
        >
          {/* Heading */}
          <motion.div variants={itemVariants} className="mb-7">
            <h2 className="mb-2 text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              {isSignup ? 'Create your Account' : 'Sign in to your Account'}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-slate-400 leading-relaxed">
              {isSignup
                ? 'Provision your Supabase facility profile and ESP32 telemetry workspace.'
                : 'Access your facility telemetry console, analytics, and device streams.'}
            </p>
          </motion.div>

          {/* Supabase Config Notice */}
          {!isSupabaseReady && (
            <motion.div
              variants={itemVariants}
              role="status"
              className="mb-5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
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
            </motion.div>
          )}

          {/* Protected Route Redirect Banner */}
          {cameFromProtected && !activeError && (
            <motion.div
              variants={itemVariants}
              className="mb-5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/30 p-3 text-xs text-sky-900 dark:text-sky-200 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#174A8B] dark:text-sky-400 shrink-0" />
              <span>Authentication is required to open protected facility routes.</span>
            </motion.div>
          )}

          {confirmationEmail ? (
            <motion.div variants={itemVariants} className="space-y-5 text-sm">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#237A57] dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">
                    Check your inbox to verify
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                    We sent a Supabase confirmation link to{' '}
                    <span className="font-mono font-semibold">{confirmationEmail}</span>.
                    Once verified, sign in to access your facility console.
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                state={location.state}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-neutral-950 dark:bg-[#174A8B] text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:hover:bg-[#123A6F] whitespace-nowrap shrink-0"
              >
                Proceed to Sign In
              </Link>
            </motion.div>
          ) : (
            <>
              {/* OAuth Provider Buttons */}
              <motion.div variants={itemVariants} className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={submitting || oauthSubmitting}
                  aria-busy={oauthProvider === 'google'}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-sm font-medium text-neutral-900 dark:text-slate-100 transition-all hover:bg-neutral-50 hover:border-neutral-300 dark:hover:bg-slate-800/80 dark:hover:border-slate-600 active:scale-[0.99] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-sky-400"
                >
                  {oauthProvider === 'google' ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                  ) : (
                    <GoogleIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {oauthProvider === 'google'
                      ? 'Redirecting to Google...'
                      : isSignup
                      ? 'Sign up with Google'
                      : 'Login with Google'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={submitting || oauthSubmitting}
                  aria-busy={oauthProvider === 'github'}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-950 dark:bg-slate-800 text-sm font-medium text-white transition-all hover:bg-neutral-800 dark:hover:bg-slate-700 active:scale-[0.99] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-sky-400"
                >
                  {oauthProvider === 'github' ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                  ) : (
                    <GitHubIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {oauthProvider === 'github'
                      ? 'Connecting to GitHub...'
                      : isSignup
                      ? 'Sign up with GitHub'
                      : 'Login with GitHub'}
                  </span>
                </button>
              </motion.div>

              {/* Divider */}
              <motion.div variants={itemVariants} className="relative my-6 flex items-center">
                <div className="grow border-t border-neutral-200 dark:border-slate-800" />
                <span className="mx-4 shrink-0 text-xs text-neutral-400 dark:text-slate-500">or</span>
                <div className="grow border-t border-neutral-200 dark:border-slate-800" />
              </motion.div>

              {/* Active Error Alert */}
              {activeError && (
                <motion.div
                  variants={itemVariants}
                  role="alert"
                  className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{activeError}</span>
                </motion.div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {isSignup && (
                  <>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="signup-name"
                        className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-slate-300"
                      >
                        Name
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Enter your name"
                        className="h-11 w-full rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-500 transition-colors focus:border-neutral-900 dark:focus:border-sky-400 focus:outline-hidden"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="signup-facility"
                        className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-slate-300"
                      >
                        Facility or Testbench <span className="text-xs font-normal text-neutral-400 dark:text-slate-500">(optional)</span>
                      </label>
                      <input
                        id="signup-facility"
                        type="text"
                        value={facilityName}
                        onChange={e => setFacilityName(e.target.value)}
                        placeholder="e.g. Lab Bench #1 · ESP32 Rig"
                        className="h-11 w-full rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-500 transition-colors focus:border-neutral-900 dark:focus:border-sky-400 focus:outline-hidden"
                      />
                    </motion.div>
                  </>
                )}

                <motion.div variants={itemVariants}>
                  <label
                    htmlFor={isSignup ? 'signup-email' : 'login-email'}
                    className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-slate-300"
                  >
                    Email
                  </label>
                  <input
                    id={isSignup ? 'signup-email' : 'login-email'}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-11 w-full rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-500 transition-colors focus:border-neutral-900 dark:focus:border-sky-400 focus:outline-hidden"
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label
                    htmlFor={isSignup ? 'signup-password' : 'login-password'}
                    className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id={isSignup ? 'signup-password' : 'login-password'}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      aria-describedby={isSignup ? 'signup-password-strength' : undefined}
                      placeholder={isSignup ? 'Minimum 6 characters' : 'Enter your password'}
                      className="h-11 w-full rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 pl-3.5 pr-11 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-500 transition-colors focus:border-neutral-900 dark:focus:border-sky-400 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-sky-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {isSignup && (() => {
                    const strength = evaluatePasswordStrength(password);
                    return (
                      <div id="signup-password-strength" className="mt-2.5 space-y-2" aria-live="polite">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-500 dark:text-slate-400">
                            Password strength
                          </span>
                          <span className={`font-medium tabular-nums ${STRENGTH_TEXT_CLASSES[strength.level]}`}>
                            {strength.label}
                            {password.length > 0 ? ` · ${strength.percent}%` : ''}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label="Password strength"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={strength.percent}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-slate-800"
                        >
                          <div
                            className={`h-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none ${STRENGTH_BAR_CLASSES[strength.level]}`}
                            style={{ transform: `scaleX(${strength.percent / 100})` }}
                          />
                        </div>
                        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5 text-[11px]">
                          {strength.criteria.map(item => (
                            <li
                              key={item.id}
                              className={`flex items-center gap-1.5 transition-colors ${
                                item.met
                                  ? 'text-neutral-900 dark:text-slate-100 font-medium'
                                  : 'text-neutral-400 dark:text-slate-500'
                              }`}
                            >
                              <Check
                                aria-hidden="true"
                                className={`h-3 w-3 shrink-0 ${
                                  item.met
                                    ? 'text-[#16A34A] dark:text-emerald-400'
                                    : 'text-neutral-300 dark:text-slate-600'
                                }`}
                              />
                              <span>{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </motion.div>

                {isSignup && (
                  <motion.div variants={itemVariants} className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-neutral-300 dark:border-slate-600 accent-neutral-950 dark:accent-sky-400 focus:ring-neutral-950 cursor-pointer"
                    />
                    <label
                      htmlFor="terms"
                      className="text-xs leading-relaxed text-neutral-500 dark:text-slate-400 select-none"
                    >
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setLegalModal('terms')}
                        className="font-semibold text-neutral-950 dark:text-white hover:underline cursor-pointer"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => setLegalModal('privacy')}
                        className="font-semibold text-neutral-950 dark:text-white hover:underline cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                    </label>
                  </motion.div>
                )}

                <motion.button
                  variants={itemVariants}
                  type="submit"
                  disabled={submitting || oauthSubmitting}
                  className="mt-2 h-11 w-full rounded-lg bg-neutral-950 dark:bg-[#174A8B] text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:hover:bg-[#123A6F] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-sky-400"
                >
                  {submitting
                    ? isSignup
                      ? 'Creating account...'
                      : 'Signing in...'
                    : isSignup
                    ? 'Sign Up'
                    : 'Sign In'}
                </motion.button>
              </form>

              {/* Mode Switch Link */}
              <motion.p
                variants={itemVariants}
                className="mt-6 text-center text-xs text-neutral-500 dark:text-slate-400"
              >
                {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                <Link
                  to={isSignup ? '/login' : '/signup'}
                  state={location.state}
                  className="font-semibold text-neutral-950 dark:text-white hover:underline"
                >
                  {isSignup ? 'Log in' : 'Create an account'}
                </Link>
              </motion.p>
            </>
          )}

          {/* Security Footer */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-center text-[11px] font-mono text-neutral-400 dark:text-slate-500"
          >
            Session secured via Supabase Auth · Row Level Security active
          </motion.p>
        </motion.div>
      </main>

      {/* Accessible Terms / Privacy Summary Modal */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-legal-title"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-[#0D1524] p-6 text-neutral-900 dark:text-slate-100 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 id="auth-legal-title" className="text-base font-semibold">
                {legalModal === 'terms' ? 'AquaWatt Platform Terms' : 'Telemetry Privacy Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close modal"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-neutral-600 dark:text-slate-300">
              {legalModal === 'terms'
                ? 'AquaWatt provides ESP32 + FS-S401 facility flow monitoring, analytics, and isolated workspace environments. Demo simulation modes generate synthetic baselines for evaluation and are kept strictly separate from verified physical Supabase hardware records.'
                : 'Account sessions are managed via Supabase Auth with PostgreSQL Row Level Security (RLS). Your facility profile, device metadata, and sensor readings remain scoped exclusively to your authenticated user ID.'}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Link
                to="/contact"
                className="inline-flex h-9 items-center px-3 text-xs font-medium text-neutral-600 dark:text-slate-300 hover:underline whitespace-nowrap shrink-0"
              >
                Contact Support
              </Link>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="inline-flex h-9 items-center rounded-lg bg-neutral-950 dark:bg-[#174A8B] px-4 text-xs font-medium text-white hover:bg-neutral-800 dark:hover:bg-[#123A6F] cursor-pointer whitespace-nowrap shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
