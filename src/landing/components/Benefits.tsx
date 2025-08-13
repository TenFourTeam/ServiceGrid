import { content } from "../content";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" className="text-primary">
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
    </svg>
  );
}

export function Benefits() {
  return (
    <Section id="benefits" ariaLabel="Benefits">
      <div className="mx-auto max-w-3xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="benefits-title">Why teams switch to ServiceGrid</Heading>
        <p className="mt-3 text-muted-foreground">Fewer clicks, fewer calls, faster cashflow.</p>
      </div>

      <div className="mt-10 grid sm:grid-cols-2 gap-6">
        {content.benefits.map((b, i) => (
          <article key={b.title} className="rounded-lg border bg-card p-6 shadow-subtle" data-reveal>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <CheckIcon />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{b.title}</h3>
                <p className="mt-1 text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
