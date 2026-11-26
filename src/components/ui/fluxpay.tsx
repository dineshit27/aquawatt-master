'use client';

/**
 * FluxPay: a full-width hero panel featuring an interactive pixel-grid canvas
 * (load reveal, looping ripples, cursor light), headline, looping live preview
 * card, primary/secondary actions, notched top nav tab, and bottom count-up shelf.
 */

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, HTMLAttributes, MouseEvent, ReactNode, RefObject, SVGProps } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, animate, domMax, m, useInView } from 'motion/react';

/* -------------------------------------------------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------------------------------------------- */

export type FluxPayReducedMotion = 'user' | 'always' | 'never';

export interface FluxPayLink {
  label: string;
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export interface FluxPayNavItem extends FluxPayLink {
  active?: boolean;
}

export interface FluxPayStat {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export interface FluxPayTransfer {
  route: string;
  from: {
    code: string;
    symbol: string;
    amount: number;
    decimals?: number;
  };
  to: {
    code: string;
    symbol: string;
    decimals?: number;
  };
  rate: number;
  settled?: string;
}

export interface FluxPayPalette {
  night?: string;
  ink?: string;
  restColor?: string;
  litColor?: string;
  paleColor?: string;
  rippleColor?: string;
  rippleWhite?: string;
  glowCore?: string;
  glowMid?: string;
  glowWash?: string;
}

export interface FluxPayFieldOptions {
  columns?: number;
  minCell?: number;
  maxCell?: number;
  restOpacity?: number;
  restSize?: number;
  litOpacity?: number;
  paleOpacity?: number;
  reveal?: number;
  revealX?: number;
  revealY?: number;
}

export interface FluxPayRippleOptions {
  strength?: number;
  whiteShare?: number;
  every?: number;
  travel?: number;
  width?: number;
  push?: number;
}

export interface FluxPayCursorOptions {
  radius?: number;
  glow?: number;
  pulse?: number;
  grow?: number;
  follow?: number;
}

export interface FluxPayClearOptions {
  width?: number;
  height?: number;
  y?: number;
  strength?: number;
}

export interface FluxPayGlowOptions {
  strength?: number;
  width?: number;
  height?: number;
}

export interface FluxPayCountOptions {
  duration?: number;
  delay?: number;
  stagger?: number;
}

export interface FluxPayTransferTiming {
  travel?: number;
  hold?: number;
  count?: number;
  swap?: number;
}

export interface FluxPayFonts {
  sans?: string;
  serif?: string;
  mono?: string;
}

export interface FluxPayProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  brandName?: string;
  logo?: ReactNode;
  logoHref?: string;
  logoLabel?: string;
  onLogoClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  badge?: string;
  titleLines?: string[];
  titleLinesPhone?: string[];
  headingLevel?: 1 | 2;
  primaryAction?: FluxPayLink;
  secondaryAction?: FluxPayLink;
  signUp?: FluxPayLink;
  navItems?: FluxPayNavItem[];
  showNavbar?: boolean;
  navLabel?: string;
  openMenuLabel?: string;
  closeMenuLabel?: string;
  stats?: FluxPayStat[];
  transfers?: FluxPayTransfer[];
  transferTitle?: string;
  transferLabel?: string;
  transferSteps?: readonly [string, string, string];
  sendLabel?: string;
  receiveLabel?: string;
  locale?: string;
  palette?: FluxPayPalette;
  fonts?: FluxPayFonts;
  field?: FluxPayFieldOptions;
  ripple?: FluxPayRippleOptions;
  cursor?: FluxPayCursorOptions;
  clear?: FluxPayClearOptions;
  glow?: FluxPayGlowOptions;
  count?: FluxPayCountOptions;
  transferTiming?: FluxPayTransferTiming;
  height?: string;
  reducedMotion?: FluxPayReducedMotion;
  className?: string;
}

/* -------------------------------------------------------------------------------------------------------------------
 * Defaults and small helpers
 * ---------------------------------------------------------------------------------------------------------------- */

const DEFAULT_PALETTE: Required<FluxPayPalette> = {
  night: '#040c27',
  ink: '#f5f8ff',
  restColor: '#1f4a8e',
  litColor: '#65b5ff',
  paleColor: '#d4ecff',
  rippleColor: '#4f9cf0',
  rippleWhite: '#f0f8ff',
  glowCore: '#e4f4ff',
  glowMid: '#79bdff',
  glowWash: '#2a6cd6',
};

const DEFAULT_FIELD: Required<FluxPayFieldOptions> = {
  columns: 74,
  minCell: 14,
  maxCell: 24,
  restOpacity: 0.6,
  restSize: 0.26,
  litOpacity: 1,
  paleOpacity: 0.6,
  reveal: 1.5,
  revealX: 50,
  revealY: 48,
};

const DEFAULT_RIPPLE: Required<FluxPayRippleOptions> = {
  strength: 0.85,
  whiteShare: 0.24,
  every: 3,
  travel: 6.2,
  width: 48,
  push: 3,
};

const DEFAULT_CURSOR: Required<FluxPayCursorOptions> = {
  radius: 170,
  glow: 1,
  pulse: 3.2,
  grow: 2.4,
  follow: 0.16,
};

const DEFAULT_CLEAR: Required<FluxPayClearOptions> = {
  width: 40,
  height: 36,
  y: 46,
  strength: 0.9,
};

const DEFAULT_GLOW: Required<FluxPayGlowOptions> = {
  strength: 0.8,
  width: 105,
  height: 60,
};

const DEFAULT_COUNT: Required<FluxPayCountOptions> = {
  duration: 1.6,
  delay: 0.95,
  stagger: 0.12,
};

const DEFAULT_TRANSFER_TIMING: Required<FluxPayTransferTiming> = {
  travel: 1.8,
  hold: 2.4,
  count: 0.8,
  swap: 0.25,
};

const DEFAULT_STEPS: readonly [string, string, string] = ['Initiated', 'Converted', 'Delivered'];
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const withDefaults = <T extends object>(defaults: T, overrides?: Partial<T>): T => {
  const merged = { ...defaults };

  if (overrides) {
    for (const key of Object.keys(overrides) as Array<keyof T>) {
      const value = overrides[key];
      if (value !== undefined) merged[key] = value as T[keyof T];
    }
  }

  return merged;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

const noise = (cell: number, ring: number) => {
  const s = Math.sin(cell * 12.9898 + ring * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const handleLinkNavigation = (
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
) => {
  if (href.startsWith('#') && href.length > 1 && typeof document !== 'undefined') {
    const target = document.getElementById(href.slice(1));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  onClick?.(event);
};

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false
  );

/* -------------------------------------------------------------------------------------------------------------------
 * Pixel field (canvas)
 * ---------------------------------------------------------------------------------------------------------------- */

type Rgba = [number, number, number, number];

interface CanvasConfig {
  palette: Required<FluxPayPalette>;
  field: Required<FluxPayFieldOptions>;
  ripple: Required<FluxPayRippleOptions>;
  cursor: Required<FluxPayCursorOptions>;
  glow: Required<FluxPayGlowOptions>;
}

interface FieldColors {
  rest: Rgba;
  lit: Rgba;
  pale: Rgba;
  crest: Rgba;
  white: Rgba;
}

const MID = 0.5;
const ZONES = 6;
const STEPS = 32;
const FILLS = ZONES * 2 * STEPS;
const HIDDEN = 0xffff;
const REVEAL_BAND = 70;

const mix = (from: Rgba, to: Rgba, t: number): Rgba => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
  from[3] + (to[3] - from[3]) * t,
];

const toCss = ([r, g, b, a]: Rgba) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;

const resolveColor = (host: HTMLElement, value: string, opacity: number, fallback: Rgba): Rgba => {
  const probe = document.createElement('span');
  probe.style.color = value;
  host.appendChild(probe);

  const computed = getComputedStyle(probe).color;
  host.removeChild(probe);

  const scratch = document.createElement('canvas');
  scratch.width = 1;
  scratch.height = 1;

  const context = scratch.getContext('2d', { willReadFrequently: true });
  if (!context) return fallback;

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = computed;
  context.fillRect(0, 0, 1, 1);

  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return a === 0 ? fallback : [r, g, b, opacity];
};

const stopsFor = (colors: FieldColors, glow: number) => ({
  rest: mix(colors.rest, colors.pale, glow),
  lit: mix(colors.lit, colors.white, glow * 0.8),
  crest: mix(colors.crest, colors.white, glow * 0.7),
});

const blueAt = (colors: FieldColors, level: number, glow: number) => {
  const { rest, lit, crest } = stopsFor(colors, glow);
  return toCss(level > MID ? mix(lit, crest, (level - MID) / (1 - MID)) : mix(rest, lit, level / MID));
};

const whiteAt = (colors: FieldColors, level: number, glow: number) => {
  const { rest, crest } = stopsFor(colors, glow);
  return toCss(
    level > 0.3
      ? mix(crest, colors.white, Math.min(1, (level - 0.3) / 0.4))
      : mix(rest, crest, level / 0.3)
  );
};

const glowAt = (glow: Required<FluxPayGlowOptions>, x: number, y: number, width: number, height: number) => {
  const dx = (x - width / 2) / ((width * glow.width) / 100);
  const dy = (height - y) / ((height * glow.height) / 100);
  return (1 - smoothstep(0, 0.8, Math.hypot(dx, dy))) * glow.strength;
};

interface PixelFieldProps {
  areaRef: RefObject<HTMLElement | null>;
  config: CanvasConfig;
  reduce: boolean;
}

const PixelField = ({ areaRef, config, reduce }: PixelFieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !area || !ctx) return;

    const { palette, field, ripple, cursor, glow } = config;

    const colors: FieldColors = {
      rest: resolveColor(area, palette.restColor, field.restOpacity, [31, 74, 142, field.restOpacity]),
      lit: resolveColor(area, palette.litColor, field.litOpacity, [101, 181, 255, field.litOpacity]),
      pale: resolveColor(area, palette.paleColor, field.paleOpacity, [212, 236, 255, field.paleOpacity]),
      crest: resolveColor(area, palette.rippleColor, 1, [79, 156, 240, 1]),
      white: resolveColor(area, palette.rippleWhite, 0.95, [240, 248, 255, 0.95]),
    };

    const fills = Array.from({ length: ZONES * 2 }, (_, slot) => {
      const glowLevel = Math.floor(slot / 2) / (ZONES - 1);
      const ramp = slot % 2 ? whiteAt : blueAt;
      return Array.from({ length: STEPS }, (__, step) => ramp(colors, step / (STEPS - 1), glowLevel));
    }).flat();

    const counts = new Uint32Array(FILLS);
    const starts = new Uint32Array(FILLS);
    const rings: Array<{ born: number; id: number }> = [];
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, target: 0 };

    let width = 0;
    let height = 0;
    let count = 0;
    let reach = 1;
    let size = 0;
    let cellX = new Float32Array(0);
    let cellY = new Float32Array(0);
    let fromOrigin = new Float32Array(0);
    let dirX = new Float32Array(0);
    let dirY = new Float32Array(0);
    let zone = new Uint8Array(0);
    let pulsePhase = new Float32Array(0);
    let drawX = new Float32Array(0);
    let drawY = new Float32Array(0);
    let scale = new Float32Array(0);
    let fill = new Uint16Array(0);
    let order = new Uint32Array(0);
    let started = -1;
    let lastRing = -Infinity;
    let ringCount = 0;
    let raf = 0;
    let onScreen = true;

    const layout = () => {
      width = area.clientWidth;
      height = area.clientHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cell = clamp(width / field.columns, field.minCell, field.maxCell);
      const cols = Math.ceil(width / cell) + 1;
      const rows = Math.ceil(height / cell) + 1;

      const offsetX = (width - (cols - 1) * cell) / 2;
      const offsetY = (height - (rows - 1) * cell) / 2;
      const originX = (width * field.revealX) / 100;
      const originY = (height * field.revealY) / 100;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      reach = Math.hypot(Math.max(originX, width - originX), Math.max(originY, height - originY));
      size = cell * field.restSize;

      count = cols * rows;
      cellX = new Float32Array(count);
      cellY = new Float32Array(count);
      fromOrigin = new Float32Array(count);
      dirX = new Float32Array(count);
      dirY = new Float32Array(count);
      zone = new Uint8Array(count);
      pulsePhase = new Float32Array(count);
      drawX = new Float32Array(count);
      drawY = new Float32Array(count);
      scale = new Float32Array(count);
      fill = new Uint16Array(count);
      order = new Uint32Array(count);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const x = offsetX + col * cell;
          const y = offsetY + row * cell;
          const distance = Math.hypot(x - originX, y - originY);

          cellX[i] = x;
          cellY[i] = y;
          fromOrigin[i] = distance;
          dirX[i] = distance > 0 ? (x - originX) / distance : 0;
          dirY[i] = distance > 0 ? (y - originY) / distance : 0;
          zone[i] = Math.round(clamp(glowAt(glow, x, y, width, height), 0, 1) * (ZONES - 1));
          pulsePhase[i] = noise(i, 0) * Math.PI * 2;
        }
      }
    };

    const frame = (now: number) => {
      if (started < 0) started = now;

      const animating = !reduce;
      const progress = animating ? clamp((now - started) / (field.reveal * 1000), 0, 1) : 1;
      const revealing = progress < 1;
      const front = revealing ? easeOutCubic(progress) * (reach + REVEAL_BAND * 3) : Infinity;
      const speed = reach / (ripple.travel * 1000);

      if (animating && ripple.every > 0 && now - lastRing >= ripple.every * 1000) {
        rings.push({ born: now, id: ringCount++ });
        lastRing = now;
      }

      while (rings.length && (now - rings[0].born) * speed > reach + ripple.width * 3) rings.shift();

      pointer.x += (pointer.targetX - pointer.x) * cursor.follow;
      pointer.y += (pointer.targetY - pointer.y) * cursor.follow;
      pointer.strength += (pointer.target - pointer.strength) * 0.08;

      const lit = pointer.strength > 0.01;
      const pulseTime = (now / (cursor.pulse * 1000)) * Math.PI * 2;

      counts.fill(0);

      for (let i = 0; i < count; i++) {
        const distance = fromOrigin[i];

        if (distance > front) {
          fill[i] = HIDDEN;
          continue;
        }

        const x = cellX[i];
        const y = cellY[i];
        let level = 0;
        let shift = 0;
        let strongest = 0;
        let strongestId = -1;
        let grow = 1;

        if (revealing) {
          const offset = (distance - front) / REVEAL_BAND;
          level += Math.exp(-offset * offset) * MID * (1 - progress);
        }

        for (const ring of rings) {
          const radius = (now - ring.born) * speed;
          const offset = (distance - radius) / ripple.width;
          if (offset > 3 || offset < -3) continue;

          const band = Math.exp(-offset * offset) * Math.max(0, 1 - (radius / reach) ** 2);
          level += ripple.strength * band;
          shift += ripple.push * band;

          if (band > strongest) {
            strongest = band;
            strongestId = ring.id;
          }
        }

        if (lit) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const near = Math.hypot(dx, dy);

          if (near < cursor.radius) {
            const falloff = (1 - near / cursor.radius) ** 2 * pointer.strength;
            const pulse = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(pulseTime + pulsePhase[i]));
            level += cursor.glow * MID * falloff * pulse;
            grow += (cursor.grow - 1) * falloff;
          }
        }

        const spark = strongestId >= 0 && noise(i, strongestId) < ripple.whiteShare;
        const index = (zone[i] * 2 + (spark ? 1 : 0)) * STEPS + Math.round(clamp(level, 0, 1) * (STEPS - 1));

        fill[i] = index;
        counts[index]++;
        drawX[i] = x + dirX[i] * shift;
        drawY[i] = y + dirY[i] * shift;
        scale[i] = grow;
      }

      let total = 0;
      for (let f = 0; f < FILLS; f++) {
        starts[f] = total;
        total += counts[f];
      }

      for (let i = 0; i < count; i++) {
        if (fill[i] !== HIDDEN) order[starts[fill[i]]++] = i;
      }

      ctx.clearRect(0, 0, width, height);

      let k = 0;
      for (let f = 0; f < FILLS; f++) {
        const n = counts[f];
        if (!n) continue;

        ctx.beginPath();
        for (const end = k + n; k < end; k++) {
          const i = order[k];
          const side = size * scale[i];
          ctx.rect(drawX[i] - side / 2, drawY[i] - side / 2, side, side);
        }

        ctx.fillStyle = fills[f];
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      frame(now);
      raf = requestAnimationFrame(loop);
    };

    const play = () => {
      if (reduce || raf || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(loop);
    };

    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const relayout = () => {
      layout();
      if (reduce) frame(performance.now());
    };

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !fine.matches) return;

      const rect = canvas.getBoundingClientRect();
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;

      if (pointer.strength < 0.01) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }

      pointer.target = 1;
    };

    const handlePointerLeave = () => {
      pointer.target = 0;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) pause();
      else play();
    };

    const resizeObserver = new ResizeObserver(relayout);
    const viewObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) play();
      else pause();
    });

    relayout();
    resizeObserver.observe(area);
    viewObserver.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!reduce) {
      area.addEventListener('pointermove', handlePointerMove, { passive: true });
      area.addEventListener('pointerleave', handlePointerLeave);
      window.addEventListener('blur', handlePointerLeave);
      play();
    }

    return () => {
      pause();
      resizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      area.removeEventListener('pointermove', handlePointerMove);
      area.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('blur', handlePointerLeave);
    };
  }, [areaRef, config, reduce]);

  return <canvas ref={canvasRef} aria-hidden='true' tabIndex={-1} className='fxp-field' />;
};

