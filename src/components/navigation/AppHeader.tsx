import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { AnimatedThemeToggler } from '../ui/animated-theme-toggler';
import NotificationStack, { type StackNotification } from '../ui/notification-stack';
import ProfileDropdown, {
  type Account,
  type AccountTheme,
  type ProfileMenuItem,
} from '../ui/profile-dropdown';
import {
  Bell,
  Play,
  Pause,
  Building2,
  AlertTriangle,
  Menu,
  X,
  Droplet,
  Zap,
  LayoutDashboard,
  BarChart3,
  Users2,
  CreditCard,
  Headphones,
  Database,
  Sparkles,
  Award,
} from 'lucide-react';
import { DashboardAssistantDrawer } from '../dashboard/DashboardAssistantDrawer';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle }) => {
  const { theme, setTheme } = useTheme();
  const {
    user,
    isSimulatingLive,
    toggleLiveSimulation,
    alerts,
    markAlertAsRead,
    activeUnreadAlertsCount,
    currentPlanId,
    telemetrySourceMode,
    refreshPhysicalTelemetry,
    showToast,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [stackVersion, setStackVersion] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAssistantOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const handleOpenAssistant = () => setAssistantOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('aquawatt:open-assistant', handleOpenAssistant);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('aquawatt:open-assistant', handleOpenAssistant);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => document.removeEventListener('mousedown', handlePointerDownOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => document.removeEventListener('mousedown', handlePointerDownOutside);
  }, [notificationsOpen]);

  const stackNotifications: StackNotification[] = useMemo(
    () =>
      alerts
        .filter(alert => !dismissedIds.has(alert.id))
        .slice(0, 6)
        .map(alert => ({
          id: alert.id,
          app: alert.resource === 'water' ? 'Water Telemetry' : 'Power Telemetry',
          title: alert.title,
          body: `${alert.description}${alert.location ? ` · ${alert.location}` : ''}`,
          time: alert.timestamp,
          icon:
            alert.severity === 'critical' ? (
              <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500 text-white">
                <AlertTriangle className="size-4" />
              </span>
            ) : alert.severity === 'warning' ? (
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                <AlertTriangle className="size-4" />
              </span>
            ) : alert.resource === 'water' ? (
              <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500 text-white">
                <Droplet className="size-4" />
              </span>
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <Zap className="size-4" />
              </span>
            ),
        })),
    [alerts, dismissedIds]
  );

  const handleDismissNotification = (id: string) => {
    markAlertAsRead(id);
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const profileAccounts: Account[] = useMemo(
    () => [
      {
        id: 'usr_8492',
        name: user.fullName,
        email: user.email,
        plan: user.tier,
        avatarUrl: user.avatarUrl,
      },
      {
        id: 'facility_ops',
        name: user.facilityName,
        email: 'ops@aquawatt.io',
        plan: currentPlanId.toUpperCase(),
      },
      {
        id: 'esp32_bench',
        name: 'ESP32 Lab Node',
        email: 'node01@aquawatt.io',
        plan: 'Gateway',
      },
    ],
    [user.fullName, user.email, user.tier, user.avatarUrl, user.facilityName, currentPlanId]
  );

  const profileItems: ProfileMenuItem[] = useMemo(
    () => [
      {
        label: `Subscription (${currentPlanId})`,
        icon: <CreditCard className="size-4" />,
        value: user.tier,
        onSelect: () => navigate('/subscription'),
      },
      {
        label: 'Eco Rank & Milestones',
        icon: <Award className="size-4" />,
        value: `${user.sustainabilityScore}/100`,
        onSelect: () => navigate('/community'),
      },
      {
        label: 'Support & Diagnostics',
        icon: <Headphones className="size-4" />,
        onSelect: () => navigate('/contact'),
      },
      {
        label: 'Facility Assistant',
        icon: <Sparkles className="size-4" />,
        value: '⌘J',
        onSelect: () => setAssistantOpen(true),
      },
    ],
    [currentPlanId, user.tier, user.sustainabilityScore, navigate]
  );

  const handleProfileThemeChange = (nextTheme: AccountTheme) => {
    if (nextTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      return;
    }
    setTheme(nextTheme);
  };

  const getPageTitle = () => {
    if (title) return title;
    switch (location.pathname) {
      case '/dashboard':
        return 'Facility Control Console';
      case '/analytics':
        return 'Consumption & Cost Analytics';
      case '/community':
        return 'Conservation Community & Challenges';
      case '/subscription':
        return 'Plan & Telemetry Subscriptions';
      case '/contact':
        return 'Technical Support & Operations';
      default:
        return 'AquaWatt Enterprise';
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/community', label: 'Community', icon: Users2 },
    { to: '/subscription', label: 'Subscription', icon: CreditCard },
    { to: '/contact', label: 'Contact & Support', icon: Headphones },
  ];

  return (
    <header
      ref={headerRef}
      className="h-16 bg-white dark:bg-[#0D1524] border-b border-slate-200/80 dark:border-slate-800/80 px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-20"
    >
      {/* Left: Mobile menu button + Title & facility metadata */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="app-mobile-nav"
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-800 shrink-0 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <Link to="/" aria-label="AquaWatt Home" className="md:hidden flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#174A8B] flex items-center justify-center text-white">
              <Droplet className="w-3.5 h-3.5 fill-white" />
            </div>
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white font-heading tracking-tight truncate">
              {getPageTitle()}
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 truncate">
                <Building2 className="w-3 h-3 text-[#174A8B] dark:text-sky-400 shrink-0" />
                {user.facilityName}
              </span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                ESP32-NODE-01
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls: Telemetry Simulator, Notifications, Theme, Profile */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
        {/* Telemetry Source & Live Stream Indicator */}
        {telemetrySourceMode === 'physical' ? (
          <button
            type="button"
            onClick={refreshPhysicalTelemetry}
            aria-label="Refresh physical Supabase telemetry"
            title="Physical Mode: Connected to Supabase. Click to refresh live database records."
            className="min-w-9 min-h-9 sm:min-w-0 flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-mono font-medium border transition-colors cursor-pointer bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="hidden sm:inline">PHYSICAL (SUPABASE)</span>
            <Database className="w-3.5 h-3.5 text-blue-500" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleLiveSimulation}
            aria-label={isSimulatingLive ? 'Pause simulated sensor stream' : 'Resume simulated sensor stream'}
            aria-pressed={isSimulatingLive}
            title={isSimulatingLive ? 'Pause simulated sensor stream (Demo)' : 'Resume simulated sensor stream (Demo)'}
            className={`min-w-9 min-h-9 sm:min-w-0 flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md text-xs font-mono font-medium border transition-colors cursor-pointer ${
              isSimulatingLive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#237A57] dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSimulatingLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">DEMO STREAM</span>
                <Pause className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="hidden sm:inline">STREAM PAUSED</span>
                <Play className="w-3.5 h-3.5 text-slate-500" />
              </>
            )}
          </button>
        )}

        {/* AI Assistant Trigger Button */}
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-label="Open AquaWatt Facility Assistant"
          title="Open AquaWatt Facility Assistant (⌘J / Ctrl+J)"
          className="min-w-9 min-h-9 sm:min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700/90 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline font-sans font-semibold">Assistant</span>
          <kbd className="hidden md:inline-block px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-400">
            ⌘J
          </kbd>
        </button>

        {/* Notifications Popover Trigger */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(prev => !prev)}
            aria-label="View notifications"
            aria-expanded={notificationsOpen}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {activeUnreadAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute -right-14 sm:right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] sm:w-96 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2">
              <NotificationStack
                key={stackVersion}
                notifications={stackNotifications}
                onDismiss={handleDismissNotification}
                className="max-w-none"
              />
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {dismissedIds.size > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDismissedIds(new Set());
                      setStackVersion(v => v + 1);
                    }}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Restore dismissed
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400">
                    Swipe or hover to expand
                  </span>
                )}
                <Link
                  to="/dashboard"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-[#174A8B] dark:text-sky-400 font-medium hover:underline"
                >
                  View all alerts →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <AnimatedThemeToggler
          theme={theme}
          onThemeChange={setTheme}
          duration={450}
          aria-label="Toggle color theme"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        />

        {/* User Profile dropdown */}
        <ProfileDropdown
          accounts={profileAccounts}
          compactTriggerOnMobile
          defaultAccountId="usr_8492"
          items={profileItems}
          onAccountChange={account =>
            showToast(`Switched active context to ${account.name}`, 'info')
          }
          onAddAccount={() => navigate('/contact')}
          onSignOut={() => {
            showToast('Signed out of Facility Console', 'info');
            navigate('/');
          }}
          onThemeChange={handleProfileThemeChange}
          theme={theme}
          triggerClassName="w-[50px] sm:w-48 lg:w-56 min-h-9 py-1 px-1.5 sm:py-1.5 sm:px-2 sm:pr-2.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1524]"
        />
      </div>

      {/* Mobile Drawer Menu for App Layout */}
      {mobileMenuOpen && (
        <nav
          id="app-mobile-nav"
          aria-label="Mobile Facility Navigation"
          className="md:hidden fixed top-16 left-0 right-0 bg-white/95 dark:bg-[#0D1524]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 space-y-2 z-40 shadow-lg"
        >
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-[#174A8B]/10 text-[#174A8B] dark:text-sky-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Slide-over Assistant Drawer */}
      <DashboardAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </header>
  );
};
