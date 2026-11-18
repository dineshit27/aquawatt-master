import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SensorReadingRow } from '../../src/lib/supabase.js';
import { telemetryService } from './telemetryService.js';
import {
  AuthContext,
  DateRange,
  DateRangeSchema,
  PossibleLeakAnalysisDto,
} from './types.js';
import { detectAnomaly } from '../../src/utils/calculations.js';

export interface AnomalyOptions {
  expectedBaselineLpm?: number;
  sensitivityMultiplier?: number;
  continuousFlowThresholdHours?: number;
  minLeakFlowLpm?: number;
  timezone?: string;          // Default: 'Asia/Kolkata'
  nightStartHour?: number;    // Default: 1 (01:00 local)
  nightEndHour?: number;      // Default: 5 (05:00 local)
}

/**
 * Extracts local hour in specified IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York')
 */
export function getLocalHourInTimezone(dateStringOrObj: string | Date, timezone: string = 'Asia/Kolkata'): number {
  const date = typeof dateStringOrObj === 'string' ? new Date(dateStringOrObj) : dateStringOrObj;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find(p => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}

export class AnomalyService {
  /**
   * Evaluates telemetry for possible water leaks using transparent, explainable heuristics.
   * STRICT CONSTRAINT: Never asserts that a leak is confirmed.
   */
  async detectPossibleLeak(
    deviceId: string,
    dateRange: DateRange,
    context: AuthContext,
    options: AnomalyOptions = {},
    customClient?: SupabaseClient<Database>
  ): Promise<PossibleLeakAnalysisDto> {
    DateRangeSchema.parse(dateRange);
    const rows = await telemetryService.getHistoricalReadings(deviceId, dateRange, context, customClient);

    const minLeakLpm = options.minLeakFlowLpm ?? 0.1;
    const thresholdHours = options.continuousFlowThresholdHours ?? 3;
    const timezone = options.timezone || 'Asia/Kolkata';
    const nightStart = options.nightStartHour ?? 1;
    const nightEnd = options.nightEndHour ?? 5;

    const isNightHour = (localHour: number): boolean => {
      if (nightStart <= nightEnd) {
        return localHour >= nightStart && localHour <= nightEnd;
      }
      return localHour >= nightStart || localHour <= nightEnd;
    };

    if (rows.length === 0) {
      return {
        deviceId,
        analyzedAt: new Date().toISOString(),
        hasPossibleLeak: false,
        confidence: 'none',
        classification: 'unlikely',
        observations: {
          consecutiveFlowHours: 0,
          nighttimeAverageFlowLpm: 0,
          minimumNonZeroFlowLpm: 0,
          sampleCountAnalyzed: 0,
          timeWindowEvaluated: `${dateRange.startDate} to ${dateRange.endDate} (${timezone})`,
        },
        evidenceSummary: 'Insufficient sensor telemetry points within the requested window to perform analysis.',
        explanation: 'No sensor reading records were returned for this device and time interval.',
        recommendedActions: ['Verify that the ESP32 hardware node is powered and syncing telemetry.'],
        caveats: [
          'Analysis requires at least 4 contiguous sensor reading points for baseline evaluation.',
          'This heuristic check does not confirm or rule out physical plumbing anomalies.',
        ],
      };
    }

    // Sort chronologically
    const sorted = [...rows].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    // 1. Analyze continuous flow duration (unbroken flow > minLeakLpm)
    let currentFlowStreakMs = 0;
    let maxFlowStreakMs = 0;
    let lastTime: number | null = null;
    let nonZeroFlows: number[] = [];
    let nightFlows: number[] = [];

    for (const r of sorted) {
      const time = new Date(r.recorded_at).getTime();
      const flow = Number(r.flow_rate_lpm ?? 0);
      const localHour = getLocalHourInTimezone(r.recorded_at, timezone);

      if (isNightHour(localHour)) {
        nightFlows.push(flow);
      }

      if (flow >= minLeakLpm) {
        nonZeroFlows.push(flow);
        if (lastTime != null) {
          const delta = time - lastTime;
          // Accept periodic telemetry gaps up to 75 minutes as contiguous hourly flow
          if (delta <= 75 * 60 * 1000) {
            currentFlowStreakMs += delta;
          } else {
            currentFlowStreakMs = 0;
          }
        }
        if (currentFlowStreakMs > maxFlowStreakMs) {
          maxFlowStreakMs = currentFlowStreakMs;
        }
      } else {
        currentFlowStreakMs = 0;
      }

      lastTime = time;
    }

    const consecutiveFlowHours = Number((maxFlowStreakMs / (3600 * 1000)).toFixed(1));
    const minNonZeroFlow = nonZeroFlows.length > 0 ? Math.min(...nonZeroFlows) : 0;
    const avgNightFlow =
      nightFlows.length > 0
        ? Number((nightFlows.reduce((a, b) => a + b, 0) / nightFlows.length).toFixed(2))
        : 0;

    // Check if flow never dropped to 0 across the window
    const zeroFlowCount = sorted.filter(r => Number(r.flow_rate_lpm ?? 0) < 0.02).length;
    const hasUnbrokenFlow = zeroFlowCount === 0 && sorted.length >= 6;

    // 2. Classify possible leak
    let hasPossibleLeak = false;
    let confidence: 'none' | 'low' | 'medium' | 'high' = 'none';
    let classification: PossibleLeakAnalysisDto['classification'] = 'unlikely';
    const evidenceParts: string[] = [];

    if (consecutiveFlowHours >= thresholdHours && avgNightFlow > 0.15) {
      hasPossibleLeak = true;
      confidence = consecutiveFlowHours >= 6 ? 'high' : 'medium';
      classification = 'possible_continuous_flow';
      evidenceParts.push(
        `FS-S401 turbine recorded uninterrupted flow for approximately ${consecutiveFlowHours} continuous hours, including facility local night hours (${timezone} ${nightStart}:00-${nightEnd}:00) with average flow of ${avgNightFlow} LPM.`
      );
    } else if (hasUnbrokenFlow && minNonZeroFlow > 0.05) {
      hasPossibleLeak = true;
      confidence = 'medium';
      classification = 'possible_micro_leak';
      evidenceParts.push(
        `Flow did not return to 0.00 LPM across any of the ${sorted.length} recorded telemetry samples in the evaluated window (minimum observed flow: ${minNonZeroFlow.toFixed(2)} LPM).`
      );
    } else if (avgNightFlow > 0.5) {
      hasPossibleLeak = true;
      confidence = 'low';
      classification = 'possible_continuous_flow';
      evidenceParts.push(
        `Elevated average nighttime flow of ${avgNightFlow} LPM observed during facility local night hours (${timezone} ${nightStart}:00-${nightEnd}:00).`
      );
    }

    const evidenceSummary =
      evidenceParts.length > 0
        ? evidenceParts.join(' ')
        : `Normal water telemetry patterns observed. Flow returned to zero ${zeroFlowCount} times across ${sorted.length} reading samples.`;

    const explanation = hasPossibleLeak
      ? `Telemetry patterns indicate persistent fluid movement through the FS-S401 meter. Typical causes for this profile include a running toilet flapper valve, dripping internal fixtures, outdoor hose bib leaks, or an active automated filter/irrigation line. This indicates a possible anomaly, not a verified breach.`
      : `Flow readings indicate standard intermittent consumption with regular periods of zero flow, typical of normal occupant usage without persistent baseline loss.`;

    const recommendedActions: string[] = hasPossibleLeak
      ? [
          'Conduct visual inspection of all downstream plumbing fixtures, especially toilets and overflow valves.',
          'Verify if automated equipment (water softeners, RO systems, cooling loops) was scheduled to run during the observed window.',
          'Close the main supply valve briefly to verify if the FS-S401 meter drops to 0.00 LPM.',
        ]
      : ['Continue regular monitoring. Current baseline conforms to expected intermittent patterns.'];

    const caveats: string[] = [
      'CRITICAL NOTICE: This analysis represents an automated heuristic indicator based on flow sensor telemetry and does NOT constitute a confirmed physical leak.',
      'False positives can be caused by continuous low-rate legitimate usage, automated bypass valves, or sensory calibration drift.',
      'Physical visual inspection is always required before taking remedial plumbing action.',
    ];

    return {
      deviceId,
      analyzedAt: new Date().toISOString(),
      hasPossibleLeak,
      confidence,
      classification,
      observations: {
        consecutiveFlowHours,
        nighttimeAverageFlowLpm: avgNightFlow,
        minimumNonZeroFlowLpm: Number(minNonZeroFlow.toFixed(2)),
        sampleCountAnalyzed: sorted.length,
        timeWindowEvaluated: `${dateRange.startDate} to ${dateRange.endDate}`,
      },
      evidenceSummary,
      explanation,
      recommendedActions,
      caveats,
    };
  }

  /**
   * Evaluates instantaneous telemetry for surge/spikes relative to baseline.
   */
  evaluateFlowSurge(
    currentFlowLpm: number,
    expectedBaselineLpm: number,
    sensitivityMultiplier: number = 1.35
  ) {
    return detectAnomaly(currentFlowLpm, expectedBaselineLpm, sensitivityMultiplier);
  }
}

export const anomalyService = new AnomalyService();
