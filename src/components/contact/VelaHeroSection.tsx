import React, { useEffect, useRef } from 'react';
import { Mail, Search } from 'lucide-react';

interface VelaWordSpec {
  word: string;
  icon: string;
  alt: string;
}

const WORDS: VelaWordSpec[] = [
  {
    word: 'Message',
    icon: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/83de7c35-dd91-4e56-bfb8-0ffafc83d0e0.webp',
    alt: 'Rounded 3D chat bubble icon',
  },
  {
    word: 'Diagnose',
    icon: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4d952211-0474-48cc-af48-58f68b3b7525.webp',
    alt: 'Four-pointed 3D sparkle star icon',
  },
  {
    word: 'Calibrate',
    icon: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e2e91fca-5b3f-4e0e-a437-8a581592e407.webp',
    alt: 'Curved cycling calibration arrows icon',
  },
  {
    word: 'Connect',
    icon: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/6b32bb47-4ad6-4938-a637-c997b373c68b.webp',
    alt: '3D network globe icon',
  },
];

const SLOT_DURATION = 1750;
const CYCLE_DURATION = SLOT_DURATION * WORDS.length; // 7000ms
const ENTER_DURATION = 500;
const ICON_LAG = 60;
const LEAVE_DURATION = 420;
const CROSSFADE_WINDOW = 770;
const HALF_CROSS = CROSSFADE_WINDOW / 2;

function easeOutCubic(t: number): number {
  const u = 1 - Math.max(0, Math.min(1, t));
  return 1 - u * u * u;
}

function easeInCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c;
}

function circularDist(t: number, center: number, period: number): number {
  let d = (t - center) % period;
  if (d > period / 2) d -= period;
  if (d < -period / 2) d += period;
  return d;
}

