import { useEffect, useState } from "react";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePreloadImage, usePreloadImages } from "@/hooks/usePreloadImage";
import { useLanguage } from "@/contexts/LanguageContext";

type HighlightStep = {
  key: string;
  imageSrc?: string;
  alt?: string;
};

function VisualCard({ title, imageSrc, alt, kind }: { title: string; imageSrc?: string; alt?: string; kind?: 'schedule' | 'quote' | 'work' | 'invoice' }) {
  const [broken, setBroken] = useState(false);
  const label = alt ?? title;

  const renderPlaceholder = () => {
    switch (kind) {
      case 'invoice':
        return (
          <div className="mx-auto mb-0 h-full w-full text-muted-foreground grid place-items-center">
            <svg
              viewBox="0 0 160 160"
              role="img"
              aria-label={label}
              className="mx-auto h-24 w-24"
            >
              <rect x="32" y="24" width="96" height="112" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="56" x2="112" y2="56" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="72" x2="112" y2="72" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="88" x2="96" y2="88" stroke="currentColor" strokeWidth="2" />
              <path d="M56 120l12 12 28-28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      case 'quote':
        return (
          <div className="mx-auto mb-0 h-full w-full text-muted-foreground grid place-items-center">
            <svg viewBox="0 0 160 160" role="img" aria-label={label} className="mx-auto h-24 w-24">
              <rect x="32" y="28" width="96" height="104" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <text x="80" y="92" textAnchor="middle" fontSize="48" fill="currentColor">$</text>
              <line x1="48" y1="56" x2="112" y2="56" stroke="currentColor" strokeWidth="2" />
              <line x1="48" y1="72" x2="96" y2="72" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        );
      case 'work':
        return (
          <div className="mx-auto mb-0 h-full w-full text-muted-foreground grid place-items-center">
            <svg viewBox="0 0 160 160" role="img" aria-label={label} className="mx-auto h-24 w-24">
              <path d="M40 112l48-48" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              <circle cx="104" cy="56" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
              <rect x="32" y="112" width="64" height="12" rx="6" fill="currentColor" />
            </svg>
          </div>
        );
      case 'schedule':
        return (
          <div className="mx-auto mb-0 h-full w-full text-muted-foreground grid place-items-center">
            <svg viewBox="0 0 160 160" role="img" aria-label={label} className="mx-auto h-24 w-24">
              <rect x="28" y="32" width="104" height="100" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="28" y1="56" x2="132" y2="56" stroke="currentColor" strokeWidth="2" />
              <line x1="52" y1="24" x2="52" y2="40" stroke="currentColor" strokeWidth="3" />
              <line x1="108" y1="24" x2="108" y2="40" stroke="currentColor" strokeWidth="3" />
              <rect x="40" y="68" width="20" height="16" rx="2" fill="currentColor" />
              <rect x="66" y="68" width="20" height="16" rx="2" fill="currentColor" opacity="0.6" />
              <rect x="92" y="68" width="20" height="16" rx="2" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
        );
      default:
        return <div className="mx-auto h-full w-full bg-muted" />;
    }
  };

  return (
    <div className="rounded-lg border bg-card shadow-subtle overflow-hidden">
      {imageSrc && !broken ? (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`View larger: ${label}`}
              className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <AspectRatio ratio={16 / 9} className="w-full">
                <img
                  src={imageSrc}
                  alt={label}
                  width={1600}
                  height={900}
                  decoding="async"
                  className="h-full w-full object-cover cursor-zoom-in"
                  loading="lazy"
                  sizes="(min-width: 1024px) 640px, (min-width: 768px) 560px, 100vw"
                  onError={() => {
                    console.warn('Visual image failed to load', { src: imageSrc, alt: label });
                    setBroken(true);
                  }}
                />
              </AspectRatio>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl p-0 bg-transparent border-none shadow-none">
            <DialogTitle className="sr-only">{label}</DialogTitle>
            <img
              src={imageSrc}
              alt={label}
              className="w-full h-auto max-h-[80vh] rounded-lg"
              decoding="async"
            />
          </DialogContent>
        </Dialog>
      ) : (
        <AspectRatio ratio={16 / 9}>{renderPlaceholder()}</AspectRatio>
      )}
      <div className="p-4">
        <p className="mt-2 text-sm text-muted-foreground text-center">{title}</p>
      </div>
    </div>
  );
}

