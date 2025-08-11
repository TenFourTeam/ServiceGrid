import { content } from "../content";

export function FAQ() {
  return (
    <section aria-labelledby="faq-title" className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center" data-reveal>
        <h2 id="faq-title" className="text-3xl md:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
        <p className="mt-3 text-muted-foreground">Quick answers to common questions.</p>
      </div>
      <div className="mt-8 mx-auto max-w-3xl divide-y">
        {content.faq.map((f, i) => (
          <details key={f.q} className="py-4" data-reveal style={{"--stagger": i} as any}>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              <span className="font-medium">{f.q}</span>
              <span aria-hidden>+</span>
            </summary>
            <div className="mt-2 text-muted-foreground">{f.a}</div>
            {/* TODO: event faq_toggle { id: f.q, open } */}
          </details>
        ))}
      </div>
    </section>
  );
}
