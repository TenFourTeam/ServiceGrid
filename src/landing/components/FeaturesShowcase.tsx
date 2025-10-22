import type { Feature } from "@/landing/industryData";
import { CheckCircle2 } from "lucide-react";

interface FeaturesShowcaseProps {
  features: Feature[];
}

export function FeaturesShowcase({ features }: FeaturesShowcaseProps) {
  return (
    <section id="features" className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            How ServiceGrid Helps
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to run your business efficiently and profitably.
          </p>
        </div>

        <div className="space-y-16 md:space-y-24">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } gap-8 md:gap-12 lg:gap-16 items-center`}
            >
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                  {feature.title}
                </h3>
                
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="flex items-start gap-3 pt-2">
                  <CheckCircle2 className="w-6 h-6 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                  <p className="text-base font-medium text-foreground">
                    {feature.benefit}
                  </p>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="relative aspect-video rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/30 dark:to-brand-800/30 border border-brand-300 dark:border-brand-700 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl opacity-20">
                      {index + 1}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
