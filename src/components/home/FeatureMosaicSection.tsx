import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { HomeSectionBadge } from './HomeSectionBadge';

interface InsightDay {
  day: string;
  fullDay: string;
  label: string;
  liters: number;
  kwh: number;
}

const INSIGHT_DAYS: InsightDay[] = [
  { day: 'MON', fullDay: 'Monday', label: '140L', liters: 140, kwh: 3.2 },
  { day: 'TUE', fullDay: 'Tuesday', label: '310L', liters: 310, kwh: 7.4 },
  { day: 'WED', fullDay: 'Wednesday', label: '540L', liters: 540, kwh: 12.6 },
  { day: 'THU', fullDay: 'Thursday', label: '820L', liters: 820, kwh: 18.9 },
  { day: 'FRI', fullDay: 'Friday', label: '1.1k', liters: 1120, kwh: 26.1 },
  { day: 'SAT', fullDay: 'Saturday', label: '1.5k', liters: 1490, kwh: 34.8 },
  { day: 'SUN', fullDay: 'Sunday', label: '1.8k', liters: 1840, kwh: 42.6 },
];

const TELEMETRY_ALERTS = [
  {
    title: 'Shutoff preview!',
    sub: 'Simulated valve trip · 0.0 L/min (Demo)',
    time: 'Just now',
  },
  {
    title: 'Peak load shifted',
    sub: 'Simulated off-peak schedule · 1.8 kWh saved',
    time: '2m ago',
  },
  {
    title: 'Telemetry synced!',
    sub: 'Weekly hydro & watt audit exported',
    time: '2:34 PM',
  },
];

const SEARCH_PROMPTS = [
  'Search FS-S401 sensors, demo logs, kWh models...',
  'Testbench Main · flow alert threshold 4.2 L/min',
  'ESP32-NODE-01 · RSSI -62 dBm · Serial 115200',
  'Tariff window · off-peak pump simulation',
];

