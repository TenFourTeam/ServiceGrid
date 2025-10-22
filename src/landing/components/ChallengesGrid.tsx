import type { Challenge } from "@/landing/industryData";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChallengesGridProps {
  challenges: Challenge[];
}

export function ChallengesGrid({ challenges }: ChallengesGridProps) {
  const { t } = useLanguage();
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            {t('industryPages.challenges.heading')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('industryPages.challenges.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {challenges.map((challenge, index) => {
            const Icon = challenge.icon;
            return (
              <div
                key={index}
                className="group relative bg-card border border-border rounded-xl p-6 hover:border-brand-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex flex-col gap-4">
                  <div className="inline-flex w-12 h-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive/20 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground">
                    {challenge.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {challenge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
