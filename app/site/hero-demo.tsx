"use client";

import { useState } from "react";
import PublishedExperience from "@/app/p/[slug]/published-experience";
import type { TemplateConfig } from "@/lib/templates";

export type HeroExample = { id: string; label: string; config: TemplateConfig };

/** A real, clickable invitation in a phone frame. Switching examples swaps the live page. */
export default function HeroDemo({ examples, initial }: { examples: HeroExample[]; initial: string }) {
  const [active, setActive] = useState(examples.some((example) => example.id === initial) ? initial : examples[0].id);
  const example = examples.find((item) => item.id === active) || examples[0];

  return (
    <div className="hero-demo">
      <div className="ui-segmented hero-demo__tabs" role="group" aria-label="בחירת דוגמה">
        {examples.map((item) => (
          <button key={item.id} type="button" aria-pressed={item.id === active} onClick={() => setActive(item.id)}>{item.label}</button>
        ))}
      </div>
      <figure className="hero-phone">
        <div className="hero-phone__screen" aria-label={`דוגמה חיה: ${example.label}. אפשר ללחוץ ולעבור בשלבים.`} role="region">
          <PublishedExperience
            key={example.id}
            slug={`example-${example.id}`}
            templateId={example.id}
            config={example.config}
            showWatermark
            embedded
            previewMode
            trackAnalytics={false}
          />
        </div>
        <figcaption>אפשר ללחוץ. זה עמוד אמיתי.</figcaption>
      </figure>
    </div>
  );
}
