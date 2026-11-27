import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ContainerScroll } from '../ui/container-scroll-animation';
import { BrandLogo } from '../common/BrandLogo';
import {
  Search,
  LayoutDashboard,
  ShieldCheck,
  Bell,
  Gauge,
  FileText,
  Settings,
  Cpu,
  Activity,
  Calendar,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

const PLANET_VIDEO_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e859f229-8ebd-43fb-a5a0-58006ba75327.mp4';
const DASHBOARD_GLOW_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e0e14572-12e1-4c08-b471-a21521844945.png';

const SIDEBAR_PRIMARY = [
  { id: 'search', label: 'Find Node', icon: Search },
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'valves', label: 'Shutoff Valves', icon: ShieldCheck },
  { id: 'alerts', label: 'Leak Alerts', icon: Bell },
];

const SIDEBAR_SECONDARY = [
  { id: 'meters', label: 'Submeters', icon: Gauge },
  { id: 'reports', label: 'Audit Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Polar colour stops for the fallback planet rim canvas (distance from arc edge)
const RIM_POLAR_STOPS: Array<[number, number, number, number, number]> = [
  // [offsetFromRimNorm, r, g, b, alpha]
  [-0.18, 0, 0, 0, 0],
  [-0.04, 10, 36, 112, 0.35],
  [-0.008, 37, 118, 255, 0.85],
  [0.0, 214, 240, 255, 1.0],
  [0.012, 59, 152, 255, 0.92],
  [0.04, 29, 100, 255, 0.52],
  [0.1, 16, 60, 178, 0.22],
  [0.2, 6, 26, 86, 0.06],
  [0.32, 0, 0, 0, 0],
];

function samplePolarColor(t: number): [number, number, number, number] {
  if (t <= RIM_POLAR_STOPS[0][0]) return [0, 0, 0, 0];
  const last = RIM_POLAR_STOPS[RIM_POLAR_STOPS.length - 1];
  if (t >= last[0]) return [0, 0, 0, 0];

  for (let i = 0; i < RIM_POLAR_STOPS.length - 1; i++) {
    const a = RIM_POLAR_STOPS[i];
    const b = RIM_POLAR_STOPS[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const f = (t - a[0]) / (b[0] - a[0]);
      return [
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
        Math.round(a[3] + (b[3] - a[3]) * f),
        a[4] + (b[4] - a[4]) * f,
      ];
    }
  }
  return [0, 0, 0, 0];
}

export const ZaplineHeroSection: React.FC = () => {
  const heroRootRef = useRef<HTMLElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const rimCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoReady, setVideoReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState('dashboard');

  const sidebarBreadcrumbs: Record<string, string> = {
    search: 'Node Locator · ESP32-Grid',
    dashboard: 'Telemetry Overview',
    valves: 'Shutoff Valve Simulator',
    alerts: 'Leak Anomaly Surveillance',
    meters: 'Facility Submeters',
    reports: 'Audit Ledger Exports',
    settings: 'Calibration & MQTT Setup',
  };

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Draw static procedural starfield on canvas (rule: nothing in sky is animated in code)
  useEffect(() => {
    const canvas = starsCanvasRef.current;
    const root = heroRootRef.current;
    if (!canvas || !root) return;

    const drawStars = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Deterministic PRNG so stars never jump on resize
      let seed = 42197;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      const count = Math.min(340, Math.max(120, Math.round((w * h) / 4800)));
      for (let i = 0; i < count; i++) {
        const x = rand() * w;
        const y = rand() * (h * 0.78);
        const radius = rand() < 0.82 ? 0.65 + rand() * 0.65 : 1.3 + rand() * 0.6;
        const alpha = 0.16 + rand() * 0.68;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle =
          rand() > 0.88
            ? `rgba(191, 224, 255, ${alpha.toFixed(2)})`
            : `rgba(247, 247, 248, ${alpha.toFixed(2)})`;
        ctx.fill();
      }
    };

    drawStars();
    const ro = new ResizeObserver(drawStars);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Draw fallback violet planet rim canvas from polar colour table
  useEffect(() => {
    const canvas = rimCanvasRef.current;
    if (!canvas) return;

    const drawRim = () => {
      const w = canvas.clientWidth || 1672;
      const h = canvas.clientHeight || 717;
      if (!w || !h) return;

      // Render into compact logical buffer for crisp smooth polar gradient
      const bw = 420;
      const bh = Math.max(180, Math.round((bw * h) / w));
      canvas.width = bw;
      canvas.height = bh;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = ctx.createImageData(bw, bh);
      const data = img.data;

      // Planet center sits above the top edge so its lower limb arches downward
      const cx = bw * 0.5;
      const radius = bw * 0.62;
      const cy = bh * 0.255 - radius;

      for (let py = 0; py < bh; py++) {
        const dy = py - cy;
        for (let px = 0; px < bw; px++) {
          const dx = px - cx;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Normalized signed distance from planet limb
          const t = (dist - radius) / radius;

          // Subtle angular brightening near the center of the arc
          const angle = Math.abs(dx / radius);
          const horizonFalloff = Math.max(0, 1 - angle * 0.55);

          const [r, g, b, a] = samplePolarColor(t);
          const idx = (py * bw + px) * 4;
          const finalA = Math.min(1, a * horizonFalloff);
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(finalA * 255);
        }
      }

      ctx.putImageData(img, 0, 0);
    };

    drawRim();
    const ro = new ResizeObserver(drawRim);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Attempt smooth video playback on desktop when reducedMotion is off
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || reducedMotion) return;

    const handleCanPlay = () => {
      setVideoReady(true);
      vid.play().catch(() => {
        // Autoplay blocked -> keep canvas fallback visible
      });
    };

    vid.addEventListener('canplaythrough', handleCanPlay);
    vid.addEventListener('playing', () => setVideoReady(true));
    if (vid.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      vid.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [reducedMotion]);

  // Coordinated GSAP UI entrance timeline
  useEffect(() => {
    const root = heroRootRef.current;
    if (!root || reducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.zap-anim-line-1',
        { opacity: 0, y: 26, clipPath: 'inset(0 0 100% 0)' },
        {
          opacity: 1,
          y: 0,
          clipPath: 'inset(0 0 0% 0)',
          duration: 0.65,
          clearProps: 'clipPath',
        },
        0.16,
      )
        .fromTo(
          '.zap-anim-line-2',
          { opacity: 0, y: 26, clipPath: 'inset(0 0 100% 0)' },
          {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0 0 0% 0)',
            duration: 0.65,
            clearProps: 'clipPath',
          },
          0.34,
        )
        .fromTo(
          '.zap-anim-lede',
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6 },
          0.48,
        )
        .fromTo(
          '.zap-anim-actions',
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.55 },
          0.6,
        )
        .fromTo(
          '.zap-anim-dash-item',
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 },
          0.7,
        );
    }, root);

    return () => ctx.revert();
  }, [reducedMotion]);

  const handleAnchorClick = (href: string) => {
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <section
      id="zapline-hero"
      ref={heroRootRef}
      aria-label="AquaWatt Smart Water & Energy Telemetry Hero"
      className="zap-hero-root"
    >
      {/* Full-viewport static procedural starfield */}
      <canvas
        ref={starsCanvasRef}
        aria-hidden="true"
        className="zap-stars-canvas"
      />

      {/* Responsive Cosmic Stage with ContainerScroll 3D Perspective */}
      <div className="zap-stage">
        {/* Top Planet Rim Layer */}
        <div className="zap-planet-layer" aria-hidden="true">
          <canvas ref={rimCanvasRef} className="zap-rim-canvas" />
          {!reducedMotion && (
            <video
              ref={videoRef}
              className={`zap-planet-video ${videoReady ? 'is-ready' : ''}`}
              src={PLANET_VIDEO_URL}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
            />
          )}
          <div className="zap-planet-vignette" />
        </div>

        <ContainerScroll
          className="relative z-10 flex items-end justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-0 sm:pt-36 lg:pt-40 sm:pb-0"
          perspectiveClassName="w-full max-w-[1220px] mx-auto relative"
          scrollOffset={['start start', 'end center']}
          rotateRange={[16, 0]}
          translateRange={[0, 0]}
          mobileScaleRange={[1, 1]}
          desktopScaleRange={[1, 1]}
          cardTransformOrigin="bottom center"
          headerClassName="max-w-5xl mx-auto text-center mb-8 sm:mb-10"
          cardClassName="max-w-[1204px] mx-auto w-full h-[17.5rem] sm:h-[20.5rem] lg:h-[22rem] border border-b-0 border-blue-500/40 p-1.5 pb-0 sm:p-2.5 sm:pb-0 bg-[#090e1c]/90 rounded-t-[18px] sm:rounded-t-[24px] rounded-b-none shadow-2xl relative"
          cardInnerClassName="h-full w-full overflow-hidden rounded-t-[13px] sm:rounded-t-[18px] rounded-b-none bg-[#070a10] border border-b-0 border-white/10"
          cardTopSlot={
            <img
              src={DASHBOARD_GLOW_URL}
              alt=""
              aria-hidden="true"
              className="zap-dashboard-glow"
            />
          }
          titleComponent={
            <div className="zap-copy">
              <h1 className="zap-headline">
                <span className="zap-headline-line zap-anim-line-1">
                  <span className="zap-brand-grad">Every Drop.</span>{' '}
                  <span className="zap-smarter">Every Watt.</span>
                </span>
                <span className="zap-headline-line zap-anim-line-2">
                  Zero Blind Spots.
                </span>
              </h1>

              <p className="zap-lede zap-anim-lede text-balance">
              A smart IoT platform that monitors water flow, tracks resource usage, and turns sensor data into useful insights.
              </p>

              <div className="zap-actions zap-anim-actions">
                <Link to="/dashboard" className="zap-pill-violet zap-hero-btn">
                  Open Console
                </Link>
                <a
                  href="#bento-grid"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAnchorClick('#bento-grid');
                  }}
                  className="zap-pill-dark zap-hero-btn"
                >
                  Explore Stack
                </a>
              </div>
            </div>
          }
        >
          <div className="zap-dashboard-wrap">
            <div className="zap-dashboard-panel">
              {/* Thin glowing blue edge line */}
              <div className="zap-dashboard-top-line" aria-hidden="true" />

              {/* Left Sidebar */}
              <aside className="zap-sidebar zap-anim-dash-item">
                <div className="zap-sidebar-brand">
                  <div className="zap-sidebar-brand-left">
                    <span className="zap-sidebar-mark">
                      <BrandLogo
                        size="xs"
                        decorative
                        className="!w-[22px] !h-[22px] !p-[1.5px] !rounded-[6px] !border-white/20"
                      />
                    </span>
                    <span>AquaWatt</span>
                  </div>
                  <Settings size={14} className="zap-muted-icon" />
                </div>

                <div className="zap-sidebar-group">
                  {SIDEBAR_PRIMARY.map((item) => {
                    const Icon = item.icon;
                    const active = activeSidebar === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveSidebar(item.id)}
                        className={`zap-sidebar-item ${active ? 'is-active' : ''}`}
                      >
                        <Icon size={14} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="zap-sidebar-divider" />

                <div className="zap-sidebar-group">
                  {SIDEBAR_SECONDARY.map((item) => {
                    const Icon = item.icon;
                    const active = activeSidebar === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveSidebar(item.id)}
                        className={`zap-sidebar-item ${active ? 'is-active' : ''}`}
                      >
                        <Icon size={14} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="zap-promo-card">
                  <div className="zap-promo-head">
                    <Sparkles size={13} className="zap-promo-spark" />
                    <span>AquaWatt Pro</span>
                  </div>
                  <p>FS-S401 flow alerts, Gemini anomaly guard &amp; multi-node metering.</p>
                  <Link to="/subscription" className="zap-upgrade-pill">
                    Upgrade
                  </Link>
                </div>
              </aside>

              {/* Right Main Dashboard Content */}
              <div className="zap-dash-main">
                {/* Top Bar */}
                <div className="zap-dash-topbar zap-anim-dash-item">
                  <div className="zap-dash-topbar-left">
                    <span className="zap-dash-crumb">
                      {sidebarBreadcrumbs[activeSidebar] ?? 'Telemetry Overview'}
                    </span>
                    <span className="zap-dash-live-dot" />
                    <span className="zap-dash-net">ESP32-Grid · 14ms</span>
                  </div>

                <div className="zap-dash-topbar-right">
                  <span className="zap-icon-chip" aria-hidden="true">
                    <SlidersHorizontal size={13} />
                  </span>
                  <span className="zap-icon-chip" aria-hidden="true">
                    <Bell size={13} />
                  </span>
                  <div className="zap-user-chip">
                    <span className="zap-user-avatar">TB</span>
                    <span className="zap-user-name">Testbench UI</span>
                    <span className="zap-user-addr">#ESP32-NODE-01</span>
                  </div>
                </div>
              </div>

              {/* Content Grid: Left (Stats + Chart) & Right (Calendar + Rows) */}
              <div className="zap-dash-grid">
                <div className="zap-dash-left">
                  {/* Stats Row */}
                  <div className="zap-stats-row zap-anim-dash-item">
                    <div className="zap-stat-card">
                      <div className="zap-stat-label">
                        Daily demo inflow{' '}
                        <span className="zap-stat-sub">(simulated)</span>
                      </div>
                      <div className="zap-stat-value-row">
                        <span className="zap-stat-value">384 L</span>
                        <span className="zap-delta-pos">-14.2%</span>
                      </div>
                    </div>

                    <div className="zap-stat-card">
                      <div className="zap-stat-label">Flow hardware</div>
                      <div className="zap-stat-value-row">
                        <span className="zap-stat-value">FS-S401</span>
                        <span className="zap-delta-pos">GPIO34</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart Card */}
                  <div className="zap-chart-card zap-anim-dash-item">
                    <div className="zap-chart-head">
                      <span className="zap-chart-title">
                        Daily flow &amp; watt efficiency
                      </span>
                      <span className="zap-chart-badge">
                        <ArrowUpRight size={12} />
                        +18.4%
                      </span>
                    </div>

                    <div className="zap-chart-svg-wrap">
                      <svg
                        viewBox="0 0 580 155"
                        preserveAspectRatio="none"
                        className="zap-chart-svg"
                      >
                        <defs>
                          <linearGradient
                            id="zapAreaFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#2563eb"
                              stopOpacity="0.46"
                            />
                            <stop
                              offset="65%"
                              stopColor="#1d4ed8"
                              stopOpacity="0.12"
                            />
                            <stop
                              offset="100%"
                              stopColor="#1d4ed8"
                              stopOpacity="0"
                            />
                          </linearGradient>
                          <linearGradient
                            id="zapLineStroke"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#1d4ed8" />
                            <stop offset="50%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal subtle grid lines */}
                        <line
                          x1="0"
                          y1="32"
                          x2="580"
                          y2="32"
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="3 4"
                        />
                        <line
                          x1="0"
                          y1="74"
                          x2="580"
                          y2="74"
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="3 4"
                        />
                        <line
                          x1="0"
                          y1="116"
                          x2="580"
                          y2="116"
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="3 4"
                        />

                        {/* Area Fill */}
                        <path
                          d="M0,132 C38,128 58,96 96,102 C134,108 158,64 198,68 C238,72 260,92 302,52 C344,12 372,48 412,38 C452,28 480,14 522,20 C550,24 566,10 580,8 L580,155 L0,155 Z"
                          fill="url(#zapAreaFill)"
                        />

                        {/* Blue Curve */}
                        <path
                          d="M0,132 C38,128 58,96 96,102 C134,108 158,64 198,68 C238,72 260,92 302,52 C344,12 372,48 412,38 C452,28 480,14 522,20 C550,24 566,10 580,8"
                          fill="none"
                          stroke="url(#zapLineStroke)"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />

                        {/* Highlight point */}
                        <circle
                          cx="412"
                          cy="38"
                          r="7"
                          fill="rgba(59, 130, 246, 0.25)"
                        />
                        <circle
                          cx="412"
                          cy="38"
                          r="3.5"
                          fill="#f7f7f8"
                          stroke="#2563eb"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Right Calendar & Metrics Card */}
                <div className="zap-calendar-card zap-anim-dash-item">
                  <div className="zap-cal-header">
                    <div>
                      <div className="zap-cal-month">November 2026</div>
                      <div className="zap-cal-range">
                        Billing cycle–Now (daily)
                      </div>
                    </div>
                    <span className="zap-cal-icon">
                      <Calendar size={14} />
                    </span>
                  </div>

                  {/* Compact calendar week strip */}
                  <div className="zap-cal-strip" aria-hidden="true">
                    {['10', '11', '12', '13', '14', '15', '16'].map((d) => (
                      <span
                        key={d}
                        className={`zap-cal-day ${d === '16' ? 'is-active' : ''}`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  <div className="zap-cal-rows">
                    <div className="zap-cal-row">
                      <span className="zap-cal-row-label">Avg. flow rate</span>
                      <div className="zap-cal-row-vals">
                        <span className="zap-cal-row-num">4.2 L/min</span>
                        <span className="zap-delta-pos">−6.4%</span>
                      </div>
                    </div>

                    <div className="zap-cal-row">
                      <span className="zap-cal-row-label">Sampling rate</span>
                      <div className="zap-cal-row-vals">
                        <span className="zap-cal-row-num">1.0 Hz</span>
                      </div>
                    </div>

                    <div className="zap-cal-row">
                      <span className="zap-cal-row-label">Efficiency score</span>
                      <div className="zap-cal-row-vals">
                        <span className="zap-cal-row-num">94.2%</span>
                        <span className="zap-delta-pos">+3.1%</span>
                      </div>
                    </div>
                  </div>

                  <div className="zap-connected-apps">
                    <span className="zap-connected-label">Connected nodes:</span>
                    <div className="zap-connected-pills">
                      <span>
                        <Activity size={11} /> FS-S401
                      </span>
                      <span className="zap-dot-sep">·</span>
                      <span>
                        <Cpu size={11} /> INA219
                      </span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#070a10] via-[#070a10]/65 to-transparent z-10"
              />
            </div>
          </div>
        </ContainerScroll>
      </div>
    </section>
  );
};

export default ZaplineHeroSection;
