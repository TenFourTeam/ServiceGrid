import { Button } from "@/components/Button";
import { SignUpButton } from "@clerk/clerk-react";
import { content } from "../content";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
export function CTASection() {
  const params = new URLSearchParams(location.search);
  const variantB = params.get("v")?.toLowerCase() === "b";
  const cta = variantB ? content.cta.primaryB : content.cta.primaryA;
  return (
    <Section ariaLabel={content.cta.heading}>
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="cta-title">{content.cta.heading}</Heading>
        <div className="mt-6 flex items-center justify-center gap-3">
          <SignUpButton mode="modal" forceRedirectUrl="/calendar">
            <Button size="lg" variant="primary" className="hover-scale attention-ring">
              {cta.label}
            </Button>
          </SignUpButton>
        </div>
      </div>
    </Section>
  );
}