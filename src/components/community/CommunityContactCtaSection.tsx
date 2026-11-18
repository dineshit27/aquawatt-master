import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users2, Mail } from 'lucide-react';
import { CrowdCanvas } from '../ui/skiper39';

const OPENPEEPS_SPRITE_URL =
  'https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png';

export const CommunityContactCtaSection: React.FC = () => {
  return (
    <section
      aria-labelledby="community-contact-cta-heading"
      style={{ colorScheme: 'light' }}
      className="relative w-full overflow-hidden border-t border-slate-200/80 bg-white text-slate-900 min-h-[500px] sm:min-h-[560px] flex flex-col items-center"
    >
      {/* Top foreground CTA content */}
      <div className="relative z-10 w-full px-6 pt-12 pb-8 sm:pt-16 sm:pb-10 text-center flex flex-col items-center bg-gradient-to-b from-white via-white/95 to-transparent">
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-slate-500 mb-4">
          <Users2 className="w-3.5 h-3.5 text-[#237A57]" />
          <span>Community &amp; Pilot Support</span>
        </div>

        <h2
          id="community-contact-cta-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading tracking-tight text-slate-900 max-w-2xl leading-[1.15]"
        >
          Have a facility pilot or conservation sprint in mind? Let&apos;s talk.
        </h2>

        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
          Connect with our conservation engineers to launch a campus challenge, calibrate telemetry nodes, or onboard your local sustainability cohort.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-sm font-semibold shadow-sm transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Our Team</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/subscription"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white/95 hover:bg-slate-50 text-slate-700 px-5 py-3 text-sm font-semibold transition-colors"
          >
            <span>Explore Telemetry Plans</span>
          </Link>
        </div>
      </div>

      {/* Walking OpenPeeps Crowd Canvas (always light mode) */}
      <CrowdCanvas
        src={OPENPEEPS_SPRITE_URL}
        rows={15}
        cols={7}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] sm:h-[68%] w-full"
      />
    </section>
  );
};
