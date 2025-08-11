import { content } from "../content";
import { Section } from "@/components/Section";

function Logo({ label }: { label: string }) {
  return (
    <div className="h-8 w-24 rounded-md bg-muted text-muted-foreground grid place-items-center" aria-label={label} role="img">
      <span className="text-[10px] font-medium">{label}</span>
    </div>
  );
}

export function ProofStrip() {
  return (
    <Section ariaLabel={content.proof.heading}>
      <h2 id="proof-heading" className="sr-only">{content.proof.heading}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 items-center justify-items-center gap-6 opacity-80" data-reveal>
        {content.proof.logos.map((l) => (
          <Logo key={l.name} label={l.name} />
        ))}
      </div>
    </Section>
  );
}