/* -------------------------------------------------------------------------------------------------------------------
 * Shoulder shape for the nav tab and the stats shelf
 * ---------------------------------------------------------------------------------------------------------------- */

const Shoulder = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg viewBox='0 0 50 100' preserveAspectRatio='none' fill='currentColor' aria-hidden='true' focusable='false' {...props}>
      <path d='M0 0A16 16 0 0 1 15.52 12.13L34.48 87.87A16 16 0 0 0 50 100V0Z' />
    </svg>
  );
};

/* -------------------------------------------------------------------------------------------------------------------
 * Navigation
 * ---------------------------------------------------------------------------------------------------------------- */

interface NavLinksProps {
  items: FluxPayNavItem[];
  pillId: string;
}

const NavLinks = ({ items, pillId }: NavLinksProps) => {
  const active = items.find(item => item.active)?.label ?? items[0]?.label;
  const [target, setTarget] = useState(active);

  const handleReset = () => {
    setTarget(active);
  };

  return (
    <ul className='fxp-links' onPointerLeave={handleReset}>
      {items.map(item => (
        <li key={`${item.label}-${item.href}`} className='fxp-link-item'>
          {target === item.label && (
            <m.span
              layoutId={pillId}
              aria-hidden='true'
              className='fxp-nav-pill'
              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
            />
          )}
          <a
            href={item.href}
            data-slot='fluxpay-nav-link'
            aria-current={item.active ? 'page' : undefined}
            data-lit={target === item.label ? '' : undefined}
            onPointerEnter={() => setTarget(item.label)}
            onFocus={() => setTarget(item.label)}
            onBlur={handleReset}
            onClick={event => handleLinkNavigation(event, item.href, item.onClick)}
            className='fxp-nav-link'
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
};

interface NavbarProps {
  brandName?: string;
  logo?: ReactNode;
  logoHref: string;
  logoLabel: string;
  onLogoClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  navItems: FluxPayNavItem[];
  navLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  signUp?: FluxPayLink;
  menuId: string;
  pillId: string;
}

const Navbar = ({
  brandName,
  logo,
  logoHref,
  logoLabel,
  onLogoClick,
  navItems,
  navLabel,
  openMenuLabel,
  closeMenuLabel,
  signUp,
  menuId,
  pillId,
}: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const hasNav = navItems.length > 0;
  const hasBrand = Boolean(logo) || Boolean(brandName);

  useEffect(() => {
    if (!open) return;

    const wide = window.matchMedia('(min-width: 1024px)');

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpen(false);
    };

    const handleWideChange = () => {
      if (wide.matches) setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    wide.addEventListener('change', handleWideChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      wide.removeEventListener('change', handleWideChange);
    };
  }, [open]);

  return (
    <header ref={headerRef} className='fxp-header'>
      {hasBrand ? (
        <m.a
          href={logoHref}
          aria-label={logoLabel}
          onClick={event => handleLinkNavigation(event, logoHref, onLogoClick)}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
          className='fxp-logo'
        >
          {logo}
          {brandName}
        </m.a>
      ) : (
        <span />
      )}

      {hasNav && (
        <m.nav
          aria-label={navLabel}
          initial={{ y: '-105%' }}
          animate={{ y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease: EASE_OUT }}
          className='fxp-tab'
        >
          <Shoulder className='fxp-tab-shoulder' />
          <div className='fxp-tab-body'>
            <NavLinks items={navItems} pillId={pillId} />
          </div>
          <Shoulder className='fxp-tab-shoulder fxp-flip-x' />
        </m.nav>
      )}

      <m.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: EASE_OUT }}
        className='fxp-header-end'
      >
        {signUp && (
          <a
            href={signUp.href}
            data-slot='fluxpay-sign-up'
            onClick={event => handleLinkNavigation(event, signUp.href, signUp.onClick)}
            className='fxp-btn fxp-btn-primary'
          >
            {signUp.label}
          </a>
        )}
        {hasNav && (
          <button
            ref={menuButtonRef}
            type='button'
            data-slot='fluxpay-menu-button'
            aria-label={open ? closeMenuLabel : openMenuLabel}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen(value => !value)}
            className='fxp-menu-btn'
          >
            <svg
              viewBox='0 0 24 24'
              width='20'
              height='20'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
              focusable='false'
            >
              {open ? <path d='M18 6 6 18M6 6l12 12' /> : <path d='M4 6h16M4 12h16M4 18h16' />}
            </svg>
          </button>
        )}
      </m.div>

      <AnimatePresence>
        {open && hasNav && (
          <m.nav
            id={menuId}
            aria-label={navLabel}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            className='fxp-menu'
          >
            <ul>
              {navItems.map(item => (
                <li key={`${item.label}-${item.href}`}>
                  <a
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={event => {
                      setOpen(false);
                      handleLinkNavigation(event, item.href, item.onClick);
                    }}
                    className='fxp-menu-link'
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </m.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

/* -------------------------------------------------------------------------------------------------------------------
 * Headline and buttons
 * ---------------------------------------------------------------------------------------------------------------- */

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: EASE_OUT },
});

const TitleText = ({ line }: { line: string }) => {
  return (
    <>
      {line.split('*').map((part, index) =>
        index % 2 ? (
          <em key={index} className='fxp-title-serif'>
            {part}
          </em>
        ) : (
          part
        )
      )}
    </>
  );
};

const TitleLine = ({ delay, children }: { delay: number; children: ReactNode }) => {
  return (
    <span className='fxp-title-mask'>
      <m.span
        className='fxp-title-line'
        initial={{ opacity: 0, y: '75%', filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, delay, ease: EASE_OUT }}
      >
        {children}
      </m.span>
    </span>
  );
};

/* -------------------------------------------------------------------------------------------------------------------
 * Live transfer / tariff conversion card
 * ---------------------------------------------------------------------------------------------------------------- */

type PhaseType = 0 | 1 | 2;

const formatMoney = (locale: string, value: number, decimals: number) =>
  value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const rateText = (rate: number) => rate.toFixed(rate < 10 ? 4 : 2);

interface ReceivedProps {
  transfer: FluxPayTransfer;
  landed: boolean;
  locale: string;
  duration: number;
  reduce: boolean;
}

const Received = ({ transfer, landed, locale, duration, reduce }: ReceivedProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const decimals = transfer.to.decimals ?? 2;
  const total = transfer.from.amount * transfer.rate;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!landed || reduce) {
      node.textContent = formatMoney(locale, landed ? total : 0, decimals);
      return;
    }

    const controls = animate(0, total, {
      duration,
      ease: EASE_OUT,
      onUpdate: value => {
        node.textContent = formatMoney(locale, value, decimals);
      },
    });

    return () => controls.stop();
  }, [landed, reduce, total, decimals, locale, duration]);

  return (
    <span className={cn('fxp-tx-amount', !landed && 'fxp-tx-amount-pending')}>
      {transfer.to.symbol}
      <span ref={ref}>{formatMoney(locale, 0, decimals)}</span>
    </span>
  );
};

interface PartyProps {
  transfer: FluxPayTransfer;
  side: 'from' | 'to';
  landed: boolean;
  caption: string;
  locale: string;
  duration: number;
  reduce: boolean;
}

const Party = ({ transfer, side, landed, caption, locale, duration, reduce }: PartyProps) => {
  const { code, symbol } = transfer[side];

  return (
    <div className={cn('fxp-tx-party', side === 'to' && 'fxp-tx-party-to')}>
      <span className={cn('fxp-tx-coin', side === 'to' && landed && 'fxp-tx-coin-on')}>{symbol}</span>
      <span className='fxp-tx-meta'>
        <span className='fxp-tx-code'>{`${caption} · ${code}`}</span>
        {side === 'from' ? (
          <span className='fxp-tx-amount'>
            {symbol}
            {formatMoney(locale, transfer.from.amount, transfer.from.decimals ?? 2)}
          </span>
        ) : (
          <Received transfer={transfer} landed={landed} locale={locale} duration={duration} reduce={reduce} />
        )}
      </span>
    </div>
  );
};

interface TransferCardProps {
  transfers: FluxPayTransfer[];
  title?: string;
  label?: string;
  steps: readonly [string, string, string];
  sendLabel: string;
  receiveLabel: string;
  locale: string;
  timing: Required<FluxPayTransferTiming>;
  reduce: boolean;
}

const TransferCard = ({
  transfers,
  title,
  label,
  steps,
  sendLabel,
  receiveLabel,
  locale,
  timing,
  reduce,
}: TransferCardProps) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<PhaseType>(0);
  const [ready, setReady] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  const total = transfers.length;
  const transfer = transfers[index % total];
  const shown: PhaseType = reduce ? 2 : phase;
  const running = ready || reduce;

  const swap = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
    exit: { opacity: 0, y: -6, transition: { duration: timing.swap } },
  };

  useEffect(() => {
    if (reduce || !ready || !inView) return;

    const wait = phase === 2 ? timing.hold : timing.travel / 2 + (phase === 0 ? timing.swap : 0);

    const timer = setTimeout(() => {
      if (phase === 2) {
        setIndex(current => (current + 1) % total);
        setPhase(0);
      } else {
        setPhase(current => (current + 1) as PhaseType);
      }
    }, wait * 1000);

    return () => clearTimeout(timer);
  }, [phase, ready, inView, reduce, total, timing.hold, timing.travel, timing.swap]);

  return (
    <m.div
      ref={ref}
      role='img'
      aria-label={label}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.68, ease: EASE_OUT }}
      onAnimationComplete={() => setReady(true)}
      className='fxp-tx'
    >
      <div aria-hidden='true' className='fxp-tx-inner'>
        <div className='fxp-tx-head'>
          <span className='fxp-tx-live'>
            <span className='fxp-tx-live-dot' />
            {title}
          </span>
          <AnimatePresence mode='wait' initial={false}>
            <m.span key={index} {...swap} className='fxp-tx-route'>
              {transfer.route}
            </m.span>
          </AnimatePresence>
        </div>

        <AnimatePresence mode='wait' initial={false}>
          <m.div key={index} {...swap} className='fxp-tx-body'>
            <Party
              transfer={transfer}
              side='from'
              landed={shown === 2}
              caption={sendLabel}
              locale={locale}
              duration={timing.count}
              reduce={reduce}
            />

            <div className='fxp-tx-track'>
              <span className={cn('fxp-tx-rate', shown > 0 && 'fxp-tx-rate-on')}>
                1 {transfer.from.code} = {rateText(transfer.rate)} {transfer.to.code}
              </span>
              <span className='fxp-tx-line'>
                <span className='fxp-tx-run'>
                  <m.span
                    className='fxp-tx-progress'
                    initial={{ transform: reduce ? 'scaleX(1)' : 'scaleX(0)' }}
                    animate={{ transform: running ? 'scaleX(1)' : 'scaleX(0)' }}
                    transition={{ duration: reduce ? 0 : timing.travel, ease: 'linear' }}
                  />
                </span>
                {steps.map((step, stepIndex) => (
                  <span key={step} className={cn('fxp-tx-stop', shown >= stepIndex && 'fxp-tx-stop-on')} />
                ))}
              </span>
            </div>

            <Party
              transfer={transfer}
              side='to'
              landed={shown === 2}
              caption={receiveLabel}
              locale={locale}
              duration={timing.count}
              reduce={reduce}
            />
          </m.div>
        </AnimatePresence>

        <ol className='fxp-tx-steps'>
          {steps.map((step, stepIndex) => (
            <li key={step} className={cn('fxp-tx-step', shown >= stepIndex && 'fxp-tx-step-on')}>
              <span className='fxp-tx-step-dot' />
              {step}
            </li>
          ))}
          {transfer.settled && (
            <li className={cn('fxp-tx-settled', shown === 2 && 'fxp-tx-settled-on')}>{transfer.settled}</li>
          )}
        </ol>
      </div>
    </m.div>
  );
};

