import { Button } from "@/components/Button";
import { Link } from "react-router-dom";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { useLanguage } from "@/contexts/LanguageContext";

export function CTASection() {
  const { t } = useLanguage();
  
  return (
    <Section ariaLabel={t('landing.cta.heading')}>
      <div className="mx-auto max-w-2xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="cta-title">{t('landing.cta.heading')}</Heading>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/auth?redirect=/calendar">
            <Button size="lg" variant="primary" className="hover-scale attention-ring [--ring:var(--brand-600)]">
              {t('landing.cta.primaryCta')}
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}