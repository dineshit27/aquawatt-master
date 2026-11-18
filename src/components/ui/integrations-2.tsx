import React from 'react';
import type { IconType } from 'react-icons';
import {
  SiReact,
  SiTypescript,
  SiVite,
  SiNodedotjs,
  SiExpress,
  SiSupabase,
  SiPostgresql,
  SiGooglegemini,
  SiModelcontextprotocol,
  SiEspressif,
  SiMqtt,
  SiRender,
} from 'react-icons/si';

interface TechStackItem {
  name: string;
  url: string;
  icon: IconType;
  iconColorClass: string;
  hoverClassName: string;
}

const TECH_STACK: TechStackItem[] = [
  {
    name: 'React',
    url: 'https://react.dev',
    icon: SiReact,
    iconColorClass: 'text-[#087EA4] dark:text-[#61DAFB]',
    hoverClassName:
      'hover:bg-[#61DAFB]/16 dark:hover:bg-[#61DAFB]/14 hover:text-[#087EA4] dark:hover:text-[#61DAFB] hover:ring-1 hover:ring-inset hover:ring-[#087EA4]/35 dark:hover:ring-[#61DAFB]/40',
  },
  {
    name: 'TypeScript',
    url: 'https://www.typescriptlang.org',
    icon: SiTypescript,
    iconColorClass: 'text-[#3178C6]',
    hoverClassName:
      'hover:bg-[#3178C6]/12 dark:hover:bg-[#3178C6]/18 hover:text-[#235A97] dark:hover:text-[#60A5FA] hover:ring-1 hover:ring-inset hover:ring-[#3178C6]/35',
  },
  {
    name: 'Vite',
    url: 'https://vite.dev',
    icon: SiVite,
    iconColorClass: 'text-[#646CFF]',
    hoverClassName:
      'hover:bg-[#646CFF]/12 dark:hover:bg-[#646CFF]/18 hover:text-[#535BF2] dark:hover:text-[#8B93FF] hover:ring-1 hover:ring-inset hover:ring-[#646CFF]/35',
  },
  {
    name: 'Node.js',
    url: 'https://nodejs.org',
    icon: SiNodedotjs,
    iconColorClass: 'text-[#5FA04E]',
    hoverClassName:
      'hover:bg-[#5FA04E]/12 dark:hover:bg-[#5FA04E]/18 hover:text-[#3E7A30] dark:hover:text-[#78C257] hover:ring-1 hover:ring-inset hover:ring-[#5FA04E]/35',
  },
  {
    name: 'Express',
    url: 'https://expressjs.com',
    icon: SiExpress,
    iconColorClass: 'text-slate-900 dark:text-white',
    hoverClassName:
      'hover:bg-slate-900/8 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white hover:ring-1 hover:ring-inset hover:ring-slate-900/25 dark:hover:ring-white/30',
  },
  {
    name: 'Supabase',
    url: 'https://supabase.com',
    icon: SiSupabase,
    iconColorClass: 'text-[#3ECF8E]',
    hoverClassName:
      'hover:bg-[#3ECF8E]/14 dark:hover:bg-[#3ECF8E]/15 hover:text-[#1D8A5A] dark:hover:text-[#3ECF8E] hover:ring-1 hover:ring-inset hover:ring-[#3ECF8E]/40',
  },
  {
    name: 'PostgreSQL',
    url: 'https://www.postgresql.org',
    icon: SiPostgresql,
    iconColorClass: 'text-[#4169E1] dark:text-[#60A5FA]',
    hoverClassName:
      'hover:bg-[#4169E1]/12 dark:hover:bg-[#60A5FA]/15 hover:text-[#3358C4] dark:hover:text-[#60A5FA] hover:ring-1 hover:ring-inset hover:ring-[#4169E1]/35',
  },
  {
    name: 'Render',
    url: 'https://render.com',
    icon: SiRender,
    iconColorClass: 'text-slate-900 dark:text-white',
    hoverClassName:
      'hover:bg-slate-900/8 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white hover:ring-1 hover:ring-inset hover:ring-slate-900/25 dark:hover:ring-white/30',
  },
  {
    name: 'Google Gemini',
    url: 'https://ai.google.dev',
    icon: SiGooglegemini,
    iconColorClass: 'text-[#1A73E8] dark:text-[#60A5FA]',
    hoverClassName:
      'hover:bg-[#1A73E8]/12 dark:hover:bg-[#60A5FA]/15 hover:text-[#1558B0] dark:hover:text-[#60A5FA] hover:ring-1 hover:ring-inset hover:ring-[#1A73E8]/35',
  },
  {
    name: 'Model Context Protocol (MCP)',
    url: 'https://modelcontextprotocol.io',
    icon: SiModelcontextprotocol,
    iconColorClass: 'text-slate-900 dark:text-white',
    hoverClassName:
      'hover:bg-slate-900/8 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white hover:ring-1 hover:ring-inset hover:ring-slate-900/25 dark:hover:ring-white/30',
  },
  {
    name: 'ESP32',
    url: 'https://www.espressif.com/en/products/socs/esp32',
    icon: SiEspressif,
    iconColorClass: 'text-[#E7352C]',
    hoverClassName:
      'hover:bg-[#E7352C]/12 dark:hover:bg-[#E7352C]/16 hover:text-[#C5241C] dark:hover:text-[#F87171] hover:ring-1 hover:ring-inset hover:ring-[#E7352C]/35',
  },
  {
    name: 'MQTT',
    url: 'https://mqtt.org',
    icon: SiMqtt,
    iconColorClass: 'text-[#660066] dark:text-[#C084FC]',
    hoverClassName:
      'hover:bg-[#660066]/10 dark:hover:bg-[#C084FC]/15 hover:text-[#660066] dark:hover:text-[#C084FC] hover:ring-1 hover:ring-inset hover:ring-[#660066]/35 dark:hover:ring-[#C084FC]/40',
  },
];

