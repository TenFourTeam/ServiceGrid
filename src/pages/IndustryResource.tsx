import { useParams, Navigate } from "react-router-dom";
import { getIndustries } from "@/landing/industryData";
import { IndustryHero } from "@/landing/components/IndustryHero";
import { ChallengesGrid } from "@/landing/components/ChallengesGrid";
import { FeaturesShowcase } from "@/landing/components/FeaturesShowcase";
import { IndustryCTA } from "@/landing/components/IndustryCTA";
import { Benefits } from "@/landing/components/Benefits";
import { Footer } from "@/landing/components/Footer";
import { TopNav } from "@/landing/components/TopNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";

export default function IndustryResource() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  
  // Get translated industries
  const industries = getIndustries(t);
  const industry = industries.find(ind => ind.slug === slug);

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
