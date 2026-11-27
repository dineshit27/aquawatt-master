"use client";

import * as React from "react";
import { motion } from "framer-motion";
import * as Accordion from "@radix-ui/react-accordion";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  icon?: string;
  iconPosition?: "left" | "right";
}

export interface ScrollFAQAccordionProps {
  data?: FAQItem[];
  title?: string;
  subtitle?: string;
  className?: string;
  questionClassName?: string;
  answerClassName?: string;
  enableScrollPin?: boolean;
}

const DEFAULT_FAQ_DATA: FAQItem[] = [
  {
    id: 1,
    question: "What hardware architecture does AquaWatt use?",
    answer:
      "AquaWatt targets ESP32 microcontrollers with an operational FS-S401 Hall-effect pulse water flow sensor (GPIO34) and a 16×2 character LCD display. An INA219 high-side DC power module is included in the design with calibration still pending.",
  },
  {
    id: 2,
    question: "How are sensor readings currently accessed on the hardware?",
    answer:
      "Sensor readings are output directly through the ESP32 Serial Monitor at 115200 baud and the local 16×2 LCD during bench testing.",
  },
  {
    id: 3,
    question: "Are the valve shutoff controls in the dashboard physically connected?",
    answer:
      "No. Valve trips, relay toggles, and load shifts in this console are interactive software simulations showing how shutoff logic behaves without commanding physical actuators.",
  },
  {
    id: 4,
    question: "Is the data shown on the dashboard real or simulated?",
    answer:
      "The default console displays calibrated demonstration data. Switching to Physical (Supabase) mode reads authenticated user rows with nullable INA219 power columns until calibration is completed.",
  },
  {
    id: 5,
    question: "Can I export consumption and telemetry data to real files?",
    answer:
      "Yes. Export actions generate and download real .CSV and .JSON files containing timestamped water consumption, INR cost calculations, and event ledger entries.",
  },
];

export default function ScrollFAQAccordion({
  data = DEFAULT_FAQ_DATA,
  title = "Frequently Asked Questions",
  subtitle = "Find answers to common questions about hardware sensors, telemetry modes, and exports.",
  className,
  questionClassName,
  answerClassName,
  enableScrollPin = true,
}: ScrollFAQAccordionProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(() =>
    data.length > 0 ? data[0].id.toString() : null
  );
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const lastManualClickRef = React.useRef<number>(0);

  const dataSignature = React.useMemo(
    () => data.map((item) => `${item.id}:${item.question}`).join("|"),
    [data]
  );

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
  }, []);

  React.useEffect(() => {
    if (data.length === 0) {
      setOpenItem(null);
      return;
    }
    const stillExists = data.some((item) => item.id.toString() === openItem);
    if (!stillExists) {
      setOpenItem(data[0].id.toString());
    }
  }, [data, dataSignature, openItem]);

  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      if (!containerRef.current || data.length <= 1 || !enableScrollPin) return;

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) return;

      gsap.registerPlugin(ScrollTrigger);

      const activateFromScroll = (itemId: string) => {
        if (Date.now() - lastManualClickRef.current < 900) return;
        setOpenItem((prev) => (prev === itemId ? prev : itemId));
      };

      data.forEach((item) => {
        const itemId = item.id.toString();
        const el = itemRefs.current.get(itemId);
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: "top 62%",
          end: "bottom 38%",
          onEnter: (self) => {
            if (self.isActive) activateFromScroll(itemId);
          },
          onEnterBack: (self) => {
            if (self.isActive) activateFromScroll(itemId);
          },
        });
      });
    },
    { scope: containerRef, dependencies: [dataSignature, enableScrollPin] }
  );

  const handleValueChange = (value: string) => {
    lastManualClickRef.current = Date.now();
    setOpenItem(value || null);
  };

  return (
    <div
      ref={containerRef}
      className={cn("max-w-4xl mx-auto py-8 md:py-12", className)}
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          {subtitle}
        </p>
      </div>

      <Accordion.Root
        type="single"
        collapsible
        value={openItem || ""}
        onValueChange={handleValueChange}
      >
        {data.map((item) => {
          const itemId = item.id.toString();
          const isOpen = openItem === itemId;
          return (
            <Accordion.Item
              value={itemId}
              key={item.id}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(itemId, el);
                } else {
                  itemRefs.current.delete(itemId);
                }
              }}
              className="mb-4 last:mb-0"
            >
              <Accordion.Header>
                <Accordion.Trigger className="flex w-full items-center justify-between sm:justify-start gap-x-4 cursor-pointer text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#174A8B] dark:focus-visible:ring-sky-400 rounded-xl min-h-[44px]">
                  <div
                    className={cn(
                      "relative flex items-center space-x-2 rounded-xl px-4 py-2.5 transition-colors border",
                      isOpen
                        ? "bg-[#174A8B]/10 text-[#174A8B] border-[#174A8B]/25 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/30"
                        : "bg-slate-100/90 text-slate-800 border-slate-200/70 hover:bg-slate-200/60 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700/70 dark:hover:bg-slate-800",
                      questionClassName
                    )}
                  >
                    {item.icon && (
                      <span
                        className={cn(
                          "absolute bottom-6",
                          item.iconPosition === "right" ? "right-0" : "left-0"
                        )}
                        style={{
                          transform:
                            item.iconPosition === "right"
                              ? "rotate(7deg)"
                              : "rotate(-4deg)",
                        }}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span className="font-medium text-sm leading-snug">
                      {item.question}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 text-slate-500 dark:text-slate-400 transition-colors",
                      isOpen && "text-[#174A8B] dark:text-sky-400"
                    )}
                    aria-hidden="true"
                  >
                    {isOpen ? (
                      <Minus className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </span>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content asChild forceMount>
                <motion.div
                  initial={false}
                  animate={isOpen ? "open" : "collapsed"}
                  variants={{
                    open: { opacity: 1, height: "auto" },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex justify-end ml-4 sm:ml-7 mt-3 md:ml-16">
                    <div
                      className={cn(
                        "relative max-w-xl rounded-2xl px-4 py-3 text-left text-sm leading-relaxed bg-[#174A8B] text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs",
                        answerClassName
                      )}
                    >
                      {item.answer}
                    </div>
                  </div>
                </motion.div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </div>
  );
}

export { ScrollFAQAccordion };
