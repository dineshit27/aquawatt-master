import React from "react";
import { CaseStudyFlipStack } from "./case-study-flip-stack";

export default function WorkPageDemo() {
  return (
    <div className="w-full">
      <CaseStudyFlipStack
        items={[
          {
            eyebrow: "Fintech",
            title: "Boosted conversion by 42% with a product-led redesign",
            description: "We rebuilt onboarding around the moments that matter.",
            image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1400&q=90&auto=format&fit=crop",
            imageAlt: "Portrait from the fintech campaign",
            background: "#a94808",
            foreground: "#fff7ed",
          },
          {
            eyebrow: "Hospitality",
            title: "A slower digital experience for a faster-growing retreat",
            description: "A cinematic booking journey with a stronger sense of place.",
            image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=90&auto=format&fit=crop",
            imageAlt: "A mountain retreat at dusk",
            background: "#067b8f",
            foreground: "#ecfeff",
          },
        ]}
      />
    </div>
  );
}
