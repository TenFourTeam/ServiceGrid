import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Leaf, Sprout, Waves, Droplets, Sparkles, Wrench, Home, CloudRain, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const industryIcons = [
  { icon: Leaf, key: "lawnCare" },
  { icon: Home, key: "houseCleaning" },
  { icon: Droplets, key: "pressureWashing" },
  { icon: Sprout, key: "irrigation" },
  { icon: Waves, key: "poolService" },
  { icon: Wrench, key: "handyman" },
  { icon: CloudRain, key: "gutterCleaning" },
  { icon: Trash2, key: "junkRemoval" },
  { icon: Sparkles, key: "carpetCleaning" },
];

export function Industries() {
  const { t } = useLanguage();
  
  return (
    <Section ariaLabel="Industries we serve">
      <div className="mx-auto max-w-5xl text-center" data-reveal>
        <Heading as="h2" intent="section" id="industries-title">{t('landing.industries.heading')}</Heading>
        <p className="mt-3 text-muted-foreground">{t('landing.industries.subtitle')}</p>
      </div>
      <div className="mt-8 marquee" data-reveal>
        <div className="marquee-track" aria-label="Industries carousel">
          {industryIcons.map(({ icon: Icon, key }) => (
            <article key={key} className="shrink-0 w-40 md:w-44 rounded-lg border bg-card p-4 md:p-5 shadow-subtle grid place-items-center text-center">
              <Icon aria-hidden className="text-primary" />
              <h3 className="mt-3 font-medium">{t(`landing.industries.items.${key}`)}</h3>
            </article>
          ))}
          <span aria-hidden="true" className="contents">
            {industryIcons.map(({ icon: Icon, key }) => (
              <article key={`${key}-dup`} className="shrink-0 w-40 md:w-44 rounded-lg border bg-card p-4 md:p-5 shadow-subtle grid place-items-center text-center">
                <Icon aria-hidden className="text-primary" />
                <h3 className="mt-3 font-medium">{t(`landing.industries.items.${key}`)}</h3>
              </article>
            ))}
          </span>
        </div>
      </div>
    </Section>
  );
}
