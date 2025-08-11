import { content } from "../content";

function VisualCard({ title, imageSrc, alt }: { title: string; imageSrc?: string; alt?: string }) {
  return (
    <div className="h-72 md:h-80 lg:h-96 rounded-lg border bg-card shadow-subtle grid place-items-center overflow-hidden">
      <div className="text-center p-4">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={alt ?? title}
            className="mx-auto max-h-56 w-auto object-contain rounded-md"
            loading="lazy"
          />
        ) : (
          <div className="mx-auto h-12 w-12 rounded-md bg-muted mb-4" />
        )}
        <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}

export function HighlightsSticky() {
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
              <li key={s.key} data-step={s.key} className="p-4 rounded-md border bg-card shadow-subtle" data-reveal style={{"--stagger": i} as any}>
                <h3 className="font-semibold">{i + 1}. {s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Visuals */}
        <div aria-live="polite" className="relative" data-visuals>
          <span id="highlights-live" className="sr-only" />
          {content.highlights.steps.map((s) => (
            <div key={s.key} aria-label={s.title} data-visual={s.key}>
              <VisualCard
                title={s.title}
                imageSrc={s.key === "invoice" ? "/lovable-uploads/invoice-image.png" : undefined}
                alt={s.key === "invoice" ? "Invoice and get paid" : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
