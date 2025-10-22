import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { useLanguage } from "@/contexts/LanguageContext";

export function FAQ() {
  const { t } = useLanguage();
  
  return (
    <Section ariaLabel="Frequently asked questions">
      <div className="mx-auto max-w-3xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="faq-title">{t('landing.faq.heading')}</Heading>
        <p className="mt-3 text-muted-foreground">{t('landing.faq.subtitle')}</p>
      </div>
      <div className="mt-8 mx-auto max-w-3xl divide-y">
        {[0, 1, 2, 3].map((i) => (
          <details key={i} className="py-4" data-reveal>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              <span className="font-medium">{t(`landing.faq.items.${i}.q`)}</span>
              <span aria-hidden>+</span>
            </summary>
            <div className="mt-2 text-muted-foreground">{t(`landing.faq.items.${i}.a`)}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}
