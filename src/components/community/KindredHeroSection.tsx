import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

declare global {
  interface Window {
    __render?: (t: number) => void;
  }
}

const SHEET_URL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_025250_100df7b8-31fd-4614-aa4a-c1b7d5b6b273.png&w=1600&q=85';

const SRC = {
  LA: [0, 0.06, 0.47, 0.4] as const,
  RA: [0.53, 0.06, 0.47, 0.4] as const,
  LB: [0, 0.55, 0.47, 0.4] as const,
  RB: [0.53, 0.55, 0.47, 0.4] as const,
};

const LOOP = 20;
const LEVELS = [0, 0.26, 0.52, 0.78, 1] as const;
const TAU = Math.PI * 2;
const HAND_ASPECT = (0.4 * 1520) / (0.47 * 2688);

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smooth(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mixAt(t: number, on: number, off: number, dur: number): number {
  return smooth(on, on + dur, t) * (1 - smooth(off, off + dur, t));
}

function fract(x: number): number {
  return x - Math.floor(x);
}

function hash(a: number, b: number): number {
  return fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
}

interface SlicedTiles {
  LA: HTMLCanvasElement;
  RA: HTMLCanvasElement;
  LB: HTMLCanvasElement;
  RB: HTMLCanvasElement;
}

function sliceTile(img: HTMLImageElement, rect: readonly [number, number, number, number]): HTMLCanvasElement {
  const sx = rect[0] * img.naturalWidth;
  const sy = rect[1] * img.naturalHeight;
  const sw = rect[2] * img.naturalWidth;
  const sh = rect[3] * img.naturalHeight;

  const tile = document.createElement('canvas');
  tile.width = 420;
  tile.height = Math.max(1, Math.round((420 * sh) / sw));
  const tctx = tile.getContext('2d');
  if (tctx) {
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tile.width, tile.height);
  }
  return tile;
}

