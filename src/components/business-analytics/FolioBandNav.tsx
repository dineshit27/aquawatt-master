import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

export interface SectionDescriptor {
  id: string;
  num: string;
  title: string;
}

interface FolioBandNavProps {
  sections: ReadonlyArray<SectionDescriptor>;
  activeIndex: number;
  scrollProgress: number;
  isSwappingTitle: boolean;
  onJumpToSection: (index: number) => void;
  onOpenControls: () => void;
}

export const FolioBandNav: React.FC<FolioBandNavProps> = ({
  sections,
  activeIndex,
  scrollProgress,
  isSwappingTitle,
  onJumpToSection,
  onOpenControls,
}) => {
  const pagerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const activeSection = sections[activeIndex] ?? sections[0];

  useEffect(() => {
    const pagerEl = pagerRef.current;
    const indEl = indicatorRef.current;
    if (!pagerEl || !indEl) return;

    const activeBtn = pagerEl.querySelectorAll('button')[activeIndex];
    if (!activeBtn) return;

    const left = activeBtn.offsetLeft + (activeBtn.offsetWidth - 24) / 2;
    indEl.style.setProperty('--ind-x', `${left}px`);
  }, [activeIndex]);

  return (
    <header className="band" role="banner">
      <div className="band-left">
        <Link
          to="/dashboard"
          className="band-back"
          title="Return to AquaWatt Facility Console"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Console</span>
        </Link>

        <div className="band-id hidden sm:inline-flex">
          <span className="band-name">AquaWatt</span>
          <span className="band-year">ANALYTICS 2026</span>
        </div>

        <span
          className={`band-title${isSwappingTitle ? ' is-swapping' : ''}`}
          aria-live="polite"
        >
          {activeSection.num} — {activeSection.title}
        </span>
      </div>

      <div className="band-rail">
        <nav
          ref={pagerRef}
          className="band-pager"
          aria-label="Business analytics sections"
        >
          <span
            ref={indicatorRef}
            className="pager-indicator"
            aria-hidden="true"
          />
          {sections.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              aria-label={`Jump to Section ${sec.num}: ${sec.title}`}
              aria-current={idx === activeIndex ? 'true' : undefined}
              onClick={() => onJumpToSection(idx)}
            >
              {sec.num}
            </button>
          ))}
        </nav>

        <div className="band-mobile-nav">
          <button
            type="button"
            className="band-btn"
            aria-label="Previous section"
            disabled={activeIndex === 0}
            onClick={() => onJumpToSection(Math.max(0, activeIndex - 1))}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <select
            aria-label="Jump to section"
            value={activeIndex}
            onChange={e => onJumpToSection(Number(e.target.value))}
            className="min-w-0 max-w-[165px] sm:max-w-[220px] truncate bg-transparent border border-white/25 rounded px-2 py-1 text-[11px] font-mono text-white"
          >
            {sections.map((sec, idx) => (
              <option key={sec.id} value={idx} className="text-slate-900">
                {sec.num} · {sec.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="band-btn"
            aria-label="Next section"
            disabled={activeIndex === sections.length - 1}
            onClick={() =>
              onJumpToSection(Math.min(sections.length - 1, activeIndex + 1))
            }
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="band-right">
        <button
          type="button"
          className="band-btn"
          onClick={onOpenControls}
          aria-label="Open analytics display and data source controls"
        >
          <span className="swatch-dot" aria-hidden="true" />
          <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
          <span className="hidden sm:inline">Controls</span>
        </button>
      </div>

      <div className="band-progress" aria-hidden="true">
        <i style={{ '--scroll-p': scrollProgress.toFixed(4) } as React.CSSProperties} />
      </div>
    </header>
  );
};
