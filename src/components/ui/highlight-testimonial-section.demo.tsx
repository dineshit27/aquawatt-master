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
      "Integrating our ESP32 testbench with AquaWatt's telemetry dashboard took less than an hour. The pulse counting interrupt routine feeds right into the MQTT stream for real-time visualization.",
    highlight: "took less than an hour",
    author: "R. Sharma",
    role: "Embedded Systems Developer · IoT Maker Lab",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
  },
  {
    quote:
      "The clean Swiss minimalist UI makes analyzing sensor data effortless. Testing anomaly detection thresholds on domestic washer and refrigerator loads gave us immediate insights into standby power.",
    highlight: "immediate insights into standby power",
    author: "P. Mehta & Team",
    role: "Energy Auditor & Maker · Smart Living Prototype Group",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
  },
  {
    quote:
      "Standardizing on ESP32 + MQTT means no proprietary lock-in. We can view live readings in the terminal over Serial at 115200 baud and simultaneously verify trends in the AquaWatt web console.",
    highlight: "no proprietary lock-in",
    author: "A. Patel",
    role: "Sustainability Researcher · Urban Resource Collective",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80",
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