export const FeatureMosaicSection: React.FC = () => {
  const navigate = useNavigate();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const automateCardRef = useRef<HTMLElement | null>(null);

  const [inView, setInView] = useState(false);
  const [alertIndex, setAlertIndex] = useState(0);
  const [valveArmed, setValveArmed] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<InsightDay | null>(null);
  const [animatedLiters, setAnimatedLiters] = useState(0);
  const [selectedBridge, setSelectedBridge] = useState<string | null>(null);

  // Search card interactive + animated typewriter placeholder state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [typedPlaceholder, setTypedPlaceholder] = useState(SEARCH_PROMPTS[0]);

  // Trigger entrance reveal & count-up when visible
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setInView(true);
      setAnimatedLiters(1840);
      return;
    }

    let triggered = false;
    const startEntrance = () => {
      if (triggered) return;
      triggered = true;
      setInView(true);

      const counter = { val: 0 };
      gsap.to(counter, {
        val: 1840,
        duration: 1.5,
        delay: 0.35,
        ease: 'power3.out',
        onUpdate: () => setAnimatedLiters(Math.round(counter.val)),
      });
    };

    const rect = stage.getBoundingClientRect();
    if (rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight * 0.95) {
      startEntrance();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startEntrance();
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(stage);

    return () => io.disconnect();
  }, []);

  // GSAP entrance timeline once visible
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !inView) return;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.mosaic-card',
        { opacity: 0, y: 24, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        },
      );

      gsap.fromTo(
        '.mosaic-qbar',
        { scaleY: 0, transformOrigin: 'bottom center' },
        {
          scaleY: 1,
          duration: 0.85,
          stagger: 0.06,
          delay: 0.25,
          ease: 'back.out(1.25)',
          clearProps: 'transform',
        },
      );
    }, stage);

    return () => ctx.revert();
  }, [inView]);

  // Cycle live telemetry alert notifications
  useEffect(() => {
    const timer = window.setInterval(() => {
      setAlertIndex((prev) => (prev + 1) % TELEMETRY_ALERTS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  // Typewriter cycling placeholder in Search card when idle
  useEffect(() => {
    if (searchQuery || searchFocused) return;

    let promptIdx = 0;
    let charIdx = SEARCH_PROMPTS[0].length;
    let deleting = true;
    let timeoutId: number;

    const tick = () => {
      const current = SEARCH_PROMPTS[promptIdx];
      if (!deleting) {
        charIdx++;
        setTypedPlaceholder(current.slice(0, charIdx));
        if (charIdx >= current.length) {
          deleting = true;
          timeoutId = window.setTimeout(tick, 2100);
          return;
        }
        timeoutId = window.setTimeout(tick, 34);
      } else {
        charIdx--;
        setTypedPlaceholder(current.slice(0, Math.max(0, charIdx)));
        if (charIdx <= 0) {
          deleting = false;
          promptIdx = (promptIdx + 1) % SEARCH_PROMPTS.length;
          timeoutId = window.setTimeout(tick, 360);
          return;
        }
        timeoutId = window.setTimeout(tick, 18);
      }
    };

    timeoutId = window.setTimeout(tick, 2200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchFocused]);

  // Subtle depth parallax on Card 3 mouse hover
  const handleAutomateMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = automateCardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--mx', (nx * 14).toFixed(2));
    el.style.setProperty('--my', (ny * 10).toFixed(2));
  };

  const handleAutomateMouseLeave = () => {
    const el = automateCardRef.current;
    if (!el) return;
    el.style.setProperty('--mx', '0');
    el.style.setProperty('--my', '0');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/analytics');
  };

  const activeAlert = TELEMETRY_ALERTS[alertIndex];
  const displayLiters = hoveredDay ? hoveredDay.liters : animatedLiters;
  const formattedLiters = `${displayLiters.toLocaleString('en-US')} L`;
  const insightsSubtitle = hoveredDay
    ? `saved on ${hoveredDay.fullDay} · ${hoveredDay.kwh} kWh`
    : 'saved this week · 42.6 kWh';

  return (
    <section
      aria-labelledby="feature-mosaic-heading"
      className="mosaic-section border-t border-b border-slate-200/80 dark:border-slate-800/80"
    >
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-7 sm:mb-9 text-center">
        <div className="mb-3 flex justify-center">
          <HomeSectionBadge icon="⚡">
            Edge Automation
          </HomeSectionBadge>
        </div>
        <h2
          id="feature-mosaic-heading"
          className="text-2xl sm:text-4xl lg:text-[2.7rem] font-extrabold font-heading text-slate-900 dark:text-white tracking-tight text-balance leading-tight"
        >
          Autonomous Edge Control &amp; Telemetry Preview
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Simulated shutoff previews, multi-protocol hardware blueprints, weekly conservation metrics, and node search unified in one workspace.
        </p>
      </div>
      <div
        ref={stageRef}
        className={`mosaic-stage ${inView ? 'is-active' : ''}`}
        role="region"
        aria-label="AquaWatt Autonomous Telemetry Features"
      >
        {/* CARD 1 — LIVE TELEMETRY NOTIFICATION */}
        <article
          className="mosaic-card mosaic-notif cursor-pointer"
          aria-label="Live AquaWatt telemetry alert"
          onClick={() => setAlertIndex((prev) => (prev + 1) % TELEMETRY_ALERTS.length)}
          title="Click to cycle live telemetry alerts"
        >
          <div className="mosaic-toast-wrap">
            <div className="mosaic-toast-ledge" aria-hidden="true" />
            <div key={alertIndex} className="mosaic-toast mosaic-toast-swap">
              <div className="mosaic-toast-icon-wrap">
                <span className="mosaic-toast-ping" aria-hidden="true" />
                <svg
                  className="mosaic-toast-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <mask id="mosaic-notif-sparkle-mask">
                      <rect width="24" height="24" fill="#fff" />
                      <path
                        d="M12 2.8 Q12.9 11.1 21.2 12 Q12.9 12.9 12 21.2 Q11.1 12.9 2.8 12 Q11.1 11.1 12 2.8 Z"
                        fill="#000"
                      />
                    </mask>
                  </defs>
                  <circle
                    cx="12"
                    cy="12"
                    r="12"
                    fill="#0d0d0d"
                    mask="url(#mosaic-notif-sparkle-mask)"
                  />
                  <path
                    d="M12 7.4 Q12.5 11.5 16.6 12 Q12.5 12.5 12 16.6 Q11.5 12.5 7.4 12 Q11.5 11.5 12 7.4 Z"
                    fill="#0d0d0d"
                  />
                </svg>
              </div>
              <div className="mosaic-toast-body">
                <div className="mosaic-toast-title">{activeAlert.title}</div>
                <div className="mosaic-toast-sub">{activeAlert.sub}</div>
              </div>
              <div className="mosaic-toast-time">{activeAlert.time}</div>
            </div>
          </div>
        </article>

        {/* CARD 2 — CONNECT YOUR GRID NOW */}
        <article className="mosaic-card mosaic-connect" aria-label="Hardware and cloud telemetry bridges">
          <h2>
            Connect your
            <br />
            Grid Now.
          </h2>
          <p className="mosaic-sub">
            {selectedBridge ? `${selectedBridge} · Stream active` : 'ESP32, MQTT & 40+ IoT bridges'}
          </p>

          <div className="mosaic-chips">
            <div className="mosaic-chip-row r1">
              <button
                type="button"
                onClick={() => setSelectedBridge('ESP32-S3 MCU')}
                className={`mosaic-chip mosaic-chip-float-a ${
                  selectedBridge === 'ESP32-S3 MCU' ? 'is-selected' : ''
                }`}
              >
                <span>ESP32-S3 MCU</span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="6" y="6" width="12" height="12" rx="2.2" fill="#174A8B" />
                  <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1" fill="#38BDF8" />
                  <path
                    d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"
                    stroke="#174A8B"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mosaic-chip-row r2">
              <button
                type="button"
                onClick={() => setSelectedBridge('MQTT')}
                className={`mosaic-chip mosaic-chip-float-b ${
                  selectedBridge === 'MQTT' ? 'is-selected' : ''
                }`}
              >
                <span>MQTT</span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="17.5" r="2.2" fill="#7C3AED" />
                  <path
                    d="M6.5 11.2a6.3 6.3 0 0 1 6.3 6.3"
                    stroke="#7C3AED"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.5 6.2a11.3 11.3 0 0 1 11.3 11.3"
                    stroke="#A855F7"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBridge('Supabase')}
                className={`mosaic-chip mosaic-chip-float-a ${
                  selectedBridge === 'Supabase' ? 'is-selected' : ''
                }`}
              >
                <span>Supabase</span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M13.5 2.5L4.8 13.6h6.6l-.9 7.9 8.7-11.1h-6.6l.9-7.9Z"
                    fill="#10B981"
                    stroke="#047857"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mosaic-chip-row r3">
              <button
                type="button"
                onClick={() => setSelectedBridge('Home Assistant')}
                className={`mosaic-chip mosaic-chip-float-b ${
                  selectedBridge === 'Home Assistant' ? 'is-selected' : ''
                }`}
              >
                <span>Home Asst.</span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 11.2L12 4l8.5 7.2v8.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-8.3Z"
                    fill="#0EA5E9"
                  />
                  <circle cx="12" cy="14" r="2" fill="#fff" />
                  <path d="M12 10v2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBridge('Grafana')}
                className={`mosaic-chip mosaic-chip-float-a ${
                  selectedBridge === 'Grafana' ? 'is-selected' : ''
                }`}
              >
                <span>Grafana</span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3a9 9 0 1 0 9 9"
                    stroke="#F97316"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 7a5 5 0 1 0 5 5"
                    stroke="#FB923C"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="12" r="2.2" fill="#EA580C" />
                </svg>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBridge('FS-S401 Flow')}
            className={`mosaic-chip mosaic-chip-slack mosaic-chip-tilt-float ${
              selectedBridge === 'FS-S401 Flow' ? 'is-selected' : ''
            }`}
          >
            <span>FS-S401 Flow</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2.8C12 2.8 5.5 10.1 5.5 14.5a6.5 6.5 0 1 0 13 0C18.5 10.1 12 2.8 12 2.8Z"
                fill="#0284C7"
              />
              <path
                d="M9.4 14.5a2.6 2.6 0 0 0 2.6 2.6"
                stroke="#BAE6FD"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </article>

        {/* CARD 3 — AUTOMATE WATER & POWER */}
        <article
          ref={automateCardRef}
          onMouseMove={handleAutomateMouseMove}
          onMouseLeave={handleAutomateMouseLeave}
          onClick={() => setValveArmed((prev) => !prev)}
          className="mosaic-card mosaic-automate cursor-pointer"
          aria-label="Simulated valve and power automation preview"
          title="Click to toggle simulated valve arming preview"
        >
          <div className="mosaic-automate-copy">
            <h2>
              <span className="g">Simulate</span> your rules.
              <br />
              Preview shutoff safety.
            </h2>
            <p className="mosaic-sub">
              Software-simulated valve &amp; load workflows (physical relay is planned hardware).
            </p>
          </div>

          <div className="mosaic-illo" aria-hidden="true">
            <div className="mosaic-win mosaic-win-back">
              <div className="mosaic-win-bar">
                <span className="mosaic-win-dot" />
                <span className="mosaic-win-dot" />
                <span className="mosaic-win-dot" />
              </div>
              <div className="mosaic-win-body">
                <div className="mosaic-win-strip" />
              </div>
            </div>

            <div className="mosaic-win mosaic-win-front">
              <div className="mosaic-win-bar">
                <span className="mosaic-win-dot" />
                <span className="mosaic-win-dot" />
                <span className="mosaic-win-dot" />
              </div>
              <div className="mosaic-win-body">
                <div className="mosaic-win-strip" />
                <div className="mosaic-win-wave">
                  <svg viewBox="0 0 240 120" fill="none" className="mosaic-wave-svg">
                    <path
                      d="M0 78 Q 24 44, 48 76 T 96 70 T 144 52 T 192 74 T 240 58"
                      stroke="rgba(95, 139, 62, 0.25)"
                      strokeWidth="2"
                      fill="none"
                    />
                    <path
                      d="M0 78 Q 24 44, 48 76 T 96 70 T 144 52 T 192 74 T 240 58"
                      stroke="#5f8b3e"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      fill="none"
                      className="mosaic-wave-pulse"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className={`mosaic-pill-wf ${valveArmed ? '' : 'is-tripped'}`}>
              <span className="mosaic-tick-disc">
                <svg viewBox="0 0 20 20" fill="none">
                  <polyline
                    points="5 10.5 8.5 14 15.5 6.5"
                    stroke="#161616"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>{valveArmed ? 'Valve Sim Armed' : 'Sim Tripped · 0.0 L/min'}</span>
            </div>

            <div className="mosaic-pill-ai">
              <div className="mosaic-ai-lines">
                <span className="mosaic-ai-shimmer-1" />
                <span className="mosaic-ai-shimmer-2" />
              </div>
              <svg className="mosaic-ai-spark" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5.5 2.5 L6.4 5.1 L9 6 L6.4 6.9 L5.5 9.5 L4.6 6.9 L2 6 L4.6 5.1 Z"
                  fill="#eff4e6"
                  stroke="#4f7433"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14.5 7 L16.2 12.3 L21.5 14 L16.2 15.7 L14.5 21 L12.8 15.7 L7.5 14 L12.8 12.3 Z"
                  fill="#eff4e6"
                  stroke="#4f7433"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <svg className="mosaic-cursor" viewBox="0 0 24 28" fill="none">
              <path
                d="M3 2L3 22.5L8.2 17.5L11.7 25L14.8 23.6L11.3 16.1L18.5 16L3 2Z"
                fill="#fff"
                stroke="#2b2b2b"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </article>

        {/* CARD 4 — CONSERVATION INSIGHTS */}
        <article className="mosaic-card mosaic-insights" aria-label="Weekly conservation insights">
          <div className="mosaic-tag">Conservation Insights</div>
          <h2>{formattedLiters}</h2>
          <p className="mosaic-sub">{insightsSubtitle}</p>

          <div
            className="mosaic-chart"
            aria-label="Cumulative water saved per day across the week"
            onMouseLeave={() => setHoveredDay(null)}
          >
            {INSIGHT_DAYS.map((item) => {
              const isHighlighted = hoveredDay ? hoveredDay.day === item.day : item.day === 'SUN';
              return (
                <div
                  key={item.day}
                  className={`mosaic-day-col ${isHighlighted ? 'is-highlighted' : ''}`}
                  onMouseEnter={() => setHoveredDay(item)}
                  onFocus={() => setHoveredDay(item)}
                >
                  <div className="mosaic-qbar">{item.label}</div>
                  <div className="mosaic-day-label">{item.day}</div>
                </div>
              );
            })}
          </div>
        </article>

        {/* CARD 5 — TELEMETRY SEARCH */}
        <article className="mosaic-card mosaic-search" aria-label="Telemetry node search">
          <h2>
            Inspect any
            <br />
            node instantly
          </h2>
          <form onSubmit={handleSearchSubmit} className="mosaic-bar-search">
            <button
              type="submit"
              className="mosaic-mag-circle"
              aria-label="Open analytics search"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="7.1" stroke="#121212" strokeWidth="2.2" />
                <path
                  d="M15.8 15.8L20.5 20.5"
                  stroke="#121212"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={searchFocused ? 'Search sensors, valves, tariff logs...' : typedPlaceholder}
              aria-label="Search telemetry nodes, valves, or energy logs"
              className="mosaic-search-input"
            />
            <button
              type="button"
              onClick={() => setMicActive((prev) => !prev)}
              aria-label={micActive ? 'Stop voice telemetry query' : 'Start voice telemetry query'}
              className={`mosaic-mic-btn ${micActive ? 'is-listening' : ''}`}
            >
              <svg className="mosaic-mic-icon" viewBox="0 0 16 20" fill="none" aria-hidden="true">
                <rect x="5" y="1" width="6" height="10" rx="3" fill="currentColor" />
                <path
                  d="M2.5 9.5a5.5 5.5 0 0 0 11 0"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <line
                  x1="8"
                  y1="15"
                  x2="8"
                  y2="18.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <line
                  x1="5"
                  y1="18.5"
                  x2="11"
                  y2="18.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </form>
        </article>
      </div>
    </section>
  );
};
