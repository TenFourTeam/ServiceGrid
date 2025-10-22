import { useLanguage } from "@/contexts/LanguageContext";
import { LucideIcon } from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface IndustryGettingStartedProps {
  title: string;
  subtitle: string;
  steps: Step[];
}

export function IndustryGettingStarted({ title, subtitle, steps }: IndustryGettingStartedProps) {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-4">
                    <Icon className="h-8 w-8 text-brand-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-brand-200 dark:bg-brand-800" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
