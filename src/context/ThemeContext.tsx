import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { FolioPaletteId, ReportingPeriodId } from '../types/businessAnalytics';
import {
  isValidReportingPeriod,
  resolveInitialAppearance,
  transitionPaletteState,
  transitionThemeState,
  type ThemeMode,
  type WorkspaceAppearanceState,
} from '../utils/workspaceTheme';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  palette: FolioPaletteId;
  setPalette: (palette: FolioPaletteId) => void;
  reportingPeriod: ReportingPeriodId;
  setReportingPeriod: (period: ReportingPeriodId) => void;
  showGridOverlay: boolean;
  toggleGridOverlay: () => void;
  setShowGridOverlay: (visible: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance, setAppearance] = useState<WorkspaceAppearanceState>(() => {
    if (typeof window !== 'undefined') {
      return resolveInitialAppearance({
        savedTheme: localStorage.getItem('aquawatt-theme'),
        savedPalette: localStorage.getItem('aquawatt-surface-palette'),
        savedLastLightPalette: localStorage.getItem('aquawatt-last-light-palette'),
        prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      });
    }
    return resolveInitialAppearance({});
  });

  const [reportingPeriod, setReportingPeriodState] = useState<ReportingPeriodId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aquawatt-reporting-period');
      if (isValidReportingPeriod(saved)) return saved;
    }
    return '30d';
  });

  const [showGridOverlay, setShowGridOverlay] = useState(false);

  const { theme, palette, lastLightPalette } = appearance;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.dataset.awPalette = palette;
    localStorage.setItem('aquawatt-theme', theme);
    localStorage.setItem('aquawatt-surface-palette', palette);
    localStorage.setItem('aquawatt-last-light-palette', lastLightPalette);
  }, [theme, palette, lastLightPalette]);

  useEffect(() => {
    localStorage.setItem('aquawatt-reporting-period', reportingPeriod);
  }, [reportingPeriod]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setAppearance(prev => transitionThemeState(prev, newTheme));
  }, []);

  const toggleTheme = useCallback(() => {
    setAppearance(prev => transitionThemeState(prev, prev.theme === 'light' ? 'dark' : 'light'));
  }, []);

  const setPalette = useCallback((nextPalette: FolioPaletteId) => {
    setAppearance(prev => transitionPaletteState(prev, nextPalette));
  }, []);

  const setReportingPeriod = useCallback((period: ReportingPeriodId) => {
    setReportingPeriodState(period);
  }, []);

  const toggleGridOverlay = useCallback(() => {
    setShowGridOverlay(prev => !prev);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        palette,
        setPalette,
        reportingPeriod,
        setReportingPeriod,
        showGridOverlay,
        toggleGridOverlay,
        setShowGridOverlay,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
