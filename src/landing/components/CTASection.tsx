import { Button } from "@/components/ui/button";
import { content } from "../content";

export function CTASection() {
  const params = new URLSearchParams(location.search);
  const variantB = params.get("v")?.toLowerCase() === "b";
  const cta = variantB ? content.cta.primaryB : content.cta.primaryA;

  return (
    <section aria-labelledby="cta-title" className="container py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <h2 id="cta-title" className="text-3xl md:text-4xl font-bold tracking-tight">{content.cta.heading}</h2>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="hover-scale">
            <a href={cta.href}
               // TODO: event footer_cta_click { cta: "join_waitlist" | "book_demo" }
            >
              {cta.label}
            </a>
          </Button>
          <a href="#benefits" className="story-link text-sm text-muted-foreground">Learn more</a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{content.cta.subcopy}</p>
      </div>
    </section>
  );
}
