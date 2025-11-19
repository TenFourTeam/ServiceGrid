import { useLanguage } from "@/contexts/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer role="contentinfo" className="border-t">
      <div className="container py-10 text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground">{t('landing.footer.copyright')}</p>
          <a href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">
            Roadmap
          </a>
        </div>
      </div>
    </footer>
  );
}