export const KindredHeroSection: React.FC<{ onJoinCircle?: () => void }> = ({ onJoinCircle }) => {
  const { theme } = useTheme();
  const heroRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const themeRef = useRef(theme);
  const renderImmediateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    themeRef.current = theme;
    renderImmediateRef.current?.();
  }, [theme]);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (!hero || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fA = document.createElement('canvas');
    const fB = document.createElement('canvas');
    const ctxA = fA.getContext('2d', { willReadFrequently: true });
    const ctxB = fB.getContext('2d', { willReadFrequently: true });
    if (!ctxA || !ctxB) return;

    let tiles: SlicedTiles | null = null;
    let W = 0;
    let H = 0;
    let DPR = 1;
    let step = 7;
    let rowStep = 14.35;
    let cols = 0;
    let rows = 0;
    let R = 3.22;
    let seeds = new Float32Array(0);
    let rafId = 0;
    let cancelled = false;
    let lastTimeSec = 0;

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const recomputeGrid = () => {
      const rect = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      DPR = Math.min(2, window.devicePixelRatio || 1);

      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);

      step = Math.max(5, W / 205);
      rowStep = step * 2.05;
      cols = Math.ceil(W / step);
      rows = Math.ceil(H / rowStep);
      R = step * 0.46;

      fA.width = cols;
      fA.height = rows;
      fB.width = cols;
      fB.height = rows;

      seeds = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j += 1) {
        const rowBias = hash(j * 3.1, 7.7);
        for (let i = 0; i < cols; i += 1) {
          seeds[j * cols + i] = 0.55 * hash(i, j) + 0.45 * rowBias;
        }
      }
    };

    const drawHand = (
      fctx: CanvasRenderingContext2D,
      tile: HTMLCanvasElement,
      left: boolean,
      a: number,
      hw: number,
      hh: number,
      cy: number
    ) => {
      const ph = left ? 0 : Math.PI;
      const reach = (0.035 * Math.sin(a + ph) + 0.012 * Math.sin(2 * a + 1.3 + ph)) * W;
      const scale = 1 + 0.07 * Math.sin(a + 0.9 + ph);
      const rot = (left ? 1 : -1) * 0.045 * Math.sin(a + 2.1 + ph);
      const x = left ? reach - W * 0.045 : W - hw + W * 0.045 - reach;
      const pivotX = left ? 0 : W;

      fctx.save();
      fctx.scale(cols / W, rows / H);
      fctx.translate(pivotX, cy);
      fctx.rotate(rot);
      fctx.scale(scale, scale);
      fctx.translate(-pivotX, -cy);
      fctx.drawImage(tile, x, cy - hh / 2, hw, hh);
      fctx.restore();
    };

    const render = (rawSec: number) => {
      if (cancelled || cols <= 0 || rows <= 0) return;
      const t = ((rawSec % LOOP) + LOOP) % LOOP;
      lastTimeSec = t;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (!tiles) return;

      const portrait = H > W;
      const hw = W * (portrait ? 0.66 : 0.53);
      const hh = hw * HAND_ASPECT;
      const cy = H * (portrait ? 0.66 : 0.54);
      const a = (TAU * t) / LOOP;

      // Clear fields to white before compositing poses
      ctxA.setTransform(1, 0, 0, 1, 0, 0);
      ctxA.fillStyle = '#ffffff';
      ctxA.fillRect(0, 0, cols, rows);

      ctxB.setTransform(1, 0, 0, 1, 0, 0);
      ctxB.fillStyle = '#ffffff';
      ctxB.fillRect(0, 0, cols, rows);

      drawHand(ctxA, tiles.LA, true, a, hw, hh, cy);
      drawHand(ctxA, tiles.RA, false, a, hw, hh, cy);
      drawHand(ctxB, tiles.LB, true, a, hw, hh, cy);
      drawHand(ctxB, tiles.RB, false, a, hw, hh, cy);

      const dataA = ctxA.getImageData(0, 0, cols, rows).data;
      const dataB = ctxB.getImageData(0, 0, cols, rows).data;

      const mL = mixAt(t, 6.2, 14.6, 1.6);
      const mR = mixAt(t, 2.4, 10.4, 1.6);
      const tick = Math.floor(t * 7);
      const halfCols = cols / 2;
      const qCenterY = portrait ? 0.33 : 0.385;
      const qWidthX = portrait ? 0.44 : 0.2;

      ctx.fillStyle = themeRef.current === 'dark' ? '#e2e8f0' : '#0d0d0d';
      ctx.beginPath();

      for (let j = 0; j < rows; j += 1) {
        const py = (j + 0.5) * rowStep;
        const ey = (py / H - qCenterY) / 0.085;
        const shift = hash(j, tick) > 0.965 ? Math.round((hash(tick, j) - 0.5) * 8) : 0;

        for (let i = 0; i < cols; i += 1) {
          const si = clamp(i - shift, 0, cols - 1);
          const m = i < halfCols ? mL : mR;
          const seed = seeds[j * cols + i];
          const useB = seed < m;
          const lum = (useB ? dataB : dataA)[(j * cols + si) * 4] / 255;

          let v = clamp((1 - lum - 0.16) / 0.42, 0, 1);
          if (v <= 0) continue;

          if (m > 0.001 && m < 0.999) {
            const diff = Math.abs(seed - m);
            if (diff < 0.12) {
              v *= diff / 0.12;
              if (hash(i + tick, j) <= 0.4) {
                v *= 0.3;
              }
            }
          }

          v *= 0.86 + 0.14 * Math.sin(t * 3.2 + seed * 40);

          const cx = Math.abs((i + 0.5) / cols - 0.5);
          v *= smooth(0.035, 0.11, cx);

          const ex = cx / qWidthX;
          v *= smooth(0.85, 1.25, Math.hypot(ex, ey));

          let level = 0;
          for (let k = LEVELS.length - 1; k >= 1; k -= 1) {
            if (v >= LEVELS[k] - 0.13) {
              level = LEVELS[k];
              break;
            }
          }
          if (level <= 0) continue;

          const r = level === LEVELS[1] ? R * 0.38 : R * level;
          const px = (i + 0.5) * step;
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, TAU);
        }
      }

      ctx.fill();
    };

    window.__render = render;
    renderImmediateRef.current = () => render(lastTimeSec);
    recomputeGrid();

    const ro = new ResizeObserver(() => {
      recomputeGrid();
      render(lastTimeSec);
    });
    ro.observe(hero);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      tiles = {
        LA: sliceTile(img, SRC.LA),
        RA: sliceTile(img, SRC.RA),
        LB: sliceTile(img, SRC.LB),
        RB: sliceTile(img, SRC.RB),
      };

      if (reducedMotion) {
        render(0);
        return;
      }

      const t0 = performance.now();
      const loop = (now: number) => {
        if (cancelled) return;
        render((now - t0) / 1000);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    };
    img.src = SHEET_URL;

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderImmediateRef.current = null;
      if (window.__render === render) {
        delete window.__render;
      }
    };
  }, []);

  const scrollToChallenges = () => {
    if (onJoinCircle) {
      onJoinCircle();
    } else {
      document.getElementById('community-challenges')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section ref={heroRef} className="kindred-hero" aria-label="AquaWatt Conservation Community hero">
      <canvas ref={canvasRef} className="kindred-canvas" id="dots" aria-hidden="true" />

      <div className="kindred-copy">
        <h1 className="kindred-title">
          <span className="kindred-title-mute">Conserving Together.</span>
          Every Drop &amp; Watt.
        </h1>
        <p className="kindred-subline">
          Join conservation sprints, benchmark ESP32 testbenches, and turn daily habits into verifiable savings.
        </p>
        <div className="kindred-cta">
          <button
            type="button"
            onClick={scrollToChallenges}
            className="kindred-cta-btn"
          >
            Explore Active Sprints
          </button>
        </div>
      </div>
    </section>
  );
};
