import { content } from "../content";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";

export function FAQ() {
  return (
    <Section ariaLabel="Frequently asked questions">
      <div className="mx-auto max-w-3xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="faq-title">Frequently asked questions</Heading>
        <p className="mt-3 text-muted-foreground">Quick answers to common questions.</p>
      </div>
      <div className="mt-8 mx-auto max-w-3xl divide-y">
        {content.faq.map((f, i) => (
          <details key={f.q} className="py-4" data-reveal>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              <span className="font-medium">{f.q}</span>
              <span aria-hidden>+</span>
            </summary>
            <div className="mt-2 text-muted-foreground">{f.a}</div>
            {/* TODO: event faq_toggle { id: f.q, open } */}
          </details>
        ))}
      </div>
    </Section>
  );
}
