import { useParams, Navigate } from "react-router-dom";
import { getIndustries } from "@/landing/industryData";
import { IndustryHero } from "@/landing/components/IndustryHero";
import { ChallengesGrid } from "@/landing/components/ChallengesGrid";
import { FeaturesShowcase } from "@/landing/components/FeaturesShowcase";
import { IndustryCTA } from "@/landing/components/IndustryCTA";
import { IndustryFAQ } from "@/landing/components/IndustryFAQ";
import { IndustryPricing } from "@/landing/components/IndustryPricing";
import { IndustryGettingStarted } from "@/landing/components/IndustryGettingStarted";
import { IndustryDeepDive } from "@/landing/components/IndustryDeepDive";
import { IndustryTestimonials } from "@/landing/components/IndustryTestimonials";
import { Benefits } from "@/landing/components/Benefits";
import { Footer } from "@/landing/components/Footer";
import { TopNav } from "@/landing/components/TopNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";
import { Settings, Calendar, Rocket } from "lucide-react";
import { initIntercom, shutdownIntercom } from "@/utils/intercom";

export default function IndustryResource() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  
  // Get translated industries
  const industries = getIndustries(t);
  const industry = industries.find(ind => ind.slug === slug);

  // Initialize Intercom on mount
  useEffect(() => {
    initIntercom();
    return () => shutdownIntercom();
  }, []);

  useEffect(() => {
    if (industry) {
      document.title = `${industry.label} ${t('landing.nav.business')} | ServiceGrid`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', industry.description);
      }
    }
  }, [industry, t]);

  if (!industry) {
    return <Navigate to="/404" replace />;
  }

  // Convert slug to camelCase for translation key lookup
  const slugToCamelCase = (slug: string) => {
    return slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  };
  
  // Get extended content if available
  const camelCaseKey = slugToCamelCase(slug || '');
  const extendedContent = (t as any)(`industries.${camelCaseKey}`, { returnObjects: true });
  const hasExtendedContent = extendedContent?.faq;

  // Map icon names to components for getting started
  const iconMap: Record<string, any> = {
    Settings,
    Calendar,
    Rocket,
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <TopNav />
      
      <IndustryHero 
        title={industry.hero.title}
        subtitle={industry.hero.subtitle}
        Icon={industry.icon}
      />
      
      <ChallengesGrid challenges={industry.challenges} />
      
      <FeaturesShowcase features={industry.features} />
      
      {hasExtendedContent && (
        <>
          <IndustryFAQ faqs={extendedContent.faq} />
          
          <IndustryPricing
            title={extendedContent.pricing.title}
            subtitle={extendedContent.pricing.subtitle}
            points={extendedContent.pricing.points}
            roiNote={extendedContent.pricing.roiNote}
          />
          
          <IndustryGettingStarted
            title={extendedContent.gettingStarted.title}
            subtitle={extendedContent.gettingStarted.subtitle}
            steps={extendedContent.gettingStarted.steps.map((step: any) => ({
              ...step,
              icon: iconMap[step.icon] || Settings,
            }))}
          />
          
          <IndustryDeepDive
            title={extendedContent.deepDive.title}
            subtitle={extendedContent.deepDive.subtitle}
            terms={extendedContent.deepDive.terms}
            bestPractices={extendedContent.deepDive.bestPractices}
          />
          
          <IndustryTestimonials
            title={extendedContent.testimonials.title}
            testimonials={extendedContent.testimonials.testimonials}
          />
        </>
      )}
      
      <Benefits />
      
      <IndustryCTA 
        title={industry.cta.title}
        subtitle={industry.cta.subtitle}
      />
      
      <div aria-hidden className="py-8 md:py-12 lg:py-14" />
      <Footer />
    </main>
  );
}
