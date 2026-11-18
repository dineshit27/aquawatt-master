import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __entranceFallback?: number;
    __entranceStarted?: boolean;
  }
}

const SPARKLES = Object.freeze([
  Object.freeze({ x: 0.01, y: 0.01, size: 0.5 }),
  Object.freeze({ x: 0.28, y: 0.26, size: 0.72 }),
]);

const SPARKLE_POINTS = Object.freeze([
  Object.freeze([0.5, 0.06]),
  Object.freeze([0.59, 0.41]),
  Object.freeze([0.94, 0.5]),
  Object.freeze([0.59, 0.59]),
  Object.freeze([0.5, 0.94]),
  Object.freeze([0.41, 0.59]),
  Object.freeze([0.06, 0.5]),
  Object.freeze([0.41, 0.41]),
] as const);

const FLOW_SHAPE = Object.freeze({
  sourceHold: 0.38,
  targetApproach: 0.74,
  threadWidth: 0.00135,
});

const FLOW_BANDS = Object.freeze([
  Object.freeze({ source: [0.08, 0.26] as const, target: [0.29, 0.32] as const, color: 'rgba(255,189,144,.60)' }),
  Object.freeze({ source: [0.23, 0.42] as const, target: [0.3, 0.335] as const, color: 'rgba(255,149,80,.70)' }),
  Object.freeze({ source: [0.5, 0.75] as const, target: [0.32, 0.355] as const, color: 'rgba(255,136,64,.82)' }),
  Object.freeze({ source: [0.69, 0.98] as const, target: [0.33, 0.365] as const, color: 'rgba(255,181,128,.54)' }),
  Object.freeze({ source: [0.39, 0.51] as const, target: [0.31, 0.345] as const, color: 'rgba(255,105,0,.96)' }),
]);

const FLOW_THREADS = Object.freeze([
  Object.freeze({ source: 0.05, target: 0.3, alpha: 0.68 }),
  Object.freeze({ source: 0.2, target: 0.315, alpha: 0.6 }),
  Object.freeze({ source: 0.62, target: 0.342, alpha: 0.84 }),
  Object.freeze({ source: 0.82, target: 0.352, alpha: 0.74 }),
  Object.freeze({ source: 0.97, target: 0.36, alpha: 0.64 }),
]);

const BAR_COUNT = 24;

function roundedPolygon(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
  roundness = 0.34
) {
  const n = points.length;
  if (n < 3) return;

  const corners = points.map((curr, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    return {
      curr,
      before: [
        curr[0] + (prev[0] - curr[0]) * roundness,
        curr[1] + (prev[1] - curr[1]) * roundness,
      ] as const,
      after: [
        curr[0] + (next[0] - curr[0]) * roundness,
        curr[1] + (next[1] - curr[1]) * roundness,
      ] as const,
    };
  });

  ctx.beginPath();
  ctx.moveTo(corners[0].after[0], corners[0].after[1]);
  for (let i = 1; i <= n; i += 1) {
    const c = corners[i % n];
    ctx.lineTo(c.before[0], c.before[1]);
    ctx.quadraticCurveTo(c.curr[0], c.curr[1], c.after[0], c.after[1]);
  }
  ctx.closePath();
}

function sizeCanvasToDpr(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.max(1, Math.round(rect.width * dpr));
  const targetH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { ctx, w: rect.width, h: rect.height };
}