export function HighlightsSticky() {
  const { t } = useLanguage();
  
  const steps: HighlightStep[] = [
    { key: 'schedule', imageSrc: '/how-it-works-1.png', alt: t('landing.highlights.steps.0.alt') },
    { key: 'quote', imageSrc: '/how-it-works-2.png', alt: t('landing.highlights.steps.1.alt') },
    { key: 'work', imageSrc: '/how-it-works-3.png', alt: t('landing.highlights.steps.2.alt') },
    { key: 'invoice', imageSrc: '/how-it-works-4.png', alt: t('landing.highlights.steps.3.alt') },
  ];
  
  const computeDefaultKey = () => {
    const hashKey = (location.hash || "").replace("#", "");
    return (
      hashKey ||
      steps.find((s) => s.key === "invoice")?.key ||
      steps.find((s) => !!s.imageSrc)?.key ||
      steps[0]?.key || ""
    );
  };
  const [activeKey, setActiveKey] = useState<string>(computeDefaultKey());
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const imageUrls = (steps.map((s) => s.imageSrc).filter(Boolean) as string[]);
  usePreloadImages(imageUrls);
  useEffect(() => {
    const onHashChange = () => {
      const k = (location.hash || "").replace("#", "");
      setActiveKey(
        k ||
          steps.find((s) => s.key === "invoice")?.key ||
          steps.find((s) => !!s.imageSrc)?.key ||
          steps[0]?.key || ""
      );
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [steps]);

  const handleSelect = (key: string) => {
    const el = document.querySelector<HTMLElement>(`[data-step="${key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      history.replaceState(null, "", `#${key}`);
    } catch {}
    setActiveKey(key);
  };

  const displayKey = hoveredKey ?? activeKey;
  const currentStep = steps.find((s) => s.key === displayKey) ?? steps[0];
  const currentIndex = steps.findIndex(s => s.key === currentStep.key);
  const kind = currentStep?.key === 'invoice' ? 'invoice'
    : currentStep?.key === 'quote' ? 'quote'
    : currentStep?.key === 'work' ? 'work'
    : currentStep?.key === 'schedule' ? 'schedule'
    : undefined;
  const visualSrc = currentStep?.imageSrc;
  const visualAlt = currentStep?.alt ?? t(`landing.highlights.steps.${currentIndex}.alt`);
  usePreloadImage(visualSrc);
  return (
    <Section ariaLabel={t('landing.highlights.heading')}>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
        {/* Sticky narrative */}
        <div className="lg:sticky lg:top-24">
          <Heading as="h2" intent="section" id="how-title" data-reveal>
            {t('landing.highlights.heading')}
          </Heading>
          <ol className="mt-6 space-y-6">
            {steps.map((s, i) => (
              <li
                key={s.key}
                id={s.key}
                data-step={s.key}
                className="p-4 rounded-md border bg-card shadow-subtle hover-scale focus:outline-none focus:ring-2 focus:ring-primary"
                data-reveal
                aria-current={activeKey === s.key ? 'step' : undefined}
                role="button"
                tabIndex={0}
                aria-label={t(`landing.highlights.steps.${i}.title`)}
                onMouseEnter={() => setHoveredKey(s.key)}
                onFocus={() => setHoveredKey(s.key)}
                onClick={() => { setHoveredKey(s.key); handleSelect(s.key); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setHoveredKey(s.key);
                    handleSelect(s.key);
                  }
                }}
              >
                <h3 className="font-semibold">{i + 1}. {t(`landing.highlights.steps.${i}.title`)}</h3>
                <p className="mt-1 text-muted-foreground">{t(`landing.highlights.steps.${i}.desc`)}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Visuals */}
          <div aria-live="polite" className="relative mt-6 lg:mt-20" data-visuals>
            <span id="highlights-live" className="sr-only" />
            <VisualCard 
              title={t(`landing.highlights.steps.${currentIndex}.title`)} 
              imageSrc={visualSrc} 
              alt={visualAlt} 
              kind={kind} 
            />
          </div>
      </div>
    </Section>
  );
}