export const VelaHeroSection: React.FC<{ onScrollLearnMore?: () => void }> = ({
  onScrollLearnMore,
}) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const iconWrapRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const gradRefs = useRef<Array<HTMLDivElement | null>>([]);
  const appStoreBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyStaticBrowse = () => {
      wordRefs.current.forEach((el, idx) => {
        if (!el) return;
        el.style.opacity = idx === 1 ? '1' : '0';
        el.style.transform = 'none';
        el.style.filter = 'none';
      });
      iconWrapRefs.current.forEach((el) => {
        if (!el) return;
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      gradRefs.current.forEach((el, idx) => {
        if (!el) return;
        el.style.opacity = idx === 1 ? '1' : '0';
        el.style.transform = 'scale(1.08)';
      });
      appStoreBtnRef.current?.classList.remove('is-active-dark');
    };

    if (reducedMotion || typeof root.animate !== 'function') {
      applyStaticBrowse();
      return;
    }

    // Single clock Web Animation driving the entire hero timeline
    const clockAnim = root.animate([], {
      duration: 1_000_000_000,
      iterations: Infinity,
    });

    const handleVisibility = () => {
      if (document.hidden) {
        clockAnim.pause();
      } else {
        clockAnim.play();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    if (document.hidden) {
      clockAnim.pause();
    }

    let rafId = 0;

    const tick = () => {
      const rawTime = Number(clockAnim.currentTime ?? 0);
      const t = ((rawTime % CYCLE_DURATION) + CYCLE_DURATION) % CYCLE_DURATION;

      // Update each word slot and its tinted icon
      WORDS.forEach((_, idx) => {
        const slotEl = wordRefs.current[idx];
        const iconEl = iconWrapRefs.current[idx];
        if (!slotEl || !iconEl) return;

        const slotStart = idx * SLOT_DURATION;
        const localT = t - slotStart;

        if (localT < 0 || localT >= SLOT_DURATION) {
          slotEl.style.opacity = '0';
          slotEl.style.transform = 'translateY(0.32em) scale(0.96)';
          slotEl.style.filter = 'blur(10px)';
          iconEl.style.opacity = '0';
          iconEl.style.transform = 'scale(0.7) rotate(-14deg)';
          return;
        }

        const leaveStart = SLOT_DURATION - LEAVE_DURATION;

        // Word opacity, rise, blur, scale
        let wordOpacity = 1;
        let wordYEm = 0;
        let wordBlur = 0;
        let wordScale = 1;

        if (localT < ENTER_DURATION) {
          const p = easeOutCubic(localT / ENTER_DURATION);
          wordOpacity = p;
          wordYEm = 0.32 * (1 - p);
          wordBlur = 10 * (1 - p);
          wordScale = 0.96 + 0.04 * p;
        } else if (localT >= leaveStart) {
          const p = easeInCubic((localT - leaveStart) / LEAVE_DURATION);
          wordOpacity = 1 - p;
          wordYEm = -0.16 * p;
          wordBlur = 8 * p;
        }

        slotEl.style.opacity = wordOpacity.toFixed(4);
        slotEl.style.transform = `translateY(${wordYEm.toFixed(4)}em) scale(${wordScale.toFixed(4)})`;
        slotEl.style.filter = wordBlur > 0.05 ? `blur(${wordBlur.toFixed(2)}px)` : 'none';

        // Icon enters 60ms later, scales 0.7->1 and untwists -14deg->0deg, plus gentle idle bob
        const idleBobY = Math.sin(rawTime * 0.0024 + idx) * 0.028;
        const idleRot = Math.cos(rawTime * 0.0019 + idx) * 3;

        if (localT < ICON_LAG) {
          iconEl.style.opacity = '0';
          iconEl.style.transform = 'scale(0.7) rotate(-14deg)';
        } else if (localT < ICON_LAG + ENTER_DURATION) {
          const ip = easeOutCubic((localT - ICON_LAG) / ENTER_DURATION);
          const iscale = 0.7 + 0.3 * ip;
          const irot = -14 * (1 - ip) + idleRot * ip;
          const ibob = idleBobY * ip;
          iconEl.style.opacity = ip.toFixed(4);
          iconEl.style.transform = `translateY(${ibob.toFixed(4)}em) scale(${iscale.toFixed(4)}) rotate(${irot.toFixed(2)}deg)`;
        } else {
          iconEl.style.opacity = '1';
          iconEl.style.transform = `translateY(${idleBobY.toFixed(4)}em) scale(1) rotate(${idleRot.toFixed(2)}deg)`;
        }
      });

      // Update stacked gradient crossfade (0.77s window straddling slot boundaries) + slow drift
      const gradWeights = [0, 0, 0, 0];
      const activeIdx = Math.floor(t / SLOT_DURATION);
      const nextIdx = (activeIdx + 1) % WORDS.length;
      const boundary = (activeIdx + 1) * SLOT_DURATION;
      const distToEnd = circularDist(t, boundary % CYCLE_DURATION, CYCLE_DURATION);

      if (Math.abs(distToEnd) <= HALF_CROSS) {
        const blend = (distToEnd + HALF_CROSS) / CROSSFADE_WINDOW; // 0 -> 1 across boundary
        const smooth = blend * blend * (3 - 2 * blend);
        gradWeights[activeIdx] = 1 - smooth;
        gradWeights[nextIdx] = smooth;
      } else {
        const prevIdx = (activeIdx - 1 + WORDS.length) % WORDS.length;
        const startBoundary = activeIdx * SLOT_DURATION;
        const distToStart = circularDist(t, startBoundary, CYCLE_DURATION);
        if (Math.abs(distToStart) <= HALF_CROSS) {
          const blend = (distToStart + HALF_CROSS) / CROSSFADE_WINDOW;
          const smooth = blend * blend * (3 - 2 * blend);
          gradWeights[prevIdx] = 1 - smooth;
          gradWeights[activeIdx] = smooth;
        } else {
          gradWeights[activeIdx] = 1;
        }
      }

      WORDS.forEach((_, idx) => {
        const gEl = gradRefs.current[idx];
        if (!gEl) return;
        gEl.style.opacity = gradWeights[idx].toFixed(4);
        const driftX = Math.sin(rawTime * 0.00045 + idx * 1.4) * 2.2;
        const driftY = Math.cos(rawTime * 0.00038 + idx * 1.1) * 1.6;
        gEl.style.transform = `translate(${driftX.toFixed(3)}%, ${driftY.toFixed(3)}%) scale(1.08)`;
      });

      // App Store button fills black with white text while "Build web" (slot 3) holds
      const buildWebStart = 3 * SLOT_DURATION;
      const buildWebLocal = t - buildWebStart;
      const isBuildWebHold =
        buildWebLocal >= ENTER_DURATION * 0.6 &&
        buildWebLocal <= SLOT_DURATION - LEAVE_DURATION * 0.4;
      if (appStoreBtnRef.current) {
        appStoreBtnRef.current.classList.toggle('is-active-dark', isBuildWebHold);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
      clockAnim.cancel();
    };
  }, []);

  const handleScrollHint = () => {
    if (onScrollLearnMore) {
      onScrollLearnMore();
    } else {
      document.getElementById('contact-channels')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTarget = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section ref={rootRef} className="vela-hero" aria-label="AquaWatt technical support and contact hero">
      <div className="vela-stage">
        {/* TOP 75% — PASTEL GRAIN PANEL */}
        <div className="vela-panel">
          {WORDS.map((item, idx) => (
            <div
              key={item.word}
              ref={(el) => {
                gradRefs.current[idx] = el;
              }}
              className={`vela-grad vela-grad-${idx}`}
              aria-hidden="true"
            />
          ))}
          <div className="vela-grain" aria-hidden="true" />

          <div className="vela-panel-inner">
            {/* Headline */}
            <h1 className="vela-headline">
              <span className="vela-line-1">
                {WORDS.map((item, idx) => (
                  <span
                    key={item.word}
                    ref={(el) => {
                      wordRefs.current[idx] = el;
                    }}
                    data-slot={idx}
                    className="vela-word-slot"
                  >
                    <span
                      ref={(el) => {
                        iconWrapRefs.current[idx] = el;
                      }}
                      className="vela-icon-wrap"
                    >
                      <img src={item.icon} alt={item.alt} referrerPolicy="no-referrer" />
                      <span className={`vela-tint vela-tint-${idx}`} aria-hidden="true" />
                    </span>
                    <span>{item.word}</span>
                  </span>
                ))}
              </span>
              <span className="vela-line-2">with our team</span>
            </h1>

            {/* Action buttons + Caption row */}
            <div className="vela-action-row">
              <div className="vela-stores">
                <button
                  ref={appStoreBtnRef}
                  type="button"
                  onClick={() => scrollToTarget('contact-form')}
                  className="vela-store-btn"
                >
                  <Mail aria-hidden="true" />
                  <span>Send an Inquiry</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToTarget('contact-faq')}
                  className="vela-store-btn"
                >
                  <Search aria-hidden="true" />
                  <span>Search Diagnostics</span>
                </button>
              </div>

              <p className="vela-caption">
                Direct engineering notes for ESP32 flow &amp; INA219
                <br />
                wiring, MQTT setup, and anomaly threshold support.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM 25% — CREAM STATS STRIP WITH CURVED S-NOTCH */}
        <div className="vela-strip">
          <div className="vela-notch-wrap" aria-hidden="true">
            <svg
              className="vela-notch-svg"
              viewBox="0 0 1440 62"
              preserveAspectRatio="none"
            >
              <path
                d="M0 62 H1062 C1092 62 1098 54 1116 34 C1138 9 1146 1 1178 1 H1440 V62 Z"
                fill="#FBF6EF"
              />
            </svg>
          </div>

          <button type="button" onClick={handleScrollHint} className="vela-scroll-hint">
            ↓ Scroll to support channels
          </button>

          <div className="vela-strip-inner">
            <p className="vela-strip-lead">
              Built for makers
              <br />
              &amp; facility teams
            </p>

            <div className="vela-stats">
              <div>
                <div className="vela-stat-val">ESP32</div>
                <div className="vela-stat-lbl">Testbench &amp; sensor focus</div>
              </div>
              <div>
                <div className="vela-stat-val">115,200</div>
                <div className="vela-stat-lbl">Serial baud diagnostics</div>
              </div>
              <div>
                <div className="vela-stat-val">FS-S401</div>
                <div className="vela-stat-lbl">Operational flow sensor</div>
              </div>
            </div>

            <svg className="vela-sprout" viewBox="0 0 44 44" fill="none" aria-hidden="true">
              <path
                d="M22 36V19"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M22 23C22 16 16 12 10 13C10 19 15 24 22 23Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 20C22 13 28 9 34 10C34 16 29 21 22 20Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 36H33"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