/* -------------------------------------------------------------------------------------------------------------------
 * Stats shelf
 * ---------------------------------------------------------------------------------------------------------------- */

const formatStat = (value: number, decimals: number, prefix: string, suffix: string) =>
  `${prefix}${value.toFixed(decimals)}${suffix}`;

interface CountUpProps {
  stat: FluxPayStat;
  delay: number;
  duration: number;
  reduce: boolean;
}

const CountUp = ({ stat, delay, duration, reduce }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const { value, decimals = 0, prefix = '', suffix = '' } = stat;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduce) {
      node.textContent = formatStat(value, decimals, prefix, suffix);
      return;
    }

    const controls = animate(0, value, {
      duration,
      delay,
      ease: EASE_OUT,
      onUpdate: current => {
        node.textContent = formatStat(current, decimals, prefix, suffix);
      },
    });

    return () => controls.stop();
  }, [value, decimals, prefix, suffix, delay, duration, reduce]);

  return (
    <span ref={ref} aria-hidden='true'>
      {formatStat(0, decimals, prefix, suffix)}
    </span>
  );
};

interface StatsShelfProps {
  stats: FluxPayStat[];
  count: Required<FluxPayCountOptions>;
  reduce: boolean;
}

const StatsShelf = ({ stats, count, reduce }: StatsShelfProps) => {
  return (
    <m.div
      initial={{ y: '102%' }}
      animate={{ y: 0 }}
      transition={{ duration: 0.85, delay: 0.5, ease: EASE_OUT }}
      className='fxp-shelf'
    >
      <Shoulder className='fxp-shelf-shoulder fxp-flip-y' />
      <dl className='fxp-shelf-body'>
        {stats.map((stat, index) => (
          <div key={`${stat.label}-${index}`} className='fxp-stat'>
            <dt className='fxp-stat-label'>{stat.label}</dt>
            <dd className='fxp-stat-value'>
              <CountUp stat={stat} delay={count.delay + index * count.stagger} duration={count.duration} reduce={reduce} />
              <span className='fxp-sr'>
                {formatStat(stat.value, stat.decimals ?? 0, stat.prefix ?? '', stat.suffix ?? '')}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <Shoulder className='fxp-shelf-shoulder fxp-flip-xy' />
    </m.div>
  );
};

/* -------------------------------------------------------------------------------------------------------------------
 * Scoped component CSS synced with AquaWatt surface palettes & dark mode
 * ---------------------------------------------------------------------------------------------------------------- */

const BLOCK_CSS = `
.fxp {
  --fxp-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --fxp-gutter: clamp(16px, 4.3vw, 72px);
  --fxp-radius: clamp(8px, 0.97vw, 15px);
  --fxp-tab-h: clamp(60px, 4.9vw, 80px);
  --fxp-shoulder: calc(var(--fxp-tab-h) * 0.5);
  --fxp-tab-w: clamp(420px, 39vw, 640px);
  --fxp-head-h: 76px;
  --fxp-shelf-h: clamp(84px, 11dvh, 100px);
  --fxp-font-sans: var(--font-heading, var(--font-sans, ui-sans-serif, system-ui, sans-serif));
  --fxp-font-serif: var(--font-serif, ui-serif, Georgia, serif);
  --fxp-font-mono: var(--font-mono, ui-monospace, 'SFMono-Regular', Menlo, monospace);
  --fxp-page-bg: var(--aw-canvas, var(--color-background, #ffffff));
  --fxp-page-fg: var(--color-foreground, #0f172a);
  --fxp-page-muted: var(--color-muted-foreground, #64748b);
  --fxp-page-border: var(--aw-surface-border, var(--color-border, #e2e8f0));
  --fxp-page-primary: var(--aw-accent, var(--color-primary, #174A8B));
  --fxp-pill: color-mix(in oklab, var(--fxp-page-primary) 10%, transparent);
  --fxp-pill-ring: color-mix(in oklab, var(--fxp-page-primary) 18%, transparent);

  box-sizing: border-box;
  display: flex;
  width: 100%;
  min-height: var(--fxp-height, 100dvh);
  padding: 8px;
  background-color: var(--fxp-page-bg);
  color: var(--fxp-page-fg);
  font-family: var(--fxp-font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-size-adjust: 100%;
}

html.dark .fxp,
html[data-aw-palette="dark"] .fxp {
  --fxp-page-bg: #070B13;
  --fxp-page-fg: #f8fafc;
  --fxp-page-muted: #94a3b8;
  --fxp-page-border: #1e293b;
  --fxp-page-primary: #38bdf8;
}

@media (min-width: 1024px) {
  .fxp {
    --fxp-head-h: calc(var(--fxp-tab-h) * 1);
    height: var(--fxp-height, 100dvh);
    min-height: 580px;
    padding: 10px;
  }
}

.fxp *, .fxp *::before, .fxp *::after { box-sizing: border-box; }
.fxp :is(h1, h2, p, ul, ol, dl, dd) { margin: 0; padding: 0; }
.fxp :is(ul, ol) { list-style: none; }
.fxp a { color: inherit; text-decoration: none; }
.fxp button { margin: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; }
.fxp .fxp-sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.fxp .fxp-flip-x { scale: -1 1; }
.fxp .fxp-flip-y { scale: 1 -1; }
.fxp .fxp-flip-xy { scale: -1 -1; }

.fxp :is(a, button):focus-visible { outline: 2px solid #7cc4ff; outline-offset: 3px; }
.fxp :is(.fxp-nav-link, .fxp-menu-link):focus-visible { outline-color: var(--fxp-page-fg); outline-offset: -2px; }

/* ---------- Panel ---------- */

.fxp .fxp-panel {
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--fxp-radius);
  background-color: var(--fxp-night);
  color: var(--fxp-ink);
}

.fxp .fxp-glow {
  position: absolute;
  inset: 0;
  z-index: -2;
  background: radial-gradient(
    var(--fxp-glow-w) var(--fxp-glow-h) at 50% 100%,
    var(--fxp-glow-core) 0%,
    var(--fxp-glow-mid) 32%,
    color-mix(in srgb, var(--fxp-glow-wash) 55%, transparent) 62%,
    transparent 100%
  );
  opacity: var(--fxp-glow);
  pointer-events: none;
}

.fxp .fxp-field {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(
    var(--fxp-clear-w) var(--fxp-clear-h) at 50% var(--fxp-clear-y),
    rgb(0 0 0 / var(--fxp-clear-keep)) 35%,
    #000 100%
  );
  mask-image: radial-gradient(
    var(--fxp-clear-w) var(--fxp-clear-h) at 50% var(--fxp-clear-y),
    rgb(0 0 0 / var(--fxp-clear-keep)) 35%,
    #000 100%
  );
}

/* ---------- Header ---------- */

.fxp .fxp-header {
  position: relative;
  z-index: 20;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--fxp-head-h);
  padding-inline: var(--fxp-gutter);
}

.fxp .fxp-header-end { display: flex; align-items: center; gap: 8px; }

.fxp .fxp-logo {
  display: inline-flex;
  align-items: center;
  gap: clamp(8px, 0.9vw, 14px);
  border-radius: 10px;
  color: #fff;
  font-size: clamp(18px, 0.6rem + 0.7vw, 23px);
  font-weight: 600;
  letter-spacing: -0.025em;
  white-space: nowrap;
}

.fxp .fxp-logo svg {
  width: 1.25em;
  height: 1.25em;
  filter: drop-shadow(0 0 10px rgb(121 189 255 / 0.55));
}

.fxp .fxp-tab {
  position: absolute;
  top: -1px;
  left: 50%;
  display: none;
  translate: -50% 0;
  height: calc(var(--fxp-tab-h) + 1px);
  color: var(--fxp-page-bg);
}

@media (min-width: 1024px) {
  .fxp .fxp-tab { display: flex; }
}

.fxp .fxp-tab-shoulder { flex: none; width: var(--fxp-shoulder); height: 100%; }

.fxp .fxp-tab-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--fxp-tab-w);
  margin-inline: -3px;
  background-color: var(--fxp-page-bg);
}

.fxp .fxp-links { display: flex; align-items: center; }
.fxp .fxp-link-item { position: relative; }

.fxp .fxp-nav-link {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding-inline: clamp(12px, 1.2vw, 20px);
  border-radius: 999px;
  color: var(--fxp-page-muted);
  font-family: var(--fxp-font-mono);
  font-size: clamp(11.5px, 0.45rem + 0.35vw, 13px);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color 200ms ease-out;
}

.fxp .fxp-nav-link[aria-current='page'],
.fxp .fxp-nav-link[data-lit] { color: var(--fxp-page-fg); }

.fxp .fxp-nav-pill {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background-color: var(--fxp-pill);
  box-shadow: inset 0 0 0 1px var(--fxp-pill-ring);
  pointer-events: none;
}

.fxp .fxp-menu-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  color: #fff;
  background-color: rgb(255 255 255 / 0.08);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.16);
  transition: background-color 200ms ease-out;
}

.fxp .fxp-menu-btn:hover { background-color: rgb(255 255 255 / 0.14); }
.fxp .fxp-menu-btn:active { background-color: rgb(255 255 255 / 0.2); }

@media (min-width: 1024px) {
  .fxp .fxp-menu-btn, .fxp .fxp-menu { display: none; }
}

.fxp .fxp-menu {
  position: absolute;
  top: calc(var(--fxp-head-h) - 8px);
  left: var(--fxp-gutter);
  right: var(--fxp-gutter);
  padding: 8px;
  border-radius: 20px;
  background-color: var(--fxp-page-bg);
  box-shadow: 0 0 0 1px var(--fxp-page-border), 0 28px 56px -24px rgb(0 0 0 / 0.7);
}

.fxp .fxp-menu-link {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding-inline: 16px;
  border-radius: 14px;
  color: var(--fxp-page-muted);
  font-family: var(--fxp-font-mono);
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  transition: background-color 200ms ease-out, color 200ms ease-out;
}

.fxp .fxp-menu-link:hover,
.fxp .fxp-menu-link[aria-current='page'] {
  background-color: var(--fxp-pill);
  color: var(--fxp-page-fg);
}

/* ---------- Copy ---------- */

.fxp .fxp-stage {
  position: relative;
  z-index: 10;
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  padding: clamp(16px, 3.2dvh, 36px) var(--fxp-gutter) clamp(16px, 2.4dvh, 28px);
}

.fxp .fxp-copy { position: relative; display: flex; flex-direction: column; align-items: center; width: 100%; text-align: center; }

.fxp .fxp-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: clamp(30px, 4dvh, 36px);
  max-width: 100%;
  padding: 6px 16px 6px 14px;
  border-radius: 18px;
  background-color: rgb(14 32 64 / 0.7);
  box-shadow: inset 0 0 0 1px rgb(143 203 255 / 0.22), inset 0 1px 0 rgb(255 255 255 / 0.06);
  color: rgb(214 236 255 / 0.92);
  font-family: var(--fxp-font-mono);
  font-size: clamp(10.5px, 0.45rem + 0.25vw, 12px);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.08em;
  text-align: left;
  text-transform: uppercase;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

@media (min-width: 640px) {
  .fxp .fxp-badge { border-radius: 999px; white-space: nowrap; }
}

.fxp .fxp-badge-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background-color: #8fcbff;
  box-shadow: 0 0 8px 1px rgb(127 190 255 / 0.85);
  animation: fxp-blink 2.4s ease-in-out infinite;
}

@keyframes fxp-blink { 50% { opacity: 0.45; } }

.fxp .fxp-title {
  width: fit-content;
  max-width: 100%;
  margin-top: clamp(14px, 2.4dvh, 24px);
  color: var(--fxp-ink);
  font-size: clamp(2rem, min(1.5rem + 2.2vw, 6.4dvh), 4.1rem);
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: -0.035em;
  filter: drop-shadow(0 2px 18px rgb(2 8 30 / 0.5));
}

.fxp .fxp-title:first-child { margin-top: 0; }
.fxp .fxp-title-set { display: block; }

.fxp .fxp-title-split .fxp-title-set-wide { display: none; }
.fxp .fxp-title-split .fxp-title-set-phone { font-size: min(1em, 9vw); }

@media (min-width: 640px) {
  .fxp .fxp-title-split .fxp-title-set-wide { display: block; }
  .fxp .fxp-title-split .fxp-title-set-phone { display: none; }
}

.fxp .fxp-title-line {
  display: block;
  background-image: linear-gradient(180deg, #ffffff 20%, #d9eeff 62%, #a9d6ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.fxp .fxp-title-mask {
  display: block;
  overflow: hidden;
  padding: 0 0.12em 0.1em;
  margin: 0 -0.12em -0.1em;
  text-wrap: balance;
}

.fxp .fxp-title-serif {
  font-family: var(--fxp-font-serif);
  font-size: 1.12em;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.01em;
}

/* ---------- Buttons ---------- */

.fxp .fxp-actions-row { margin-top: clamp(16px, 3dvh, 28px); }
.fxp .fxp-actions-row:first-child { margin-top: 0; }
.fxp .fxp-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }

.fxp .fxp-btn {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: clamp(42px, 5.4dvh, 46px);
  padding-inline: clamp(18px, 1.6vw, 24px);
  overflow: hidden;
  border-radius: 10px;
  font-family: var(--fxp-font-mono);
  font-size: clamp(12px, 0.5rem + 0.3vw, 13.5px);
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  touch-action: manipulation;
  transition: background-color 240ms ease-out, box-shadow 240ms ease-out, scale 150ms var(--fxp-ease);
}

@media (pointer: coarse) {
  .fxp .fxp-btn { min-height: 44px; }
}

.fxp .fxp-btn:active { scale: 0.98; }

.fxp .fxp-btn-primary {
  background-color: #f1f5ff;
  background-image: linear-gradient(180deg, #ffffff, #e2eaff);
  color: #071029;
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgb(15 36 101 / 0.14),
    0 0 0 1px rgb(255 255 255 / 0.4),
    0 10px 28px -12px rgb(80 130 255 / 0.7);
}

.fxp .fxp-btn-primary:is(:hover, :focus-visible) {
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgb(15 36 101 / 0.14),
    0 0 0 4px rgb(127 176 255 / 0.22),
    0 14px 34px -12px rgb(80 130 255 / 0.9);
}

.fxp .fxp-btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: linear-gradient(
    105deg,
    rgb(121 189 255 / 0) 22%,
    rgb(121 189 255 / 0.45) 44%,
    rgb(79 156 240 / 0.55) 50%,
    rgb(121 189 255 / 0.45) 56%,
    rgb(121 189 255 / 0) 78%
  );
  translate: -110% 0;
}

.fxp .fxp-btn-primary:is(:hover, :focus-visible)::before {
  translate: 110% 0;
  transition: translate 850ms cubic-bezier(0.45, 0, 0.25, 1);
}

.fxp .fxp-btn-secondary {
  background-color: rgb(10 17 40 / 0.86);
  background-image: linear-gradient(180deg, rgb(255 255 255 / 0.06), rgb(255 255 255 / 0));
  color: var(--fxp-ink);
  box-shadow: inset 0 0 0 1px rgb(150 175 235 / 0.26), inset 0 1px 0 rgb(255 255 255 / 0.08);
}

.fxp .fxp-btn-secondary:is(:hover, :focus-visible) {
  background-color: rgb(16 28 64 / 0.92);
  box-shadow:
    inset 0 0 0 1px rgb(150 175 235 / 0.34),
    inset 0 1px 0 rgb(255 255 255 / 0.1),
    0 10px 28px -14px rgb(80 130 255 / 0.6);
}

/* ---------- Live transfer / tariff preview card ---------- */

.fxp .fxp-tx {
  width: min(100%, var(--fxp-tab-w));
  margin-top: clamp(16px, 3dvh, 28px);
  padding: clamp(12px, 1.8dvh, 16px) 16px;
  border-radius: 14px;
  background-image: linear-gradient(180deg, rgb(16 32 70 / 0.94), rgb(8 17 42 / 0.96));
  box-shadow:
    inset 0 0 0 1px rgb(143 203 255 / 0.16),
    inset 0 1px 0 rgb(255 255 255 / 0.07),
    0 28px 60px -28px rgb(0 0 0 / 0.8),
    0 0 48px -16px rgb(79 156 240 / 0.35);
  text-align: left;
}

.fxp .fxp-tx:first-child { margin-top: 0; }

.fxp .fxp-tx-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--fxp-font-mono);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fxp .fxp-tx-live { display: inline-flex; flex: none; align-items: center; gap: 8px; color: rgb(214 236 255 / 0.92); white-space: nowrap; }
.fxp .fxp-tx-live-dot { position: relative; width: 6px; height: 6px; border-radius: 1px; background-color: #8fcbff; }

.fxp .fxp-tx-live-dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgb(143 203 255 / 0.7);
  animation: fxp-live 1.8s ease-out infinite;
}

@keyframes fxp-live {
  from { opacity: 1; scale: 0.6; }
  to { opacity: 0; scale: 1.5; }
}

.fxp .fxp-tx-route { min-width: 0; overflow: hidden; color: rgb(214 236 255 / 0.72); text-overflow: ellipsis; white-space: nowrap; }

.fxp .fxp-tx-body {
  display: grid;
  grid-template-areas: 'from to' 'track track';
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 10px clamp(10px, 1.2vw, 16px);
  margin-block: clamp(11px, 1.8dvh, 16px);
}

@media (min-width: 640px) {
  .fxp .fxp-tx-body { grid-template-areas: 'from track to'; grid-template-columns: auto minmax(0, 1fr) auto; }
}

.fxp .fxp-tx-party { display: flex; grid-area: from; align-items: center; gap: 10px; }
.fxp .fxp-tx-party-to { flex-direction: row-reverse; grid-area: to; text-align: right; }

.fxp .fxp-tx-coin {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background-color: rgb(79 156 240 / 0.14);
  box-shadow: inset 0 0 0 1px rgb(143 203 255 / 0.22);
  color: #cfe6ff;
  font-size: 12px;
  font-weight: 600;
  transition: background-color 400ms ease-out, box-shadow 400ms ease-out, color 400ms ease-out;
}

.fxp .fxp-tx-coin-on {
  background-color: rgb(121 189 255 / 0.32);
  box-shadow: inset 0 0 0 1px rgb(185 222 255 / 0.6), 0 0 18px rgb(121 189 255 / 0.55);
  color: #fff;
}

.fxp .fxp-tx-meta { display: flex; flex-direction: column; gap: 1px; }

.fxp .fxp-tx-code {
  color: rgb(214 236 255 / 0.72);
  font-family: var(--fxp-font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.fxp .fxp-tx-amount {
  color: var(--fxp-ink);
  font-size: clamp(13.5px, 0.55rem + 0.4vw, 15.5px);
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: opacity 300ms ease-out;
}

.fxp .fxp-tx-amount-pending { opacity: 0.55; }

.fxp .fxp-tx-track { display: flex; grid-area: track; flex-direction: column; align-items: center; gap: 5px; min-width: 0; }

.fxp .fxp-tx-rate {
  padding: 2px 8px;
  border-radius: 999px;
  color: rgb(214 236 255 / 0.68);
  font-family: var(--fxp-font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  white-space: nowrap;
  box-shadow: inset 0 0 0 1px rgb(143 203 255 / 0.16);
  transition: color 300ms ease-out, background-color 300ms ease-out, box-shadow 300ms ease-out;
}

.fxp .fxp-tx-rate-on {
  background-color: rgb(79 156 240 / 0.16);
  color: #cfe6ff;
  box-shadow: inset 0 0 0 1px rgb(143 203 255 / 0.4);
}

.fxp .fxp-tx-line { position: relative; display: flex; align-items: center; justify-content: space-between; width: 100%; height: 12px; }
.fxp .fxp-tx-run { position: absolute; inset: 5px 4px; overflow: hidden; border-radius: 999px; background-color: rgb(143 203 255 / 0.16); }
.fxp .fxp-tx-progress { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(90deg, #4f9cf0, #b8e2ff); transform-origin: left center; }

.fxp .fxp-tx-stop {
  position: relative;
  width: 7px;
  height: 7px;
  border: 1px solid #395272;
  border-radius: 50%;
  background-color: #102044;
  transition: background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
}

.fxp .fxp-tx-stop-on { border-color: #a6d8ff; background-color: #a6d8ff; box-shadow: 0 0 0 3px rgb(143 203 255 / 0.08); }

.fxp .fxp-tx-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: clamp(10px, 1.5dvh, 13px);
  border-top: 1px solid rgb(143 203 255 / 0.12);
  color: rgb(214 236 255 / 0.66);
  font-family: var(--fxp-font-mono);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.fxp .fxp-tx-step { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; transition: color 300ms ease-out; }

.fxp .fxp-tx-step + .fxp-tx-step::before {
  content: '';
  width: clamp(8px, 1.6vw, 24px);
  height: 1px;
  margin-right: 2px;
  background-color: rgb(143 203 255 / 0.2);
  transition: background-color 240ms ease;
}

.fxp .fxp-tx-step-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background-color: rgb(143 203 255 / 0.34);
  transition: background-color 240ms ease, box-shadow 240ms ease;
}

.fxp .fxp-tx-step-on { color: #cfe6ff; }
.fxp .fxp-tx-step-on .fxp-tx-step-dot { background-color: #8fcbff; box-shadow: 0 0 8px rgb(121 189 255 / 0.8); }
.fxp .fxp-tx-step-on::before { background-color: rgb(143 203 255 / 0.5); }

.fxp .fxp-tx-settled {
  display: none;
  margin-left: auto;
  color: #8fcbff;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 300ms ease-out;
}

.fxp .fxp-tx-settled-on { opacity: 1; }

@media (min-width: 640px) {
  .fxp .fxp-tx-settled { display: list-item; list-style: none; }
}

/* ---------- Stats shelf ---------- */

.fxp .fxp-shelf {
  position: relative;
  z-index: 10;
  display: flex;
  flex: none;
  justify-content: center;
  height: var(--fxp-shelf-h);
  margin-bottom: -1px;
  color: var(--fxp-page-bg);
}

.fxp .fxp-shelf-shoulder { flex: none; width: calc(var(--fxp-shelf-h) * 0.5); height: 100%; }

.fxp .fxp-shelf-body {
  position: relative;
  display: grid;
  flex: 0 1 var(--fxp-tab-w);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  min-width: 0;
  margin-inline: -3px;
  padding-top: 6px;
  background-color: var(--fxp-page-bg);
}

@media (min-width: 1024px) {
  .fxp .fxp-shelf { height: var(--fxp-tab-h); }
  .fxp .fxp-shelf-shoulder { width: var(--fxp-shoulder); }
  .fxp .fxp-shelf-body { flex-shrink: 0; }
}

.fxp .fxp-stat {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 2px;
  padding-inline: clamp(4px, 0.7vw, 12px);
  text-align: center;
}

@media (min-width: 640px) {
  .fxp .fxp-shelf-body { display: flex; }
  .fxp .fxp-stat { flex: 1 1 auto; }
}

.fxp .fxp-stat + .fxp-stat { border-left: 1px solid var(--fxp-page-border); }

.fxp .fxp-stat-value {
  position: relative;
  color: var(--fxp-page-primary);
  font-size: clamp(19px, 0.6rem + 0.9vw, 26px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.fxp .fxp-stat-label {
  color: var(--fxp-page-muted);
  font-size: clamp(11.5px, 0.42rem + 0.48vw, 14px);
  line-height: 1.3;
  letter-spacing: -0.005em;
}

@media (min-width: 640px) {
  .fxp .fxp-stat-label { white-space: nowrap; }
}

/* ---------- Reduced motion ---------- */

@media (prefers-reduced-motion: reduce) {
  .fxp:not([data-motion='full']) .fxp-badge-dot,
  .fxp:not([data-motion='full']) .fxp-tx-live-dot::after { animation: none; }

  .fxp:not([data-motion='full']) .fxp-btn-primary:is(:hover, :focus-visible)::before { transition: none; }
}

.fxp[data-motion='reduced'] .fxp-badge-dot,
.fxp[data-motion='reduced'] .fxp-tx-live-dot::after { animation: none; }

.fxp[data-motion='reduced'] .fxp-btn-primary:is(:hover, :focus-visible)::before { transition: none; }
`;

/* -------------------------------------------------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------------------------------------------- */

export function FluxPay({
  brandName,
  logo,
  logoHref = '#',
  logoLabel,
  onLogoClick,
  badge,
  titleLines,
  titleLinesPhone,
  headingLevel = 1,
  primaryAction,
  secondaryAction,
  signUp,
  navItems,
  showNavbar = true,
  navLabel = 'Primary',
  openMenuLabel = 'Open menu',
  closeMenuLabel = 'Close menu',
  stats,
  transfers,
  transferTitle,
  transferLabel,
  transferSteps = DEFAULT_STEPS,
  sendLabel = 'Send',
  receiveLabel = 'Receive',
  locale = 'en-US',
  palette,
  fonts,
  field,
  ripple,
  cursor,
  clear,
  glow,
  count,
  transferTiming,
  height = '100dvh',
  reducedMotion = 'user',
  className,
  style,
  ...rest
}: FluxPayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const id = useId();
  const systemReduce = usePrefersReducedMotion();

  const titleId = `${id}-title`;
  const menuId = `${id}-menu`;
  const pillId = `${id}-pill`;
  const reduce = reducedMotion === 'always' ? true : reducedMotion === 'never' ? false : systemReduce;
  const links = navItems ?? [];
  const figures = stats ?? [];
  const examples = transfers ?? [];
  const lines = titleLines ?? [];
  const phoneLines = titleLinesPhone ?? [];
  const hasPhoneTitle = lines.length > 0 && phoneLines.length > 0;
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  const plainTitle = lines.join(' ').replaceAll('*', '');
  const hasActions = Boolean(primaryAction) || Boolean(secondaryAction);
  const shouldRenderNavbar =
    showNavbar && (Boolean(brandName) || Boolean(logo) || links.length > 0 || Boolean(signUp));

  const mergedPalette = withDefaults(DEFAULT_PALETTE, palette);
  const mergedField = withDefaults(DEFAULT_FIELD, field);
  const mergedRipple = withDefaults(DEFAULT_RIPPLE, ripple);
  const mergedCursor = withDefaults(DEFAULT_CURSOR, cursor);
  const mergedClear = withDefaults(DEFAULT_CLEAR, clear);
  const mergedGlow = withDefaults(DEFAULT_GLOW, glow);
  const mergedCount = withDefaults(DEFAULT_COUNT, count);
  const mergedTiming = withDefaults(DEFAULT_TRANSFER_TIMING, transferTiming);

  const canvasKey = JSON.stringify({
    palette: mergedPalette,
    field: mergedField,
    ripple: mergedRipple,
    cursor: mergedCursor,
    glow: mergedGlow,
  });

  const canvasConfig = useMemo(() => JSON.parse(canvasKey) as CanvasConfig, [canvasKey]);

  const timingKey = JSON.stringify(mergedTiming);
  const timing = useMemo(() => JSON.parse(timingKey) as Required<FluxPayTransferTiming>, [timingKey]);

  const countKey = JSON.stringify(mergedCount);
  const countOptions = useMemo(() => JSON.parse(countKey) as Required<FluxPayCountOptions>, [countKey]);

  const rootStyle = {
    '--fxp-height': height,
    '--fxp-night': mergedPalette.night,
    '--fxp-ink': mergedPalette.ink,
    '--fxp-glow-core': mergedPalette.glowCore,
    '--fxp-glow-mid': mergedPalette.glowMid,
    '--fxp-glow-wash': mergedPalette.glowWash,
    '--fxp-glow': mergedGlow.strength,
    '--fxp-glow-w': `${mergedGlow.width}%`,
    '--fxp-glow-h': `${mergedGlow.height}%`,
    '--fxp-clear-w': `${mergedClear.width}%`,
    '--fxp-clear-h': `${mergedClear.height}%`,
    '--fxp-clear-y': `${mergedClear.y}%`,
    '--fxp-clear-keep': 1 - mergedClear.strength,
    ...(fonts?.sans ? { '--fxp-font-sans': fonts.sans } : {}),
    ...(fonts?.serif ? { '--fxp-font-serif': fonts.serif } : {}),
    ...(fonts?.mono ? { '--fxp-font-mono': fonts.mono } : {}),
    ...style,
  } as CSSProperties;

  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion={reducedMotion}>
        <section
          data-slot='fluxpay'
          data-motion={reducedMotion === 'always' ? 'reduced' : reducedMotion === 'never' ? 'full' : undefined}
          aria-labelledby={lines.length > 0 ? titleId : undefined}
          className={cn('fxp', className)}
          style={rootStyle}
          {...rest}
        >
          <style dangerouslySetInnerHTML={{ __html: BLOCK_CSS }} />

          <div ref={panelRef} className='fxp-panel'>
            <div aria-hidden='true' className='fxp-glow' />
            <PixelField areaRef={panelRef} config={canvasConfig} reduce={reduce} />

            {shouldRenderNavbar && (
              <Navbar
                brandName={brandName}
                logo={logo}
                logoHref={logoHref}
                logoLabel={logoLabel ?? (brandName ? `${brandName} home` : 'Home')}
                onLogoClick={onLogoClick}
                navItems={links}
                navLabel={navLabel}
                openMenuLabel={openMenuLabel}
                closeMenuLabel={closeMenuLabel}
                signUp={signUp}
                menuId={menuId}
                pillId={pillId}
              />
            )}

            <div className='fxp-stage'>
              <div className='fxp-copy'>
                {badge && (
                  <m.p {...rise(0.3)} className='fxp-badge'>
                    <span aria-hidden='true' className='fxp-badge-dot' />
                    {badge}
                  </m.p>
                )}

                {lines.length > 0 && (
                  <Heading id={titleId} className={cn('fxp-title', hasPhoneTitle && 'fxp-title-split')}>
                    <span className='fxp-sr'>{plainTitle}</span>
                    <span aria-hidden='true' className='fxp-title-set fxp-title-set-wide'>
                      {lines.map((line, index) => (
                        <TitleLine key={`${index}-${line}`} delay={0.42 + index * 0.12}>
                          <TitleText line={line} />
                        </TitleLine>
                      ))}
                    </span>
                    {hasPhoneTitle && (
                      <span aria-hidden='true' className='fxp-title-set fxp-title-set-phone'>
                        {phoneLines.map((line, index) => (
                          <TitleLine key={`${index}-${line}`} delay={0.42 + index * 0.1}>
                            <TitleText line={line} />
                          </TitleLine>
                        ))}
                      </span>
                    )}
                  </Heading>
                )}

                {examples.length > 0 && (
                  <TransferCard
                    transfers={examples}
                    title={transferTitle}
                    label={transferLabel}
                    steps={transferSteps}
                    sendLabel={sendLabel}
                    receiveLabel={receiveLabel}
                    locale={locale}
                    timing={timing}
                    reduce={reduce}
                  />
                )}

                {hasActions && (
                  <m.div {...rise(0.86)} className='fxp-actions-row'>
                    <div className='fxp-actions'>
                      {primaryAction && (
                        <a
                          href={primaryAction.href}
                          data-slot='fluxpay-primary'
                          onClick={event => handleLinkNavigation(event, primaryAction.href, primaryAction.onClick)}
                          className='fxp-btn fxp-btn-primary'
                        >
                          {primaryAction.label}
                        </a>
                      )}
                      {secondaryAction && (
                        <a
                          href={secondaryAction.href}
                          data-slot='fluxpay-secondary'
                          onClick={event => handleLinkNavigation(event, secondaryAction.href, secondaryAction.onClick)}
                          className='fxp-btn fxp-btn-secondary'
                        >
                          {secondaryAction.label}
                        </a>
                      )}
                    </div>
                  </m.div>
                )}
              </div>
            </div>

            {figures.length > 0 && <StatsShelf stats={figures} count={countOptions} reduce={reduce} />}
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}

export default FluxPay;