function drawSparkleIcon(canvas: HTMLCanvasElement) {
  const sized = sizeCanvasToDpr(canvas);
  if (!sized) return;
  const { ctx, w, h } = sized;
  const base = Math.min(w, h);

  for (const sparkle of SPARKLES) {
    const size = base * sparkle.size;
    const offsetX = w * sparkle.x;
    const offsetY = h * sparkle.y;
    const pts = SPARKLE_POINTS.map(([px, py]) => [offsetX + px * size, offsetY + py * size] as const);

    roundedPolygon(ctx, pts, 0.34);
    ctx.fillStyle = 'rgba(255,220,202,.55)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1.1, size * 0.15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,255,255,.78)';
    ctx.shadowBlur = size * 0.06;
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

function drawFlowChart(canvas: HTMLCanvasElement) {
  const sized = sizeCanvasToDpr(canvas);
  if (!sized) return;
  const { ctx, w, h } = sized;
  const { sourceHold, targetApproach, threadWidth } = FLOW_SHAPE;
  const cp1x = w * sourceHold;
  const cp2x = w * targetApproach;

  for (const band of FLOW_BANDS) {
    const sTop = h * band.source[0];
    const sBot = h * band.source[1];
    const tTop = h * band.target[0];
    const tBot = h * band.target[1];

    ctx.beginPath();
    ctx.moveTo(0, sTop);
    ctx.bezierCurveTo(cp1x, sTop, cp2x, tTop, w, tTop);
    ctx.lineTo(w, tBot);
    ctx.bezierCurveTo(cp2x, tBot, cp1x, sBot, 0, sBot);
    ctx.closePath();
    ctx.fillStyle = band.color;
    ctx.fill();
  }

  ctx.lineWidth = Math.max(0.72, w * threadWidth);
  for (const thread of FLOW_THREADS) {
    const sy = h * thread.source;
    const ty = h * thread.target;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(cp1x, sy, cp2x, ty, w, ty);
    ctx.strokeStyle = `rgba(255,255,255,${thread.alpha})`;
    ctx.stroke();
  }
}

function revealImmediately() {
  if (typeof window !== 'undefined' && window.__entranceFallback) {
    clearTimeout(window.__entranceFallback);
    window.__entranceFallback = undefined;
  }
  document.documentElement.classList.remove('entrance-pending', 'entrance-active');
}

export const FalconOperationsTriptych: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sparkleCanvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('[data-sparkle-icon]'));
    const flowCanvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('[data-flow-chart]'));

    const redrawAll = () => {
      sparkleCanvases.forEach(drawSparkleIcon);
      flowCanvases.forEach(drawFlowChart);
    };

    redrawAll();

    const ro = new ResizeObserver(() => {
      redrawAll();
    });

    sparkleCanvases.forEach((c) => ro.observe(c));
    flowCanvases.forEach((c) => ro.observe(c));

    return () => {
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const cardsContainer = cardsRef.current;
    if (!root || !cardsContainer) return;

    const html = document.documentElement;
    if (!html.classList.contains('entrance-pending') || window.__entranceStarted) {
      return;
    }

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let io: IntersectionObserver | null = null;
    const runningAnimations: Animation[] = [];

    const runEntrance = () => {
      if (cancelled || window.__entranceStarted) return;

      const allCards = Array.from(cardsContainer.querySelectorAll<HTMLElement>('.falcon-card'));
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const visibleCards = allCards
        .map((el, index) => ({ el, index, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw);

      if (visibleCards.length === 0) {
        return false;
      }

      window.__entranceStarted = true;
      html.classList.add('entrance-active');
      html.classList.remove('entrance-pending');

      const minTop = Math.min(...visibleCards.map((c) => c.rect.top));
      const avgHeight = visibleCards.reduce((sum, c) => sum + c.rect.height, 0) / visibleCards.length;
      const singleRow = visibleCards.every((c) => Math.abs(c.rect.top - minTop) <= Math.max(4, avgHeight * 0.04));

      const viewportCenter = vw / 2;
      const ordered = [...visibleCards].sort((a, b) => {
        if (singleRow) {
          if (a.index === 1) return -1;
          if (b.index === 1) return 1;
          const distA = Math.abs(a.rect.left + a.rect.width / 2 - viewportCenter);
          const distB = Math.abs(b.rect.left + b.rect.width / 2 - viewportCenter);
          return distA - distB;
        }
        if (Math.abs(a.rect.top - b.rect.top) > 4) {
          return a.rect.top - b.rect.top;
        }
        return a.rect.left - b.rect.left;
      });

      const compact = vw <= 512;
      const rise = compact ? 11 : 16;
      const easePlace = 'cubic-bezier(.16,1,.3,1)';
      const easeWipe = 'cubic-bezier(.24,.86,.28,1)';

      try {
        ordered.forEach((entry, order) => {
          const isPrimary = entry.index === 1;
          const delay = singleRow
            ? isPrimary
              ? 60
              : 245 + (order - 1) * 85
            : 70 + order * 115;

          const cardCenter = entry.rect.left + entry.rect.width / 2;
          const centreOffset = cardCenter - viewportCenter;
          const drift =
            singleRow && !isPrimary && centreOffset !== 0
              ? -Math.sign(centreOffset) * Math.min(vw * 0.018, 7)
              : 0;

          const cardEl = entry.el;
          const panelEl = cardEl.querySelector<HTMLElement>('.falcon-panel');
          const copyEl = cardEl.querySelector<HTMLElement>('.falcon-card-copy');
          const headingEl = cardEl.querySelector<HTMLElement>('.falcon-card-copy h2');
          const descEl = cardEl.querySelector<HTMLElement>('.falcon-card-copy p');
          const accentEl = cardEl.querySelector<HTMLElement>('.falcon-corner-icon');

          runningAnimations.push(
            cardEl.animate(
              [
                { opacity: 0, transform: `translate3d(${drift}px, ${rise}px, 0) scale(.985)` },
                { opacity: 1, transform: 'none' },
              ],
              {
                duration: compact ? 780 : isPrimary ? 960 : 900,
                delay,
                easing: easePlace,
                fill: 'both',
              }
            )
          );

          if (panelEl) {
            runningAnimations.push(
              panelEl.animate(
                [
                  { opacity: 0, transform: 'scale(.994)', clipPath: `inset(0 0 ${compact ? 26 : 34}% 0)` },
                  { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' },
                ],
                {
                  duration: compact ? 620 : 720,
                  delay: delay + 200,
                  easing: easeWipe,
                  fill: 'both',
                }
              )
            );
          }

          if (copyEl) {
            runningAnimations.push(
              copyEl.animate(
                [
                  { opacity: 0, transform: `translate3d(0, ${compact ? 8 : 11}px, 0)` },
                  { opacity: 1, transform: 'none' },
                ],
                {
                  duration: compact ? 540 : 620,
                  delay: delay + 330,
                  easing: easePlace,
                  fill: 'both',
                }
              )
            );
          }

          if (headingEl) {
            runningAnimations.push(
              headingEl.animate(
                [
                  { opacity: 0, clipPath: 'inset(-30% 0 100% 0)' },
                  { opacity: 1, clipPath: 'inset(-30% 0 -30% 0)' },
                ],
                {
                  duration: compact ? 470 : 540,
                  delay: delay + 350,
                  easing: easeWipe,
                  fill: 'both',
                }
              )
            );
          }

          if (descEl) {
            runningAnimations.push(
              descEl.animate(
                [
                  { opacity: 0, clipPath: 'inset(-30% 0 100% 0)' },
                  { opacity: 1, clipPath: 'inset(-30% 0 -30% 0)' },
                ],
                {
                  duration: compact ? 430 : 490,
                  delay: delay + 450,
                  easing: easeWipe,
                  fill: 'both',
                }
              )
            );
          }

          if (accentEl) {
            runningAnimations.push(
              accentEl.animate(
                [
                  { opacity: 0, transform: 'scale(.88)' },
                  { opacity: 1, transform: 'none' },
                ],
                {
                  duration: compact ? 340 : 400,
                  delay: delay + 540,
                  easing: easePlace,
                  fill: 'both',
                }
              )
            );
          }
        });

        Promise.all(runningAnimations.map((a) => a.finished.catch(() => undefined))).then(() => {
          if (cancelled) return;
          runningAnimations.forEach((a) => {
            try {
              a.cancel();
            } catch {
              // ignore
            }
          });
          revealImmediately();
        });
      } catch {
        runningAnimations.forEach((a) => {
          try {
            a.cancel();
          } catch {
            // ignore
          }
        });
        revealImmediately();
      }

      return true;
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const started = runEntrance();
        if (!started && typeof IntersectionObserver !== 'undefined') {
          io = new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                io?.disconnect();
                io = null;
                runEntrance();
              }
            },
            { threshold: 0.1 }
          );
          io.observe(cardsContainer);
        } else if (!started) {
          revealImmediately();
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      io?.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="falcon-viewport" aria-label="Falcon AI operations overview">
      <div className="falcon-scene">
        <div ref={cardsRef} className="falcon-cards" aria-label="Product benefits">
          {/* CARD 1 — Instant Visibility */}
          <article className="falcon-card">
            <div className="falcon-panel" aria-label="Visibility timeline chart">
              <div className="falcon-timeline">
                <span>06 AM</span>
                <i aria-hidden="true" />
                <span>12 PM</span>
                <i aria-hidden="true" />
                <span>06 PM</span>
              </div>
              <div className="falcon-bars" aria-hidden="true">
                {Array.from({ length: BAR_COUNT }, (_, idx) => (
                  <i key={idx} className={idx === 12 ? 'falcon-bar active' : 'falcon-bar'} />
                ))}
              </div>
              <div className="falcon-value-chip">$4.7M</div>
              <div className="falcon-axis">
                <span>START</span>
                <span>ACTIVE</span>
                <span>PEAK</span>
                <span>COMPLETE</span>
              </div>
            </div>
            <div className="falcon-card-copy">
              <h2>Instant Visibility</h2>
              <p>
                Real-time data across your
                <br />
                operations.
              </p>
              <span className="falcon-corner-icon">
                <i className="falcon-spark" aria-hidden="true" />
              </span>
            </div>
          </article>

          {/* CARD 2 — Autonomous Workflows */}
          <article className="falcon-card">
            <div className="falcon-panel">
              <div className="falcon-assistant-head">
                <span className="falcon-badge">
                  <i className="falcon-spark" aria-hidden="true" />
                </span>
                <span>Falcon AI</span>
              </div>
              <p className="falcon-question">How can I help you automate?</p>
              <div className="falcon-prompt">
                When a new lead is captured in WebFlow,
                <br />
                create a deal in HubSpot and notify the sales
                <br />
                team on Slack.
              </div>
              <div className="falcon-automate">
                <span className="falcon-automate-label">Automate</span>
                <canvas className="falcon-magic" data-sparkle-icon aria-hidden="true" />
              </div>
              <i className="falcon-cursor" aria-hidden="true" />
            </div>
            <div className="falcon-card-copy">
              <h2>Autonomous Workflows</h2>
              <p>
                Automate processes with
                <br />
                Falcon AI.
              </p>
              <span className="falcon-corner-icon">
                <i className="falcon-flow-icon" aria-hidden="true" />
              </span>
            </div>
          </article>

          {/* CARD 3 — Faster Decisions */}
          <article className="falcon-card">
            <div className="falcon-panel">
              <div className="falcon-metric">
                <div className="falcon-metric-label">Time saved</div>
                <div className="falcon-metric-row">
                  <strong>128 Hrs</strong>
                  <span>↑ 18% efficiency</span>
                </div>
              </div>
              <canvas
                className="falcon-decision-flow"
                data-flow-chart
                aria-label="Decision paths converging into an optimized result"
              />
              <div className="falcon-tag action">Action: Approve</div>
              <div className="falcon-tag confidence">Decision Confidence: 98%</div>
              <div className="falcon-tag path">Path Optimized: +14.2%</div>
            </div>
            <div className="falcon-card-copy">
              <h2>Faster Decisions</h2>
              <p>
                Turn insights into action
                <br />
                instantly.
              </p>
              <span className="falcon-corner-icon">
                <i className="falcon-speed" aria-hidden="true" />
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};
