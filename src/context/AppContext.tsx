import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  UserProfile,
  WaterReading,
  ElectricityReading,
  SensorDevice,
  ConsumptionAlert,
  AIRecommendation,
  CommunityChallenge,
  TelemetryDataSourceMode,
} from '../types';
import { COMMUNITY_CHALLENGES } from '../data/mockData';
import { telemetryService } from '../services/telemetryService';
import { supabaseTelemetryService } from '../services/supabaseTelemetryService';
import { setDevBearerToken } from '../services/assistantApiClient';
import {
  supabase,
  isSupabaseConfigured,
  checkSupabaseConnection,
  type ProfileRow,
} from '../lib/supabase';
import {
  mapSupabaseAuthUserToProfile,
  normalizeAuthErrorMessage,
} from '../utils/authRouteGuard';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'alert';
  timestamp: number;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  facilityName: string;
}

interface AppContextType {
  session: Session | null;
  authUser: SupabaseAuthUser | null;
  authLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  signInWithOAuth: (provider: 'google' | 'github', redirectTo?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  waterReading: WaterReading;
  electricityReading: ElectricityReading;
  devices: SensorDevice[];
  alerts: ConsumptionAlert[];
  recommendations: AIRecommendation[];
  challenges: CommunityChallenge[];
  currentPlanId: 'free' | 'standard' | 'premium';
  isSimulatingLive: boolean;
  toasts: ToastNotification[];
  // Phase 2 Supabase Data Source
  telemetrySourceMode: TelemetryDataSourceMode;
  isSupabaseReady: boolean;
  physicalLoading: boolean;
  physicalError: string | null;
  hasPhysicalData: boolean;
  setTelemetrySourceMode: (mode: TelemetryDataSourceMode) => void;
  refreshPhysicalTelemetry: () => Promise<void>;
  toggleLiveSimulation: () => void;
  markAlertAsRead: (id: string) => void;
  resolveAlert: (id: string) => void;
  applyRecommendation: (id: string) => void;
  dismissRecommendation: (id: string) => void;
  toggleDeviceStatus: (id: string) => void;
  joinChallenge: (id: string) => void;
  recordChallengeCheckIn: (id: string) => void;
  changeSubscriptionPlan: (planId: 'free' | 'standard' | 'premium') => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'alert') => void;
  removeToast: (id: string) => void;
  activeUnreadAlertsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [waterReading, setWaterReading] = useState<WaterReading>(telemetryService.getInitialWaterReading());
  const [electricityReading, setElectricityReading] = useState<ElectricityReading>(telemetryService.getInitialElectricityReading());
  const [devices, setDevices] = useState<SensorDevice[]>(telemetryService.getSensorNodes());
  const [alerts, setAlerts] = useState<ConsumptionAlert[]>(telemetryService.getInitialAlerts());
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(telemetryService.getInitialRecommendations());
  const [challenges, setChallenges] = useState<CommunityChallenge[]>(COMMUNITY_CHALLENGES);
  const [currentPlanId, setCurrentPlanId] = useState<'free' | 'standard' | 'premium'>('standard');
  const [isSimulatingLive, setIsSimulatingLive] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Telemetry Data Source Mode ('demo' vs 'physical')
  const [telemetrySourceMode, setTelemetrySourceModeState] = useState<TelemetryDataSourceMode>('demo');
  const [physicalLoading, setPhysicalLoading] = useState<boolean>(false);
  const [physicalError, setPhysicalError] = useState<string | null>(null);
  const [hasPhysicalData, setHasPhysicalData] = useState<boolean>(false);

