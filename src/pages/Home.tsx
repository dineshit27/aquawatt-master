import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketingNavbar } from '../components/navigation/MarketingNavbar';
import { Footer } from '../components/navigation/Footer';
import Integrations2 from '../components/ui/integrations-2';
import { Pricing1, PricingPlan } from '../components/ui/pricing-1';
import { CircuitBoard, CircuitNodeType, CircuitConnection } from '../components/ui/circuit-board';
import { HighlightTestimonialSection, type Testimonial } from '../components/ui/highlight-testimonial-section';
import { ScrollProgress } from '../components/common/ScrollProgress';
import { Seo } from '../components/common/Seo';
import { ToastContainer } from '../components/common/ToastContainer';
import { useApp } from '../context/AppContext';
import {
  Droplet,
  Zap,
  ArrowRight,
  Activity,
  Cpu,
  Wifi,
  Database,
  Server,
  Shield,
  Trophy,
  Radio,
  Thermometer,
  Monitor,
} from 'lucide-react';
import { TESTIMONIALS } from '../data/mockData';
import { ConservationLedgerSection } from '../components/home/ConservationLedgerSection';
import { FeatureMosaicSection } from '../components/home/FeatureMosaicSection';
import { FaqSection } from '../components/home/FaqSection';
import { Hero9CtaSection } from '../components/home/Hero9CtaSection';
import { VisualTelemetrySection } from '../components/home/VisualTelemetrySection';
import { ZaplineHeroSection } from '../components/home/ZaplineHeroSection';
import { LandingLeadingPill } from '../components/landing/leading/LandingLeadingPill';
import sensorImg from '../assets/images/iot_ultrasonic_flow_sensor_1793896013850.jpg';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Interactive Valve Telemetry State
  const [valveState, setValveState] = useState<'open' | 'closed'>('open');
  const [bentoPulseRate, setBentoPulseRate] = useState<'1.0' | '2.5' | '4.0'>('2.5');
  const [pilotIndex, setPilotIndex] = useState(0);

  const pilotHighlights = [
    'FS-S401 turbine pulses accurately',
    'without distorting demo baselines',
    'Supabase PostgreSQL RLS tables',
  ];

  const fieldTestimonials: Testimonial[] = TESTIMONIALS.map((item, idx) => ({
    quote: item.quote,
    highlight: pilotHighlights[idx] ?? '',
    author: item.author,
    role: `${item.role} · ${item.organization}`,
  }));

  const handleTripValve = () => {
    if (valveState === 'open') {
      setValveState('closed');
      showToast('(Frontend Demo) Simulated valve tripped: Flow restricted to 0.00 L/min. Physical ESP32 actuator unlinked.', 'alert');
    } else {
      setValveState('open');
      showToast('(Frontend Demo) Simulated valve reopened: Inflow restored to normal passage.', 'info');
    }
  };

  const pricingPlans: PricingPlan[] = [
    {
      id: 'starter',
      title: 'Starter Explorer',
      description: 'Essential telemetry for conscious residential apartments and studios.',
      price: '₹0',
      priceSuffix: '/ month',
      features: [
        { text: '2 Sensor inputs' },
        { text: '24-hr live telemetry streaming' },
        { text: 'Standard community challenges' },
        { text: 'Mobile & web console access' },
      ],
      buttonText: 'Free',
      isPopular: false,
    },
    {
      id: 'standard-pro',
      title: 'Standard Pro',
      description: 'Comprehensive IoT telemetry, simulated anomaly alerts, and conservation insights.',
      price: billingCycle === 'yearly' ? '₹399' : '₹499',
      priceSuffix: '/ month',
      features: [
        { text: 'Up to 12 smart sensors & nodes' },
        { text: 'Instant simulated leak alert trigger' },
        { text: 'Simulated valve trip test controls' },
        { text: 'Full AI predictive conservation' },
        { text: 'Real CSV & JSON historical audit export' },
      ],
      buttonText: billingCycle === 'yearly' ? '₹399' : '₹499',
      isPopular: true,
    },
    {
      id: 'enterprise-eco',
      title: 'Enterprise Eco',
      description: 'Multi-node testbench telemetry, facility submeters, and carbon avoidance accounting.',
      price: billingCycle === 'yearly' ? '₹1,199' : '₹1,499',
      priceSuffix: '/ month',
      features: [
        { text: 'Unlimited nodes & submeters' },
        { text: 'Carbon emissions avoidance ledger' },
        { text: 'REST & MQTT webhook bridges' },
        { text: 'Repository issue & architecture docs' },
      ],
      buttonText: billingCycle === 'yearly' ? '₹1,199' : '₹1,499',
      isPopular: false,
    },
  ];

  const circuitNodes: CircuitNodeType[] = [
    {
      id: 'fs_s401',
      x: 105,
      y: 68,
      label: 'FS-S401 Flow (GPIO34)',
      sublabel: 'Operational',
      icon: <Droplet className="w-4 h-4" />,
      status: 'operational',
      size: 'md',
    },
    {
      id: 'ina219',
      x: 105,
      y: 185,
      label: 'INA219 Power Module',
      sublabel: 'Installed — Calibration Pending',
      icon: <Zap className="w-4 h-4" />,
      status: 'pending',
      size: 'md',
    },
    {
      id: 'pressure_temp',
      x: 105,
      y: 305,
      label: 'Pressure & Temp Sensors',
      sublabel: 'Planned · Not Implemented',
      icon: <Thermometer className="w-4 h-4" />,
      status: 'planned',
      size: 'md',
    },
    {
      id: 'esp32',
      x: 280,
      y: 185,
      label: 'ESP32 DevKit',
      sublabel: 'Operational',
      icon: <Cpu className="w-5 h-5" />,
      status: 'operational',
      size: 'lg',
    },
    {
      id: 'lcd_16x2',
      x: 445,
      y: 68,
      label: '16×2 LCD Display',
      sublabel: 'Operational (ESP32)',
      icon: <Monitor className="w-4 h-4" />,
      status: 'operational',
      size: 'md',
    },
    {
      id: 'wifi',
      x: 445,
      y: 185,
      label: 'Wi-Fi Transport',
      sublabel: 'Implemented · Verif. Pending',
      icon: <Wifi className="w-4 h-4" />,
      status: 'pending',
      size: 'md',
    },
    {
      id: 'ball_valve',
      x: 445,
      y: 305,
      label: 'Motorized Ball Valve',
      sublabel: 'Planned · Not Connected',
      icon: <Shield className="w-4 h-4" />,
      status: 'planned',
      size: 'md',
    },
    {
      id: 'mqtt_broker',
      x: 605,
      y: 185,
      label: 'MQTT Broker',
      sublabel: 'Implemented · Verif. Pending',
      icon: <Radio className="w-4 h-4" />,
      status: 'pending',
      size: 'md',
    },
    {
      id: 'mqtt_ingestion',
      x: 765,
      y: 185,
      label: 'MQTT Ingestion',
      sublabel: 'E2E Verif. Pending',
      icon: <Activity className="w-4 h-4" />,
      status: 'pending',
      size: 'md',
    },
    {
      id: 'supabase',
      x: 925,
      y: 185,
      label: 'Supabase PostgreSQL',
      sublabel: 'Live Pipeline Pending',
      icon: <Database className="w-4 h-4" />,
      status: 'pending',
      size: 'md',
    },
    {
      id: 'dashboard_ai',
      x: 1065,
      y: 185,
      label: 'Dashboard / MCP / AI',
      sublabel: 'Software Implemented',
      icon: <Server className="w-5 h-5" />,
      status: 'operational',
      size: 'lg',
    },
  ];

  const circuitConnections: CircuitConnection[] = [
    // Verified operational paths (Green)
    { from: 'fs_s401', to: 'esp32', animated: true, arrow: true, color: 'rgba(16, 185, 129, 0.55)', pulseColor: 'rgba(16, 185, 129, 0.95)' },
    { from: 'esp32', to: 'lcd_16x2', animated: true, arrow: true, color: 'rgba(16, 185, 129, 0.55)', pulseColor: 'rgba(16, 185, 129, 0.95)' },
    // Pending calibration / verification (Amber)
    { from: 'ina219', to: 'esp32', animated: false, dashed: true, arrow: true, color: 'rgba(245, 158, 11, 0.6)', pulseColor: 'rgba(245, 158, 11, 0.9)' },
    // Simulated data transport (Blue)
    { from: 'esp32', to: 'wifi', animated: true, arrow: true, color: 'rgba(59, 130, 246, 0.5)', pulseColor: 'rgba(59, 130, 246, 0.95)' },
    // Pending verification pipeline (Amber simulated trace)
    { from: 'wifi', to: 'mqtt_broker', animated: true, arrow: true, color: 'rgba(245, 158, 11, 0.5)', pulseColor: 'rgba(245, 158, 11, 0.9)' },
    { from: 'mqtt_broker', to: 'mqtt_ingestion', animated: true, arrow: true, color: 'rgba(245, 158, 11, 0.5)', pulseColor: 'rgba(245, 158, 11, 0.9)' },
    { from: 'mqtt_ingestion', to: 'supabase', animated: true, arrow: true, color: 'rgba(245, 158, 11, 0.5)', pulseColor: 'rgba(245, 158, 11, 0.9)' },
    // Simulated data transport to implemented software layer (Blue)
    { from: 'supabase', to: 'dashboard_ai', animated: true, arrow: true, color: 'rgba(59, 130, 246, 0.5)', pulseColor: 'rgba(59, 130, 246, 0.95)' },
    // Planned / not connected components (Neutral Grey dashed, static)
    { from: 'pressure_temp', to: 'esp32', animated: false, dashed: true, arrow: true, color: 'rgba(100, 116, 139, 0.5)', pulseColor: 'rgba(100, 116, 139, 0.7)' },
    { from: 'esp32', to: 'ball_valve', animated: false, dashed: true, arrow: true, color: 'rgba(100, 116, 139, 0.5)', pulseColor: 'rgba(100, 116, 139, 0.7)' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB] dark:bg-[#070B13] text-[#17263F] dark:text-[#E2E8F0] selection:bg-[#174A8B] selection:text-white transition-colors overflow-x-clip font-sans">
      <Seo
        title="AquaWatt — Water & Energy Monitoring with ESP32 IoT Sensors"
        description="AquaWatt tracks water flow and electrical load from ESP32 sensors in one dashboard, with usage history, anomaly flags and a Gemini-powered assistant."
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[120] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#174A8B] focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <ScrollProgress />
      <ToastContainer />
      <MarketingNavbar darkHero />

      <main id="main-content" tabIndex={-1} className="focus:outline-hidden">
      {/* SECTION 1: HERO SECTION */}
      <ZaplineHeroSection />

      {/* SUSTAINABILITY IMPACT & CERTIFIED CONSERVATION LEDGER */}
      <ConservationLedgerSection />

      {/* HERO FEATURE MOSAIC — AUTOMATE YOUR WORK */}
      <div id="zapline-advantage">
        <FeatureMosaicSection />
      </div>

      {/* SECTION 4: ASYMMETRIC BENTO GRID — PLATFORM ARCHITECTURE */}
      <section id="bento-grid" className="py-24 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-16">
          <LandingLeadingPill
            borderVariant="primary"
            textVariant="primary"
            className="mb-3"
          >
            System Stack
          </LandingLeadingPill>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-slate-900 dark:text-white mt-1 text-balance">
            Modular Hardware & Cloud Intelligence
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Every capability is engineered around real physical constraints: Hall-effect turbine pulse
            physics, DC/CT power calibration, and simulated shutoff testing.
          </p>
        </div>

        {/* Truly Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Bento Card 1: Flow Sensor Interfacing & Product Photo (7 Cols, Tall) */}
          <div className="md:col-span-7 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/90 dark:border-slate-800/90 shadow-xs p-5 sm:p-7 flex flex-col justify-between group hover:border-[#174A8B]/50 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-4">
                <span className="text-[#174A8B] dark:text-sky-400 font-bold uppercase">Hardware 01</span>
                <span>ESP32 Flow Transducer Node</span>
              </div>

              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Precision Pulse & Inline Flow Monitoring
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed max-w-lg">
                Connects to standard Hall-effect pulse flow meters (verified with FS-S401 on GPIO34).
                An ESP32 GPIO hardware interrupt captures rotational pulse frequencies, calculating flow rate and total consumed volume locally.
              </p>

              {/* Sensor Studio Photo */}
              <div className="mt-6 h-56 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 relative">
                <img
                  src={sensorImg}
                  alt="Industrial Water Flow Sensor"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded bg-slate-950/80 backdrop-blur-xs text-[11px] font-mono text-white border border-white/10">
                  Pulse Envelope: {bentoPulseRate} L/min Scale · Simulated Profile
                </div>
              </div>
            </div>

            {/* Interactive Pulse Scale Selector */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
              <span className="text-slate-500">Testbench Flow Envelope:</span>
              <div role="group" aria-label="Select testbench flow rate profile" className="flex items-center gap-1.5">
                {(['1.0', '2.5', '4.0'] as const).map(rate => (
                  <button
                    key={rate}
                    type="button"
                    aria-pressed={bentoPulseRate === rate}
                    onClick={() => setBentoPulseRate(rate)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      bentoPulseRate === rate
                        ? 'bg-[#174A8B] text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {rate} L/min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Card 2: Planned Safety Layer / Edge Prototype (5 Cols) */}
          <div className="md:col-span-5 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/90 dark:border-slate-800/90 shadow-xs p-5 sm:p-7 flex flex-col justify-between group hover:border-[#237A57]/50 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-4">
                <span className="text-[#237A57] dark:text-emerald-400 font-bold uppercase">Prototype 02</span>
                <span>Planned Safety Layer</span>
              </div>

              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                Edge Isolation Valve Prototype
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Models local relay cutoff sequences for motorized ball valves in a planned hardware safety phase. Currently operates in frontend simulation only.
              </p>

              {/* Valve Diagrammatic Micro-UI */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Simulated State:</span>
                  <span className={`font-bold ${valveState === 'closed' ? 'text-rose-600 dark:text-rose-400' : 'text-[#237A57] dark:text-emerald-400'}`}>
                    {valveState === 'closed' ? 'ISOLATED (90° TRIP)' : 'NORMAL PASSAGE (0° OPEN)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Hardware Status:</span>
                  <span className="text-slate-800 dark:text-slate-200">Planned · Actuator Unlinked</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Fail-Safe:</span>
                  <span className="text-slate-800 dark:text-slate-200">Supercapacitor Reserve</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-mono text-slate-400">Software Simulation (&lt; 450ms)</span>
              <button
                type="button"
                aria-pressed={valveState === 'closed'}
                onClick={handleTripValve}
                className="px-3.5 py-1.5 rounded-lg bg-[#237A57] hover:bg-[#1C6347] text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                {valveState === 'closed' ? 'Re-arm Simulated Valve' : 'Simulate Trip Protocol'}
              </button>
            </div>
          </div>

          {/* Bento Card 3: Dynamic Tariff Arbitrage Engine (4 Cols) */}
          <div className="md:col-span-4 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/90 dark:border-slate-800/90 shadow-xs p-6 flex flex-col justify-between hover:border-amber-400/50 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
                <span className="text-amber-600 dark:text-amber-400 font-bold uppercase">Analytics 03</span>
                <span>TOU Rates (INR)</span>
              </div>
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                Predictive Tariff Arbitrage
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Models shifting thermal storage, EV charging, and dishwashing into low-cost predawn tariff windows.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-800 dark:text-amber-300">
                Modeled Savings: <span className="font-bold">+₹750 / month</span>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-400">
              Peak: ₹9.40/kWh · Off-Peak: ₹6.40/kWh
            </div>
          </div>

          {/* Bento Card 4: INA219 DC Power Integration (4 Cols) */}
          <div className="md:col-span-4 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/90 dark:border-slate-800/90 shadow-xs p-6 flex flex-col justify-between hover:border-sky-400/50 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
                <span className="text-[#174A8B] dark:text-sky-400 font-bold uppercase">Power Module 04</span>
                <span>INA219 I2C (Pending)</span>
              </div>
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                INA219 DC Bus Integration
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                High-side I2C DC voltage and current sensing stage in testbench development; calibration pending before live physical metrics populate.
              </p>
              <div className="mt-4 flex items-end gap-1.5 h-10 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800">
                {[20, 35, 60, 45, 90, 30, 25, 40, 55, 30].map((h, i) => (
                  <div key={i} className="flex-1 bg-[#174A8B]/40 dark:bg-sky-400/40 rounded-t-xs" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-400">
              INA219 Calibration Pending · Nullable DB Columns
            </div>
          </div>

          {/* Bento Card 5: ESP32 Wi-Fi & MQTT Telemetry Bridge (4 Cols) */}
          <div className="md:col-span-4 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/90 dark:border-slate-800/90 shadow-xs p-6 flex flex-col justify-between hover:border-emerald-400/50 transition-all">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
                <span className="text-[#237A57] dark:text-emerald-400 font-bold uppercase">Network 05</span>
                <span>Wi-Fi + MQTT Transport</span>
              </div>
              <h3 className="text-base font-bold font-heading text-slate-900 dark:text-white">
                ESP32 MQTT Broker Bridge
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Transmits JSON telemetry packets over standard 2.4 GHz Wi-Fi to a local or cloud MQTT broker with automatic reconnection and serial terminal logging.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-800 dark:text-emerald-300">
                Signal: -62 dBm RSSI · QoS Level 1
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-400">
              Serial Output: 115200 Baud Terminal Stream
            </div>
          </div>

        </div>

        {/* SECTION 4 WORKFLOW ANIMATION: HARDWARE-TO-CLOUD CIRCUIT BOARD */}
        <div className="mt-10 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/90 dark:border-slate-800/90 shadow-xs p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <LandingLeadingPill
                borderVariant="primary"
                textVariant="primary"
                className="mb-2"
              >
                Signal Pipeline
              </LandingLeadingPill>
              <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
                Hardware-to-Cloud Telemetry Circuit Workflow
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Simulated architecture visualization of verified ESP32 edge hardware (FS-S401 GPIO34 &amp; 16×2 LCD), pending Wi-Fi/MQTT-to-Supabase pipeline verification, implemented Dashboard/MCP/AI software, and future local safety control.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-[#174A8B] dark:text-sky-300 border border-sky-500/25 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Animated Architecture Visualization
              </span>
            </div>
          </div>

          {/* Simulation notice & status legend */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
              Simulation Notice: Animated traces illustrate target architecture — not live MQTT telemetry
            </span>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Operational (Verified)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Pending Verification
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Data Transport (Simulated)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Planned (Not Connected)
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-4 scrollbar-thin">
            <div className="min-w-[1160px] flex justify-center py-2">
              <CircuitBoard
                nodes={circuitNodes}
                connections={circuitConnections}
                width={1160}
                height={390}
                gridSize={24}
                showGrid={true}
                showArrows={true}
                pulseSpeed={2.2}
                traceWidth={2}
                className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/60"
              />
            </div>
          </div>

          {/* Architecture Pipeline Diagnostics Strip */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[11px]">Operational Edge Hardware</span>
              <span className="font-semibold text-[#237A57] dark:text-emerald-400">FS-S401 · ESP32 · 16×2 LCD</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Pending Verification</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">INA219 · Wi-Fi · MQTT · Ingestion</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Cloud &amp; Application Layer</span>
              <span className="font-semibold text-[#174A8B] dark:text-sky-400">Supabase · Dashboard / MCP / AI</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Planned Safety Layer</span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">Future Local Safety Control</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: VISUAL TELEMETRY ENGINE (DUNE FLOW) */}
      <VisualTelemetrySection />

      {/* SECTION 8: COMMUNITY SPRINT & VERIFIED SWISS CASE STUDIES */}
      <section className="py-24 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left 6 Cols: Community Challenge Preview */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <LandingLeadingPill
                borderVariant="primary"
                textVariant="primary"
                className="mb-2"
              >
                Saving Sprints
              </LandingLeadingPill>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
                Collaborative Saving Sprints
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Join monthly resource reduction challenges, climb facility leaderboards, and earn verifiable conservation milestones.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-sky-950 text-[#174A8B] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      The 40-Gallon Daily Baseline Drop
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Demo Challenge · 6 days remaining
                    </p>
                  </div>
                </div>
                <Link
                  to="/community"
                  className="px-3.5 py-1.5 rounded-lg bg-[#174A8B] text-white text-xs font-semibold hover:bg-[#123A6F] transition-colors self-start sm:self-auto shrink-0"
                >
                  Join Sprint
                </Link>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0E1626] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#237A57] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Phantom &amp; Vampire Power Exterminator
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Demo Challenge · 3 days remaining
                    </p>
                  </div>
                </div>
                <Link
                  to="/community"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto shrink-0"
                >
                  Inspect
                </Link>
              </div>
            </div>

            <div>
              <Link
                to="/community"
                className="text-xs text-[#174A8B] dark:text-sky-400 font-semibold hover:underline flex items-center gap-1.5"
              >
                <span>Explore Full Leaderboard &amp; Badges</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right 6 Cols: Engineering Validation Notes */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <LandingLeadingPill
                borderVariant="emerald"
                textVariant="emerald"
                className="mb-2"
              >
                Architecture Notes
              </LandingLeadingPill>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
                Testbench Engineering Notes
              </h2>
            </div>

            <HighlightTestimonialSection
              testimonials={fieldTestimonials}
              index={pilotIndex}
              onIndexChange={setPilotIndex}
              interval={4500}
              eyebrow="Testbench note"
            />

            {TESTIMONIALS[pilotIndex]?.metrics && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-mono">
                <span className="text-slate-500 dark:text-slate-400">
                  Validation note ({pilotIndex + 1}/{TESTIMONIALS.length})
                </span>
                <span className="font-semibold text-[#237A57] dark:text-emerald-400">
                  {TESTIMONIALS[pilotIndex].metrics}
                </span>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* SECTION 9: TRANSPARENT SUBSCRIPTION TIERS */}
      <section className="py-20 bg-white dark:bg-[#0B111D] border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-12">
            <LandingLeadingPill
              borderVariant="primary"
              textVariant="primary"
              className="mb-3"
            >
              Plans &amp; Tiers
            </LandingLeadingPill>
            <h2 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white mt-1">
              Engineered Telemetry Subscriptions
            </h2>
            
            <div role="group" aria-label="Billing frequency" className="mt-5 inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1 rounded-2xl sm:rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
              <button
                type="button"
                aria-pressed={billingCycle === 'monthly'}
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                aria-pressed={billingCycle === 'yearly'}
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-500'
                }`}
              >
                <span>Yearly Billing</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <Pricing1
            plans={pricingPlans}
            className="px-0 md:px-0"
            onSelectPlan={(planId) => navigate(`/subscription?plan=${planId}&billing=${billingCycle}`)}
          />
        </div>
      </section>

      {/* SECTION 10: TECHNOLOGY ECOSYSTEM */}
      <section className="py-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#070B13] transition-colors">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 mb-4 text-center">
          <LandingLeadingPill
            borderVariant="primary"
            textVariant="primary"
            className="mb-3"
          >
            Tech Stack
          </LandingLeadingPill>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
            Built With Technologies That Power AquaWatt
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            An IoT, cloud and AI ecosystem designed for intelligent water and energy monitoring.
          </p>
        </div>
        <Integrations2 />
      </section>

      {/* SECTION 10.8: ANIMATED GRADIENT CTA + FAQ ACCORDION */}
      <div id="faq-section">
        <FaqSection />
      </div>

      {/* SECTION 11.5: SKY GLASS CALL TO ACTION */}
      <Hero9CtaSection />
      </main>

      {/* SECTION 12: FOOTER */}
      <Footer />
    </div>
  );
};
