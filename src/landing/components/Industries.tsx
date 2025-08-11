import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Leaf, Sprout, Waves, Droplets, Sparkles, Wrench } from "lucide-react";

const industries = [
  { icon: Leaf, label: "Lawn Care" },
  { icon: Sparkles, label: "Window Cleaning" },
  { icon: Droplets, label: "Pressure Washing" },
  { icon: Sprout, label: "Irrigation" },
  { icon: Waves, label: "Pool Service" },
  { icon: Wrench, label: "Handyman" },
];

export function Industries() {
  return (
    <Section ariaLabel="Industries we serve">
      <div className="mx-auto max-w-5xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="industries-title">Built for field service pros</Heading>
        <p className="mt-3 text-muted-foreground">Purpose-built workflows that feel native to your trade.</p>
      </div>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6" data-reveal>
        {industries.map(({ icon: Icon, label }) => (
          <article key={label} className="rounded-lg border bg-card p-4 md:p-5 shadow-subtle grid place-items-center text-center">
            <Icon aria-hidden className="text-primary" />
            <h3 className="mt-3 font-medium">{label}</h3>
          </article>
        ))}
      </div>
    </Section>
  );
}