export interface Integrations2Props {
  title?: string;
  className?: string;
}

export default function Integrations2({
  title = 'Intelligent infrastructure for water, energy and sustainability.',
  className = '',
}: Integrations2Props) {
  const renderTile = (item: TechStackItem) => {
    const Icon = item.icon;
    return (
      <a
        key={item.name}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.name} — Visit official website`}
        className={`group bg-white dark:bg-[#0B111D] text-slate-900 dark:text-white flex min-h-24 items-center justify-center gap-2.5 px-4 py-4 text-center transition-all duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${item.hoverClassName}`}
      >
        <Icon
          className={`size-7 shrink-0 transition-transform duration-200 group-hover:scale-110 ${item.iconColorClass}`}
          aria-hidden="true"
        />
        <span className="font-heading text-sm sm:text-base font-semibold tracking-tight leading-tight transition-colors duration-200">
          {item.name}
        </span>
      </a>
    );
  };

  return (
    <div className={`w-full py-10 sm:py-12 ${className}`}>
      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-200/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800/90 grid grid-flow-row-dense grid-cols-2 gap-px overflow-hidden sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-4">
          {TECH_STACK.slice(0, 5).map(renderTile)}

          <div className="bg-slate-50/90 dark:bg-[#0E1626] relative col-span-2 row-span-2 flex flex-col items-center justify-center overflow-hidden p-8 text-center sm:col-span-3 md:col-span-6 lg:col-span-2">
            <div className="relative z-10 max-w-xs">
              <h3 className="text-slate-900 dark:text-white text-lg sm:text-xl leading-snug font-semibold font-heading text-balance">
                {title}
              </h3>
            </div>
          </div>

          {TECH_STACK.slice(5).map(renderTile)}
        </div>
      </div>
    </div>
  );
}

export { Integrations2 };
