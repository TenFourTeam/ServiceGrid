import { useLanguage } from "@/contexts/LanguageContext";
import { Check } from "lucide-react";

interface PricingPoint {
  label: string;
  value: string;
}

interface IndustryPricingProps {
  title: string;
  subtitle: string;
  points: PricingPoint[];
  roiNote: string;
}

export function IndustryPricing({ title, subtitle, points, roiNote }: IndustryPricingProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {points.map((point, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-6 rounded-lg border bg-card"
            >
              <Check className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">{point.label}</p>
                <p className="text-muted-foreground">{point.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg p-6 text-center">
          <p className="text-brand-900 dark:text-brand-100 font-medium">
            {roiNote}
          </p>
        </div>
      </div>
    </section>
  );
}
