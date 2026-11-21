"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import {
  HighlightTestimonialSection,
  type Testimonial,
} from "./highlight-testimonial-section";

type DemoProps = {
  autoplay?: boolean;
  bare?: boolean;
  index?: number;
  interval?: number;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Hardware interrupt routines on GPIO34 capture FS-S401 turbine pulses accurately while driving the local 16x2 character LCD display on the ESP32 testbench.",
    highlight: "FS-S401 turbine pulses accurately",
    author: "Testbench Flow Module",
    role: "Verified Edge Instrumentation · ESP32 + 16x2 LCD",
  },
  {
    quote:
      "Reconciled INR tariff calculations and time-of-use schedule modeling evaluate daily water and energy budgets transparently without distorting demo baselines.",
    highlight: "without distorting demo baselines",
    author: "Tariff & Anomaly Engine",
    role: "Software Analytical Model · INR ₹ Calculation Suite",
  },
  {
    quote:
      "ESP32 firmware outputs diagnostics at 115200 baud alongside an open MQTT payload schema designed to sync cleanly with Supabase PostgreSQL RLS tables.",
    highlight: "Supabase PostgreSQL RLS tables",
    author: "MQTT & Supabase Schema",
    role: "Cloud Telemetry Architecture · Wi-Fi + RLS Postgres",
  },
];

export default function HighlightTestimonialSectionDemo({
  autoplay = true,
  bare = false,
  index: preset,
  interval = 2500,
}: DemoProps) {
  const [index, setIndex] = React.useState(preset ?? 0);
  const [run, setRun] = React.useState(0);
  const [motion, setMotion] = React.useState({ ready: false, reduced: true });

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion({ ready: true, reduced: media.matches });
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center gap-5 bg-background px-5 py-6 text-foreground">
      {!bare && (
        <header className="w-full max-w-[460px]">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Field evidence, one quote at a time
          </p>
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight">
            The best phrase becomes the headline.
          </h1>
        </header>
      )}
      <div className="w-full max-w-[460px]">
        <HighlightTestimonialSection
          key={run}
          testimonials={TESTIMONIALS}
          index={index}
          onIndexChange={setIndex}
          interval={autoplay && motion.ready && !motion.reduced ? interval : 0}
        />
      </div>
      {!bare && (
        <footer className="flex w-full max-w-[460px] items-center justify-between text-[10px] text-muted-foreground">
          <span>Pilot quotes · hover to pause, arrows to browse</span>
          <button
            type="button"
            data-replay
            onClick={() => {
              setIndex(0);
              setRun((previous) => previous + 1);
            }}
            className="inline-flex items-center gap-1 rounded px-1 underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Replay
          </button>
        </footer>
      )}
    </main>
  );
}
