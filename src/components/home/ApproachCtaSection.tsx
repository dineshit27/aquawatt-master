import React from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Droplet,
  LayoutDashboard,
  Cpu,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

import ctaHydroImg from '../../assets/images/cta_hydro_telemetry_1794591156142.jpg';
import ctaConsoleImg from '../../assets/images/cta_facility_console_1794591156222.jpg';
import ctaEsp32Img from '../../assets/images/cta_esp32_hardware_1794591156397.jpg';
import ctaCampusImg from '../../assets/images/cta_sustainable_campus_1794591156894.jpg';

interface ShowcaseCardItem {
  title: string;
  category: string;
  to: string;
  aspectClass: string;
  image: string;
  alt: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LEFT_COLUMN_CARDS: ShowcaseCardItem[] = [
  {
    title: 'Launch Live Console',
    category: 'Dashboard',
    to: '/dashboard',
    aspectClass: 'aspect-[4/5]',
    image: ctaHydroImg,
    alt: 'Precision inline FS-S401 turbine water flow meter mounted on laboratory piping',
    icon: Droplet,
  },
  {
    title: 'Inspect Live Analytics',
    category: 'Analytics',
    to: '/analytics',
    aspectClass: 'aspect-[4/3]',
    image: ctaEsp32Img,
    alt: 'ESP32 microcontroller wired to a 16x2 backlit LCD display on an engineering bench',
    icon: Cpu,
  },
];

const RIGHT_COLUMN_CARDS: ShowcaseCardItem[] = [
  {
    title: 'Compare Active Plans',
    category: 'Pricing',
    to: '/subscription',
    aspectClass: 'aspect-[4/3]',
    image: ctaConsoleImg,
    alt: 'Minimalist operations workstation displaying facility water consumption analytics',
    icon: LayoutDashboard,
  },
  {
    title: 'Join Saving Sprints',
    category: 'Community',
    to: '/community',
    aspectClass: 'aspect-[4/5]',
    image: ctaCampusImg,
    alt: 'Sustainable research campus with rainwater reflection basin and terraced greenery',
    icon: ShieldCheck,
  },
];

const PILLARS = ['Quick Setup', 'Real-Time Alerts', 'Live Console'];

const ShowcaseCard: React.FC<{ item: ShowcaseCardItem }> = ({ item }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={`group relative overflow-hidden ${item.aspectClass} rounded-2xl border border-neutral-200 dark:border-slate-800 bg-slate-900 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174A8B]`}
    >
      {/* Fallback surface underneath image */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[#17263F] via-[#174A8B] to-[#0B111D] flex items-center justify-center"
      >
        <Icon className="w-8 h-8 text-white/20" />
      </div>

      <img
        src={item.image}
        alt={item.alt}
        referrerPolicy="no-referrer"
        className="relative z-10 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
      />

      {/* Measured contrast scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/25 to-black/30"
      />

      {/* Top-left functional icon badge */}
      <div className="absolute top-3 left-3 z-30">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-900 border border-neutral-200 shadow-xs">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Top-right clean unboxed category metadata */}
      <div className="absolute top-3.5 right-3.5 z-30">
        <span className="text-[11px] font-medium tracking-wide text-white/90 drop-shadow-xs">
          {item.category}
        </span>
      </div>

      {/* Bottom-left card title */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-30 flex items-end justify-between gap-2">
        <p className="text-white text-lg font-medium tracking-tight leading-tight font-heading">
          {item.title}
        </p>
        <ArrowRight className="w-4 h-4 text-white/80 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 shrink-0" />
      </div>
    </Link>
  );
};

export const ApproachCtaSection: React.FC = () => {
  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#070B13] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <section
        id="approach"
        className="relative overflow-hidden mx-auto sm:p-8 bg-neutral-50 dark:bg-[#0D1524] border border-neutral-200 dark:border-slate-800/90 rounded-3xl pt-6 pr-6 pb-6 pl-6 max-w-6xl"
      >
        {/* Background dividers */}
        <div aria-hidden="true" className="absolute inset-0 opacity-10 dark:opacity-15 pointer-events-none">
          <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-400 to-transparent" />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-400 to-transparent" />
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-gradient-to-b from-transparent via-neutral-400 to-transparent" />
          <div className="absolute top-0 bottom-0 right-1/3 w-px bg-gradient-to-b from-transparent via-neutral-400 to-transparent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 items-stretch relative z-10">
          {/* Left: Heading + copy + CTA */}
          <div className="flex flex-col justify-between min-h-full">
            <div>
              <span className="text-sm font-normal text-neutral-500 dark:text-slate-400">
                Get started
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl leading-[0.95] text-neutral-900 dark:text-white mt-2 tracking-tight font-heading font-bold text-balance">
                Start protecting every drop and watt.
              </h2>

              {/* Subtle plus markers with divider */}
              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full h-px bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-6 text-neutral-600 dark:text-slate-300 bg-neutral-50 dark:bg-[#0D1524] px-4 relative">
                  {PILLARS.map((label) => (
                    <div key={label} className="flex items-center gap-2 whitespace-nowrap">
                      <Plus className="h-4 w-4 shrink-0 text-[#174A8B] dark:text-sky-400" strokeWidth={1.5} />
                      <span className="text-sm font-normal">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full mt-10">
              <p className="text-sm font-medium text-neutral-900 dark:text-white tracking-tight">
                Launch your AquaWatt console in minutes
              </p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-slate-300 leading-relaxed">
                Connect your ESP32 node or explore live telemetry right away—monitor verified FS-S401 flow, catch anomalies early, and take control of facility usage.
              </p>

              <Link
                to="/dashboard"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-neutral-900 dark:bg-[#174A8B] text-white text-sm font-medium hover:bg-neutral-800 dark:hover:bg-[#123A6F] transition-colors cursor-pointer"
              >
                <span>Start Monitoring Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="mt-3 text-center">
                <Link
                  to="/contact"
                  className="text-xs font-medium text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white hover:underline transition-colors"
                >
                  Schedule a walkthrough with our team
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Project / Deployment grid */}
          <div className="grid grid-cols-2 gap-4 relative">
            {/* Left Column */}
            <div className="flex flex-col gap-4">
              {LEFT_COLUMN_CARDS.map((card) => (
                <ShowcaseCard key={card.title} item={card} />
              ))}
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-4">
              {RIGHT_COLUMN_CARDS.map((card) => (
                <ShowcaseCard key={card.title} item={card} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
