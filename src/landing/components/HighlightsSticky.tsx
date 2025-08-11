import { useState } from "react";
import { content } from "../content";

function VisualCard({ title, imageSrc, alt }: { title: string; imageSrc?: string; alt?: string }) {
  const [broken, setBroken] = useState(false);
  const label = alt ?? title;
  const isInvoice = label.toLowerCase().includes("invoice");

  return (
    <div className="h-72 md:h-80 lg:h-96 rounded-lg border bg-card shadow-subtle grid place-items-center overflow-hidden">
      <div className="text-center p-4">
        {imageSrc && !broken ? (
          <img
            src={imageSrc}
            alt={label}
            width={1024}
            height={512}
            decoding="async"
            className="mx-auto max-h-56 w-auto object-contain rounded-md"
            loading="lazy"
            onError={() => { console.warn('Visual image failed to load', { src: imageSrc, alt: label }); setBroken(true); }}
          />
        ) : isInvoice ? (
          <div className="mx-auto mb-4 h-40 w-auto text-muted-foreground">
            <svg
              viewBox="0 0 160 160"
              role="img"
              aria-label={label}
              className="mx-auto h-full w-auto"
            >
              <rect x="32" y="24" width="96" height="112" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="56" x2="112" y2="56" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="72" x2="112" y2="72" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="88" x2="96" y2="88" stroke="currentColor" strokeWidth="2" />
              <path d="M56 120l12 12 28-28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <div className="mx-auto h-12 w-12 rounded-md bg-muted mb-4" />
        )}
        <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}

export function HighlightsSticky() {
  const handleSelect = (key: string) => {
    const el = document.querySelector<HTMLElement>(`[data-step="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    try { history.replaceState(null, "", `#${key}`); } catch {}
  };
  return (
    <section aria-labelledby="how-title" className="container py-16 md:py-24">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
        {/* Sticky narrative */}
        <div className="lg:sticky lg:top-24">
          <h2 id="how-title" className="text-3xl md:text-4xl font-bold tracking-tight" data-reveal>
            {content.highlights.heading}
          </h2>
          <ol className="mt-6 space-y-6">
            {content.highlights.steps.map((s, i) => (
              <li
                key={s.key}
                id={s.key}
                data-step={s.key}
                className="p-4 rounded-md border bg-card shadow-subtle hover-scale focus:outline-none focus:ring-2 focus:ring-primary"
                data-reveal
                style={{ "--stagger": i } as any}
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
        <div aria-live="polite" className="relative" data-visuals>
          <span id="highlights-live" className="sr-only" />
          {content.highlights.steps.map((s: any) => (
            <div key={s.key} aria-label={s.title} data-visual={s.key}>
              <VisualCard
                title={s.title}
                imageSrc={s.imageSrc}
                alt={s.alt ?? s.title}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
