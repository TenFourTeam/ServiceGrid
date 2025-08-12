import { useEffect, useState } from "react";
import { content } from "../content";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type HighlightStep = (typeof content.highlights.steps)[number] & { imageSrc?: string; alt?: string };

function VisualCard({ title, imageSrc, alt }: { title: string; imageSrc?: string; alt?: string }) {
  const [broken, setBroken] = useState(false);
  const label = alt ?? title;
  const isInvoice = label.toLowerCase().includes("invoice");

  return (
    <div className="rounded-lg border bg-card shadow-subtle overflow-hidden">
      <AspectRatio ratio={16 / 9}>
        {imageSrc && !broken ? (
          <img
            src={imageSrc}
            alt={label}
            width={1600}
            height={900}
            decoding="async"
            className="h-full w-full object-cover"
            loading="lazy"
            sizes="(min-width: 1024px) 640px, (min-width: 768px) 560px, 100vw"
            onError={() => { console.warn('Visual image failed to load', { src: imageSrc, alt: label }); setBroken(true); }}
          />
        ) : isInvoice ? (
          <div className="mx-auto mb-0 h-full w-full text-muted-foreground grid place-items-center">
            <svg
              viewBox="0 0 160 160"
              role="img"
              aria-label={label}
              className="mx-auto h-24 w-24"
            >
              <rect x="32" y="24" width="96" height="112" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="56" x2="112" y2="56" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="72" x2="112" y2="72" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="88" x2="96" y2="88" stroke="currentColor" strokeWidth="2" />
              <path d="M56 120l12 12 28-28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <div className="mx-auto h-full w-full bg-muted" />
        )}
      </AspectRatio>
      <div className="p-4">
        <p className="mt-2 text-sm text-muted-foreground text-center">{title}</p>
      </div>
    </div>

  );
}

export function HighlightsSticky() {
  const steps = content.highlights.steps as ReadonlyArray<HighlightStep>;
  const computeDefaultKey = () => {
    const hashKey = (location.hash || "").replace("#", "");
    return (
      hashKey ||
      steps.find((s) => s.key === "invoice")?.key ||
      steps.find((s) => !!s.imageSrc)?.key ||
      steps[0]?.key || ""
    );
  };
  const [activeKey, setActiveKey] = useState<string>(computeDefaultKey());

  useEffect(() => {
    const onHashChange = () => {
      const k = (location.hash || "").replace("#", "");
      setActiveKey(
        k ||
          steps.find((s) => s.key === "invoice")?.key ||
          steps.find((s) => !!s.imageSrc)?.key ||
          steps[0]?.key || ""
      );
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [steps]);

  const handleSelect = (key: string) => {
    const el = document.querySelector<HTMLElement>(`[data-step="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      history.replaceState(null, "", `#${key}`);
    } catch {}
    setActiveKey(key);
  };

  const current = steps.find((s) => s.key === activeKey);
  const singleImageSrc = current?.imageSrc ?? "/images/how-schedule.jpg";
  const singleAlt = current?.alt ?? current?.title ?? content.highlights.heading;
  return (
    <Section ariaLabel={content.highlights.heading}>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
        {/* Sticky narrative */}
        <div className="lg:sticky lg:top-24">
          <Heading as="h2" intent="section" id="how-title" data-reveal>
            {content.highlights.heading}
          </Heading>
          <ol className="mt-6 space-y-6">
            {content.highlights.steps.map((s, i) => (
              <li
                key={s.key}
                id={s.key}
                data-step={s.key}
                className="p-4 rounded-md border bg-card shadow-subtle hover-scale focus:outline-none focus:ring-2 focus:ring-primary"
                data-reveal
                aria-current={activeKey === s.key ? 'step' : undefined}
                role="button"
                tabIndex={0}
                aria-label={s.title}
                onClick={() => handleSelect(s.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(s.key);
                  }
                }}
              >
                <h3 className="font-semibold">{i + 1}. {s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Visuals */}
        <div aria-live="polite" className="relative mt-6 lg:mt-20" data-visuals>
          <span id="highlights-live" className="sr-only" />
          { /* Single visual only */ }
          <div aria-label={singleAlt} data-visual="how-visual">
            <VisualCard
              title={singleAlt}
              imageSrc={singleImageSrc}
              alt={singleAlt}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
