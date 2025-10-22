import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { useLanguage } from "@/contexts/LanguageContext";

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" className="text-primary">
      <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
    </svg>
  );
}

export function Benefits() {
  const { t } = useLanguage();
  
  return (
    <Section id="benefits" ariaLabel="Benefits">
      <div className="mx-auto max-w-3xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="benefits-title">{t('landing.benefits.heading')}</Heading>
        <p className="mt-3 text-muted-foreground">{t('landing.benefits.subtitle')}</p>
      </div>

      <div className="mt-10 grid sm:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <article key={i} className="rounded-lg border bg-card p-6 shadow-subtle" data-reveal>
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <CheckIcon />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t(`landing.benefits.items.${i}.title`)}</h3>
                <p className="mt-1 text-muted-foreground">{t(`landing.benefits.items.${i}.desc`)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
