import type { FolioPaletteId, ReportingPeriodId } from '../types/businessAnalytics';

export type ThemeMode = 'light' | 'dark';
export type LightPaletteId = Exclude<FolioPaletteId, 'dark'>;

export const VALID_PALETTES: ReadonlyArray<FolioPaletteId> = [
  'aquawatt',
  'swiss',
  'ivory',
  'forest',
  'terracotta',
  'dark',
];

export const VALID_LIGHT_PALETTES: ReadonlyArray<LightPaletteId> = [
  'aquawatt',
  'swiss',
  'ivory',
  'forest',
  'terracotta',
];

export const VALID_PERIODS: ReadonlyArray<ReportingPeriodId> = ['7d', '30d', '90d'];

export interface PaletteMeta {
  id: FolioPaletteId;
  label: string;
  swatch: string;
  dotColor: string;
  canvas: string;
  surface: string;
  accent: string;
}

export const PALETTE_OPTIONS: ReadonlyArray<PaletteMeta> = [
  {
    id: 'aquawatt',
    label: 'AquaWatt Swiss',
    swatch: '#174A8B',
    dotColor: '#174A8B',
    canvas: '#F7F9FB',
    surface: '#FFFFFF',
    accent: '#174A8B',
  },
  {
    id: 'swiss',
    label: 'Swiss Editorial',
    swatch: '#1E1C1A',
    dotColor: '#1E1C1A',
    canvas: '#F4F1EC',
    surface: '#FDFBF7',
    accent: '#1E1C1A',
  },
  {
    id: 'ivory',
    label: 'Warm Ivory',
    swatch: '#FAF8F3',
    dotColor: '#8B7355',
    canvas: '#FAF8F3',
    surface: '#FFFDF8',
    accent: '#5B4636',
  },
  {
    id: 'forest',
    label: 'Botanical Green',
    swatch: '#1A3A2E',
    dotColor: '#1A3A2E',
    canvas: '#EEF5F1',
    surface: '#F8FCFA',
    accent: '#1A3A2E',
  },
  {
    id: 'terracotta',
    label: 'Terracotta Print',
    swatch: '#7A3422',
    dotColor: '#8C3B26',
    canvas: '#F9F2ED',
    surface: '#FFF9F6',
    accent: '#8C3B26',
  },
  {
    id: 'dark',
    label: 'Night Slate',
    swatch: '#0B111D',
    dotColor: '#38BDF8',
    canvas: '#070B13',
    surface: '#0D1524',
    accent: '#38BDF8',
  },
];

export function isLightPalette(palette: FolioPaletteId): palette is LightPaletteId {
  return palette !== 'dark';
}

export function isValidPalette(value: unknown): value is FolioPaletteId {
  return typeof value === 'string' && (VALID_PALETTES as ReadonlyArray<string>).includes(value);
}

export function isValidReportingPeriod(value: unknown): value is ReportingPeriodId {
  return typeof value === 'string' && (VALID_PERIODS as ReadonlyArray<string>).includes(value);
}

export interface WorkspaceAppearanceState {
  theme: ThemeMode;
  palette: FolioPaletteId;
  lastLightPalette: LightPaletteId;
}

export function resolveInitialAppearance(options: {
  savedTheme?: string | null;
  savedPalette?: string | null;
  savedLastLightPalette?: string | null;
  prefersDark?: boolean;
}): WorkspaceAppearanceState {
  const fallbackLight: LightPaletteId =
    isValidPalette(options.savedLastLightPalette) && isLightPalette(options.savedLastLightPalette)
      ? options.savedLastLightPalette
      : 'aquawatt';

  const savedPalette = isValidPalette(options.savedPalette) ? options.savedPalette : null;
  const savedTheme: ThemeMode | null =
    options.savedTheme === 'dark' || options.savedTheme === 'light' ? options.savedTheme : null;

  if (savedPalette) {
    if (savedPalette === 'dark') {
      return { theme: 'dark', palette: 'dark', lastLightPalette: fallbackLight };
    }
    if (savedTheme === 'dark') {
      return { theme: 'dark', palette: 'dark', lastLightPalette: savedPalette };
    }
    return { theme: 'light', palette: savedPalette, lastLightPalette: savedPalette };
  }

  if (savedTheme === 'dark' || (!savedTheme && options.prefersDark)) {
    return { theme: 'dark', palette: 'dark', lastLightPalette: fallbackLight };
  }

  return { theme: 'light', palette: fallbackLight, lastLightPalette: fallbackLight };
}

export function transitionThemeState(
  state: WorkspaceAppearanceState,
  nextTheme: ThemeMode
): WorkspaceAppearanceState {
  if (nextTheme === 'dark') {
    const nextLastLight = isLightPalette(state.palette) ? state.palette : state.lastLightPalette;
    return {
      theme: 'dark',
      palette: 'dark',
      lastLightPalette: nextLastLight,
    };
  }

  const restoredLight = isLightPalette(state.palette) ? state.palette : state.lastLightPalette;
  return {
    theme: 'light',
    palette: restoredLight,
    lastLightPalette: restoredLight,
  };
}

export function transitionPaletteState(
  state: WorkspaceAppearanceState,
  nextPalette: FolioPaletteId
): WorkspaceAppearanceState {
  if (nextPalette === 'dark') {
    const nextLastLight = isLightPalette(state.palette) ? state.palette : state.lastLightPalette;
    return {
      theme: 'dark',
      palette: 'dark',
      lastLightPalette: nextLastLight,
    };
  }

  return {
    theme: 'light',
    palette: nextPalette,
    lastLightPalette: nextPalette,
  };
}
