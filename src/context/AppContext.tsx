import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import {
  CURRENT_USER,
  COMMUNITY_CHALLENGES,
} from '../data/mockData';
import { telemetryService } from '../services/telemetryService';
import { supabaseTelemetryService } from '../services/supabaseTelemetryService';
import { isSupabaseConfigured, checkSupabaseConnection } from '../lib/supabase';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'alert';
  timestamp: number;
}

interface AppContextType {
  user: UserProfile;
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
  const [user, setUser] = useState<UserProfile>(CURRENT_USER);
  const [waterReading, setWaterReading] = useState<WaterReading>(telemetryService.getInitialWaterReading());
  const [electricityReading, setElectricityReading] = useState<ElectricityReading>(telemetryService.getInitialElectricityReading());
  const [devices, setDevices] = useState<SensorDevice[]>(telemetryService.getSensorNodes());
  const [alerts, setAlerts] = useState<ConsumptionAlert[]>(telemetryService.getInitialAlerts());
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(telemetryService.getInitialRecommendations());
  const [challenges, setChallenges] = useState<CommunityChallenge[]>(COMMUNITY_CHALLENGES);
  const [currentPlanId, setCurrentPlanId] = useState<'free' | 'standard' | 'premium'>('standard');
  const [isSimulatingLive, setIsSimulatingLive] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Phase 2 Telemetry Data Source Mode ('demo' vs 'physical')
  const [telemetrySourceMode, setTelemetrySourceModeState] = useState<TelemetryDataSourceMode>('demo');
  const [physicalLoading, setPhysicalLoading] = useState<boolean>(false);
  const [physicalError, setPhysicalError] = useState<string | null>(null);
  const [hasPhysicalData, setHasPhysicalData] = useState<boolean>(false);

  const isSupabaseReady = isSupabaseConfigured();

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

  // Auto-remove toasts after 4.5s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Keep latest readings in refs for clean, predictable simulation ticks without nested updaters
  const waterRef = useRef(waterReading);
  waterRef.current = waterReading;
  const electricityRef = useRef(electricityReading);
  electricityRef.current = electricityReading;
  const lastRealtimeToastRef = useRef<number>(0);
  const telemetrySourceModeRef = useRef<TelemetryDataSourceMode>(telemetrySourceMode);
  telemetrySourceModeRef.current = telemetrySourceMode;
  const physicalFetchEpochRef = useRef<number>(0);

  // Live sensor simulation ticks (ONLY active when telemetrySourceMode === 'demo')
  useEffect(() => {
    if (!isSimulatingLive || telemetrySourceMode !== 'demo') return;

    const interval = setInterval(() => {
      const { nextWater, nextPower } = telemetryService.createSimulatedJitter(
        waterRef.current,
        electricityRef.current
      );
      setWaterReading(nextWater);
      setElectricityReading(nextPower);
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulatingLive, telemetrySourceMode]);

  // Fetch real physical telemetry from Supabase
  const refreshPhysicalTelemetry = useCallback(async () => {
    const requestEpoch = ++physicalFetchEpochRef.current;

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
      // Diagnostic check: verify that Supabase is reachable and RLS permits reading public.devices
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
  }, []);

  // Handle switching between Demo Telemetry and Physical Hardware Mode
  const setTelemetrySourceMode = useCallback(
    (mode: TelemetryDataSourceMode) => {
      telemetrySourceModeRef.current = mode;
      physicalFetchEpochRef.current += 1;
      setTelemetrySourceModeState(mode);

      if (mode === 'physical') {
        // Pause mock simulation jitter and clear all demo fixtures immediately
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
        // Reset back to Demo Telemetry
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

  // Subscribe to physical telemetry in real-time when physical mode is active
  useEffect(() => {
    if (telemetrySourceMode !== 'physical' || !isSupabaseConfigured()) {
      return;
    }

    // Initial fetch on mount if starting in physical mode
    refreshPhysicalTelemetry();

    // Realtime subscription callback
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
  }, [telemetrySourceMode, refreshPhysicalTelemetry, showToast]);

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
      setUser(prev => ({
        ...prev,
        sustainabilityScore: Math.min(100, prev.sustainabilityScore + 2),
      }));
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
      const planName =
        planId === 'free'
          ? 'Starter Explorer'
          : planId === 'standard'
          ? 'Standard Pro (Maker)'
          : 'Enterprise Eco (Team)';
      setUser(prev => ({ ...prev, tier: planName as any }));
      showToast(`(Demo Mode) Subscription switched to ${planName}. No payment charged.`, 'success');
    },
    [showToast]
  );

  const activeUnreadAlertsCount = alerts.filter(a => !a.isResolved && !a.isRead).length;

  return (
    <AppContext.Provider
      value={{
        user,
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
