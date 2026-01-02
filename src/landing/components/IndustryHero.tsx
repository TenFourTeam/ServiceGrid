import { Button } from "@/components/Button";
import { SignUpButton } from "@clerk/clerk-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface IndustryHeroProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}

export function IndustryHero({ title, subtitle, Icon }: IndustryHeroProps) {
  const { t } = useLanguage();
  
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-brand-50/30 dark:to-brand-950/30 pt-20 pb-16 md:pt-28 md:pb-24">
      <div className="container relative">
        <div className="flex flex-col items-center text-center gap-6 md:gap-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 animate-fade-in">
            <Icon className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground animate-fade-in">
            {title}
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl animate-fade-in">
            {subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 animate-fade-in">
            <SignUpButton mode="modal" forceRedirectUrl="/calendar">
              <Button 
                variant="primary" 
                size="lg" 
                className="hover-scale attention-ring [--ring:var(--brand-600)]"
              >
                {t('industryPages.hero.startTrial')}
              </Button>
            </SignUpButton>
            <Button 
              variant="secondary" 
              size="lg"
              className="hover-scale"
              onClick={() => {
                const featuresSection = document.getElementById('features');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('industryPages.hero.seeHowItWorks')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
