import React from 'react';
import { Droplet } from 'lucide-react';
import { LandingLeadingPill } from '../landing/leading/LandingLeadingPill';

const MISSION_IMAGE_URL =
  'https://hoirqrkdgbmvpwutwuwj-all.supabase.co/storage/v1/object/public/assets/assets/a2ea7890-be3d-4b5b-8c4b-3f0752c6105d_3840w.jpg';

export const MissionSection: React.FC = () => {
  return (
    <div className="bg-[#F7F9FB] dark:bg-[#0B111D] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <section aria-labelledby="mission-heading" className="sm:px-8 max-w-7xl mx-auto px-6">
        <div className="py-20 sm:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4">
              <LandingLeadingPill
                borderVariant="primary"
                textVariant="primary"
                className="mb-3"
              >
                Mission
              </LandingLeadingPill>
              <h2
                id="mission-heading"
                className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight font-heading"
              >
                Our mission
              </h2>
            </div>

            <div className="lg:col-span-8">
              <p className="sm:text-4xl lg:text-5xl leading-tight text-3xl font-semibold text-slate-900 dark:text-white tracking-tight font-heading mb-8 text-balance">
                We engineer telemetry that informs, not guesses—clarity over noise, verified readings over estimates.
              </p>
              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                AquaWatt pairs physical FS-S401 pulse flow sensing on the ground with timezone-aware anomaly triage and transparent hardware boundaries. Every reading is audited for physical accuracy, with live briefings for facility operators and deep historical exports when the moment calls for it.
              </p>
            </div>
          </div>

          <div className="mt-16 rounded-3xl overflow-hidden border border-black/5 dark:border-white/10 relative bg-slate-900">
            {/* Fallback container per Zero-Broken-Image Policy */}
            <div
              aria-hidden="true"
              className="w-full h-80 sm:h-[480px] lg:h-[600px] bg-gradient-to-br from-[#17263F] via-[#174A8B] to-[#0B111D] flex items-center justify-center"
            >
              <Droplet className="w-12 h-12 text-white/20" />
            </div>

            <img
              src={MISSION_IMAGE_URL}
              alt="AquaWatt Water Engineering and Telemetry Operations Center"
              referrerPolicy="no-referrer"
              className="absolute inset-0 z-10 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
