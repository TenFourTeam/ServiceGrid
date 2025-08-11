import { Button } from "@/components/ui/button";
import { SignUpButton } from "@clerk/clerk-react";
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
          <SignUpButton mode="modal" forceRedirectUrl="/calendar">
            <Button size="lg" variant="cta" className="hover-scale">
              {cta.label}
            </Button>
          </SignUpButton>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{content.cta.subcopy}</p>
      </div>
    </section>
  );
}
