import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HomeSectionBadge } from './HomeSectionBadge';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What hardware and sensors does AquaWatt use?',
    answer:
      'AquaWatt currently runs an operational FS-S401 water flow sensor on GPIO34 of an ESP32 DevKit with a 16×2 LCD display. An INA219 power module is installed with calibration pending, while pressure, temperature, and motorized valve hardware remain planned.',
  },
  {
    question: 'How does telemetry move from the ESP32 to the cloud?',
    answer:
      'The architecture routes ESP32 Wi-Fi readings through an MQTT broker and ingestion service into Supabase PostgreSQL for the dashboard, Gemini assistant, and MCP tools. Live end-to-end MQTT verification is currently pending.',
  },
  {
    question: 'Which parts of the AquaWatt platform are already implemented?',
    answer:
      'The React, TypeScript, and Vite web console, Node.js and Express server, Supabase PostgreSQL schema, Google Gemini AI assistant, and Model Context Protocol (MCP) integrations are implemented in the project.',
  },
  {
    question: 'Is automated motorized valve shutoff connected right now?',
    answer:
      'Not yet. The motorized ball valve is planned as a future local safety control feature and is not currently connected. Any valve trip controls shown on the homepage are interactive UI previews.',
  },
  {
    question: 'How do Google Gemini and MCP assist with conservation?',
    answer:
      'Gemini and MCP tools inspect water flow and energy telemetry records in Supabase to highlight usage spikes, summarize consumption patterns, and recommend water and off-peak energy conservation steps.',
  },
];

export const FaqSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setActiveIndex((current) => (current === index ? null : index));
  };

  return (
    <section
      aria-labelledby="faq-section-heading"
      className="c5-faq-section bg-white dark:bg-[#0B111D] text-neutral-900 dark:text-slate-100 font-['Inter',sans-serif] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors"
    >
      <div className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 max-[900px]:py-[60px]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <HomeSectionBadge icon="❓" className="mb-3">
            FAQ
          </HomeSectionBadge>
          <h2
            id="faq-section-heading"
            className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight"
          >
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Hardware boundaries, cloud telemetry flow, and platform capabilities explained.
          </p>
        </div>

        <div className="grid grid-cols-[1.6fr_1fr] gap-[30px] items-stretch max-[900px]:grid-cols-1 max-[900px]:gap-[60px]">
          {/* Left column — Animated Gradient CTA card */}
          <div className="c5-animated-gradient rounded-[24px] py-12 px-6 sm:py-20 sm:px-10 text-white flex flex-col justify-center items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <h3 className="font-normal leading-[1.1] mb-[15px] text-3xl sm:text-5xl lg:text-[3.5rem] tracking-[-0.03em]">
              Monitor Water &amp; Power
              <br />
              in One Console
            </h3>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-neutral-900 text-white font-semibold cursor-pointer border-none text-[0.95rem] transition-all duration-200 hover:-translate-y-0.5 px-[32px] py-[14px] rounded-[12px] shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.4)]"
            >
              Launch AquaWatt Console
            </button>
          </div>

          {/* Right column — FAQ accordion */}
          <div className="flex flex-col justify-center gap-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isActive = activeIndex === idx;
              const panelId = `home-faq-panel-${idx}`;
              return (
                <div
                  key={item.question}
                  className={`bg-white dark:bg-[#0E1626] border rounded-[10px] transition-all duration-200 ${
                    isActive
                      ? 'border-[#eaeaea] dark:border-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.04)]'
                      : 'border-[#f0f0f0] dark:border-slate-800 hover:border-[#eaeaea] dark:hover:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isActive}
                    aria-controls={panelId}
                    onClick={() => toggleItem(idx)}
                    className="w-full text-left py-[18px] px-5 flex justify-between items-center gap-3 font-normal text-[0.9rem] text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <span>{item.question}</span>
                    {isActive ? (
                      <ChevronUp size={20} className="shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="shrink-0" />
                    )}
                  </button>
                  {isActive && (
                    <div
                      id={panelId}
                      className="px-5 pb-[18px] text-[0.9rem] text-[#666] dark:text-slate-300 leading-[1.6]"
                    >
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