  const isSupabaseReady = isSupabaseConfigured();
  const authUser = session?.user ?? null;
  const isAuthenticated = Boolean(session?.user);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'alert' = 'info') => {
    const newToast: ToastNotification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: Date.now(),
    };
    setToasts(prev => [...prev.slice(-3), newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Auto-remove toasts after 4.5s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts]);

  const loadOrProvisionProfile = useCallback(async (verifiedUser: SupabaseAuthUser): Promise<UserProfile> => {
    if (!supabase) {
      return mapSupabaseAuthUserToProfile(verifiedUser, null);
    }

    try {
      const { data: existingProfile, error: selectErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', verifiedUser.id)
        .maybeSingle();

      if (!selectErr && existingProfile) {
        return mapSupabaseAuthUserToProfile(verifiedUser, existingProfile as ProfileRow);
      }

      const meta = (verifiedUser.user_metadata || {}) as Record<string, unknown>;
      const derivedFullName =
        (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
        (typeof meta.name === 'string' && meta.name.trim()) ||
        (typeof meta.user_name === 'string' && meta.user_name.trim()) ||
        (typeof meta.preferred_username === 'string' && meta.preferred_username.trim()) ||
        (verifiedUser.email || '').split('@')[0] ||
        'AquaWatt Operator';
      const derivedFacilityName =
        typeof meta.facility_name === 'string' && meta.facility_name.trim()
          ? meta.facility_name.trim()
          : 'AquaWatt Facility Console';
      const derivedAvatarUrl =
        typeof meta.avatar_url === 'string' && meta.avatar_url.trim() ? meta.avatar_url.trim() : null;

      const { data: createdProfile } = await supabase
        .from('profiles')
        .upsert(
          {
            id: verifiedUser.id,
            email: verifiedUser.email ?? null,
            full_name: derivedFullName,
            facility_name: derivedFacilityName,
            avatar_url: derivedAvatarUrl,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .maybeSingle();

      return mapSupabaseAuthUserToProfile(verifiedUser, (createdProfile as ProfileRow | null) ?? null);
    } catch {
      return mapSupabaseAuthUserToProfile(verifiedUser, null);
    }
  }, []);

  // Restore Supabase session on mount & listen for auth state changes
  useEffect(() => {
    let active = true;

    const client = supabase;
    if (!client || !isSupabaseConfigured()) {
      setSession(null);
      setUser(null);
      setAuthLoading(false);
      return;
    }

    const restoreSession = async () => {
      try {
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const oauthErrDesc =
            searchParams.get('error_description') ||
            hashParams.get('error_description') ||
            searchParams.get('error') ||
            hashParams.get('error');
          if (oauthErrDesc && active) {
            setAuthError(normalizeAuthErrorMessage(oauthErrDesc));
          }
        }

        const { data, error } = await client.auth.getSession();
        if (!active) return;

        if (error) {
          setAuthError(normalizeAuthErrorMessage(error));
          await client.auth.signOut({ scope: 'local' }).catch(() => {});
          setSession(null);
          setUser(null);
          setAuthLoading(false);
          return;
        }

        const currentSession = data.session;
        if (currentSession?.user) {
          setSession(currentSession);
          const profile = await loadOrProvisionProfile(currentSession.user);
          if (active) {
            setUser(profile);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        if (active) {
          setAuthError(normalizeAuthErrorMessage(err));
          setSession(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    };

    restoreSession();

    const { data: authListener } = client.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;

      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        setSession(null);
        setUser(null);
        setDevBearerToken(null);
        setHasPhysicalData(false);
        setPhysicalError(null);
        setPhysicalLoading(false);
        setDevices(telemetryService.getSensorNodes());
        setAlerts(telemetryService.getInitialAlerts());
        setRecommendations(telemetryService.getInitialRecommendations());
        setAuthLoading(false);
        return;
      }

      setSession(nextSession);
      setAuthError(null);
      const profile = await loadOrProvisionProfile(nextSession.user);
      if (active) {
        setUser(profile);
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadOrProvisionProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase || !isSupabaseConfigured()) {
      const msg = 'Supabase credentials are not configured in .env.local.';
      setAuthError(msg);
      return { error: msg };
    }

    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = normalizeAuthErrorMessage(error);
        setAuthError(msg);
        return { error: msg };
      }

      if (data.session?.user) {
        setSession(data.session);
        const profile = await loadOrProvisionProfile(data.session.user);
        setUser(profile);
        showToast(`Signed in as ${profile.fullName}`, 'success');
      }
      return {};
    } catch (err) {
      const msg = normalizeAuthErrorMessage(err);
      setAuthError(msg);
      return { error: msg };
    }
  }, [loadOrProvisionProfile, showToast]);

  const signUp = useCallback(
    async ({
      email,
      password,
      fullName,
      facilityName,
    }: SignUpParams): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> => {
      if (!supabase || !isSupabaseConfigured()) {
        const msg = 'Supabase credentials are not configured in .env.local.';
        setAuthError(msg);
        return { error: msg };
      }

      setAuthError(null);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              facility_name: facilityName,
            },
          },
        });

        if (error) {
          const msg = normalizeAuthErrorMessage(error);
          setAuthError(msg);
          return { error: msg };
        }

        if (data.session?.user) {
          setSession(data.session);
          const profile = await loadOrProvisionProfile(data.session.user);
          setUser(profile);
          showToast(`Welcome to AquaWatt, ${profile.fullName}`, 'success');
          return { requiresEmailConfirmation: false };
        }

        return { requiresEmailConfirmation: true };
      } catch (err) {
        const msg = normalizeAuthErrorMessage(err);
        setAuthError(msg);
        return { error: msg };
      }
    },
    [loadOrProvisionProfile, showToast]
  );

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github', redirectTo?: string): Promise<{ error?: string }> => {
      if (!supabase || !isSupabaseConfigured()) {
        const msg = 'Supabase credentials are not configured in .env.local.';
        setAuthError(msg);
        showToast(msg, 'warning');
        return { error: msg };
      }

      setAuthError(null);
      try {
        const targetUrl =
          redirectTo ||
          (typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined);
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: targetUrl,
            ...(provider === 'github' ? { scopes: 'read:user user:email' } : {}),
          },
        });

        if (error) {
          const msg = normalizeAuthErrorMessage(error);
          setAuthError(msg);
          return { error: msg };
        }

        if (data?.url && typeof window !== 'undefined') {
          window.location.assign(data.url);
        }

        return {};
      } catch (err) {
        const msg = normalizeAuthErrorMessage(err);
        setAuthError(msg);
        return { error: msg };
      }
    },
    [showToast]
  );

  const signOut = useCallback(async () => {
    setDevBearerToken(null);
    setAuthError(null);
    setTelemetrySourceModeState('demo');
    setPhysicalLoading(false);
    setPhysicalError(null);
    setHasPhysicalData(false);

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AquaWatt] Error signing out of Supabase:', err);
      }
    }

    setSession(null);
    setUser(null);
    showToast('Signed out of AquaWatt session', 'info');
  }, [showToast]);

  // Keep latest readings in refs for predictable simulation ticks without nested updaters
  const waterRef = useRef(waterReading);
  waterRef.current = waterReading;
  const electricityRef = useRef(electricityReading);
  electricityRef.current = electricityReading;
  const lastRealtimeToastRef = useRef<number>(0);
  const telemetrySourceModeRef = useRef<TelemetryDataSourceMode>(telemetrySourceMode);
  telemetrySourceModeRef.current = telemetrySourceMode;
  const physicalFetchEpochRef = useRef<number>(0);

  // Live sensor simulation ticks (ONLY active when authenticated, simulating, and in demo mode)
  useEffect(() => {
    if (!isAuthenticated || !isSimulatingLive || telemetrySourceMode !== 'demo') return;

    const interval = setInterval(() => {
      const { nextWater, nextPower } = telemetryService.createSimulatedJitter(
        waterRef.current,
        electricityRef.current
      );
      setWaterReading(nextWater);
      setElectricityReading(nextPower);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isSimulatingLive, telemetrySourceMode]);

  // Fetch real physical telemetry from Supabase (session-scoped via RLS)
  const refreshPhysicalTelemetry = useCallback(async () => {
    const requestEpoch = ++physicalFetchEpochRef.current;

    if (!isAuthenticated || !session?.user) {
      if (telemetrySourceModeRef.current !== 'physical') return;
      setPhysicalError('Authentication required to query physical Supabase telemetry.');
      setPhysicalLoading(false);
      setHasPhysicalData(false);
      setWaterReading(supabaseTelemetryService.getInitialWaterReading());
      setElectricityReading(supabaseTelemetryService.getInitialElectricityReading());
      setDevices([]);
      setAlerts([]);
      setRecommendations([]);
      return;
    }

    if (!isSupabaseConfigured()) {
      if (telemetrySourceModeRef.current !== 'physical') return;
      setPhysicalError(
        'Supabase URL or Anon Key is missing or set to placeholder. Please add your credentials to .env.local.'
      );
      setPhysicalLoading(false);
      setHasPhysicalData(false);
      setWaterReading(supabaseTelemetryService.getInitialWaterReading());
      setElectricityReading(supabaseTelemetryService.getInitialElectricityReading());
      setDevices([]);
      setAlerts([]);
      setRecommendations([]);
      return;
    }

    setPhysicalLoading(true);
    setPhysicalError(null);

    try {
      const connectionCheck = await checkSupabaseConnection();
      if (telemetrySourceModeRef.current !== 'physical' || physicalFetchEpochRef.current !== requestEpoch) {
        return;
      }

      if (!connectionCheck.isReachable) {
        setPhysicalError(`${connectionCheck.message}${connectionCheck.error ? ` Details: ${connectionCheck.error}` : ''}`);
        setHasPhysicalData(false);
        setWaterReading(supabaseTelemetryService.getInitialWaterReading());
        setElectricityReading(supabaseTelemetryService.getInitialElectricityReading());
        setDevices([]);
        setAlerts([]);
        setRecommendations([]);
        return;
      }

      const [readingsRes, devicesRes, alertsRes] = await Promise.all([
        supabaseTelemetryService.fetchLatestReading(),
        supabaseTelemetryService.fetchDevices(),
        supabaseTelemetryService.fetchAlerts(),
      ]);

      if (telemetrySourceModeRef.current !== 'physical' || physicalFetchEpochRef.current !== requestEpoch) {
        return;
      }

      if (readingsRes.water || readingsRes.electricity) {
        setHasPhysicalData(true);
        if (readingsRes.water) setWaterReading(readingsRes.water);
        if (readingsRes.electricity) setElectricityReading(readingsRes.electricity);
      } else {
        setHasPhysicalData(false);
        setWaterReading(supabaseTelemetryService.getInitialWaterReading());
        setElectricityReading(supabaseTelemetryService.getInitialElectricityReading());
      }

      setDevices(devicesRes);
      setAlerts(alertsRes);
      setRecommendations([]);
    } catch (err: any) {
      if (telemetrySourceModeRef.current !== 'physical' || physicalFetchEpochRef.current !== requestEpoch) {
        return;
      }
      console.error('[AquaWatt] Error fetching physical telemetry:', err);
      setPhysicalError(err.message || 'Failed to load physical telemetry records from Supabase.');
      setHasPhysicalData(false);
      setAlerts([]);
      setRecommendations([]);
    } finally {
      if (physicalFetchEpochRef.current === requestEpoch) {
        setPhysicalLoading(false);
      }
    }
  }, [isAuthenticated, session?.user]);

  // Handle switching between Demo Telemetry and Physical Hardware Mode
  const setTelemetrySourceMode = useCallback(
    (mode: TelemetryDataSourceMode) => {
      telemetrySourceModeRef.current = mode;
      physicalFetchEpochRef.current += 1;
      setTelemetrySourceModeState(mode);

      if (mode === 'physical') {
        setIsSimulatingLive(false);
        setAlerts([]);
        setRecommendations([]);

        if (!isSupabaseConfigured()) {
          setPhysicalError(
            'Supabase credentials unconfigured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to connect physical hardware.'
          );
          setHasPhysicalData(false);
          setWaterReading(supabaseTelemetryService.getInitialWaterReading());
          setElectricityReading(supabaseTelemetryService.getInitialElectricityReading());
          setDevices([]);
          showToast(
            'Physical Mode: Supabase unconfigured. Please configure .env.local and execute /supabase/schema.sql.',
            'warning'
          );
        } else {
          showToast('Switched to Physical Hardware Mode (Supabase Connected)', 'info');
          refreshPhysicalTelemetry();
        }
      } else {
        setPhysicalLoading(false);
        setPhysicalError(null);
        setHasPhysicalData(false);
        setWaterReading(telemetryService.getInitialWaterReading());
        setElectricityReading(telemetryService.getInitialElectricityReading());
        setDevices(telemetryService.getSensorNodes());
        setAlerts(telemetryService.getInitialAlerts());
        setRecommendations(telemetryService.getInitialRecommendations());
        setIsSimulatingLive(true);
        showToast('Switched to Demo Telemetry Mode (Simulated ESP32 Feeds)', 'info');
      }
    },
    [refreshPhysicalTelemetry, showToast]
  );

  // Subscribe to physical telemetry in real-time when authenticated & physical mode is active
  useEffect(() => {
    if (!isAuthenticated || telemetrySourceMode !== 'physical' || !isSupabaseConfigured()) {
      return;
    }

    refreshPhysicalTelemetry();

    const unsubscribe = supabaseTelemetryService.subscribeToTelemetry(newData => {
      if (newData.water) {
        setWaterReading(newData.water);
        setHasPhysicalData(true);
      }
      if (newData.electricity) {
        setElectricityReading(newData.electricity);
        setHasPhysicalData(true);
      }
      const now = Date.now();
      if (now - lastRealtimeToastRef.current >= 15000) {
        lastRealtimeToastRef.current = now;
        showToast('Incoming physical ESP32 telemetry ingested via Supabase', 'info');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, telemetrySourceMode, refreshPhysicalTelemetry, showToast]);

  const toggleLiveSimulation = useCallback(() => {
    if (telemetrySourceMode === 'physical') {
      showToast(
        'Physical mode is driven by real Supabase database events. Use Demo mode to toggle synthetic ticker.',
        'info'
      );
      return;
    }
    setIsSimulatingLive(prev => {
      const next = !prev;
      showToast(next ? 'Live telemetry simulation resumed' : 'Live telemetry stream paused', 'info');
      return next;
    });
  }, [telemetrySourceMode, showToast]);

  const markAlertAsRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, isRead: true } : a)));
  }, []);

  const resolveAlert = useCallback(
    (id: string) => {
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, isResolved: true, isRead: true } : a)));
      showToast('Alert resolved and marked closed', 'success');
    },
    [showToast]
  );

  const applyRecommendation = useCallback(
    (id: string) => {
      setRecommendations(prev => prev.map(r => (r.id === id ? { ...r, status: 'applied' } : r)));
      setUser(prev =>
        prev
          ? {
              ...prev,
              sustainabilityScore: Math.min(100, prev.sustainabilityScore + 2),
            }
          : prev
      );
      showToast('AI conservation schedule applied! Eco Score +2', 'success');
    },
    [showToast]
  );

  const dismissRecommendation = useCallback(
    (id: string) => {
      setRecommendations(prev => prev.map(r => (r.id === id ? { ...r, status: 'dismissed' } : r)));
      showToast('Recommendation dismissed', 'info');
    },
    [showToast]
  );

  const toggleDeviceStatus = useCallback(
    (id: string) => {
      setDevices(prev =>
        prev.map(d => {
          if (d.id === id) {
            const nextStatus = d.status === 'online' ? 'standby' : 'online';
            showToast(
              d.isSimulated
                ? `(Demo Simulation) ${d.name} virtual state set to ${nextStatus}. Physical ESP32 relay unlinked.`
                : `(Physical Node) ${d.name} state set to ${nextStatus}.`,
              'info'
            );
            return { ...d, status: nextStatus };
          }
          return d;
        })
      );
    },
    [showToast]
  );

  const joinChallenge = useCallback(
    (id: string) => {
      setChallenges(prev =>
        prev.map(c => {
          if (c.id === id) {
            showToast(`Joined challenge: ${c.title}! (Demo)`, 'success');
            return { ...c, status: 'in_progress', participantsCount: c.participantsCount + 1, userProgressPercent: 12 };
          }
          return c;
        })
      );
    },
    [showToast]
  );

  const recordChallengeCheckIn = useCallback(
    (id: string) => {
      setChallenges(prev =>
        prev.map(c => {
          if (c.id === id) {
            const nextProg = Math.min(100, c.userProgressPercent + 25);
            const isComplete = nextProg >= 100;
            showToast(
              isComplete
                ? `Challenge Completed! Earned "${c.badgeReward}" badge!`
                : `Check-in recorded! Progress: ${nextProg}%`,
              'success'
            );
            return {
              ...c,
              userProgressPercent: nextProg,
              status: isComplete ? 'completed' : 'in_progress',
            };
          }
          return c;
        })
      );
    },
    [showToast]
  );

  const changeSubscriptionPlan = useCallback(
    (planId: 'free' | 'standard' | 'premium') => {
      setCurrentPlanId(planId);
      const tierLabel: UserProfile['tier'] =
        planId === 'free'
          ? 'Free Explorer'
          : planId === 'standard'
          ? 'Standard Pro'
          : 'Enterprise Eco';
      setUser(prev => (prev ? { ...prev, tier: tierLabel } : prev));
      showToast(`(Demo Mode) Plan view switched to ${tierLabel}. No payment charged.`, 'success');
    },
    [showToast]
  );

  const activeUnreadAlertsCount = alerts.filter(a => !a.isResolved && !a.isRead).length;

  return (
    <AppContext.Provider
      value={{
        session,
        authUser,
        authLoading,
        authError,
        isAuthenticated,
        user,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        clearAuthError,
        waterReading,
        electricityReading,
        devices,
        alerts,
        recommendations,
        challenges,
        currentPlanId,
        isSimulatingLive,
        toasts,
        telemetrySourceMode,
        isSupabaseReady,
        physicalLoading,
        physicalError,
        hasPhysicalData,
        setTelemetrySourceMode,
        refreshPhysicalTelemetry,
        toggleLiveSimulation,
        markAlertAsRead,
        resolveAlert,
        applyRecommendation,
        dismissRecommendation,
        toggleDeviceStatus,
        joinChallenge,
        recordChallengeCheckIn,
        changeSubscriptionPlan,
        showToast,
        removeToast,
        activeUnreadAlertsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
