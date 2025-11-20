import { useLanguage } from "@/contexts/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer role="contentinfo" className="border-t">
      <div className="container py-10 text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </a>
            <a href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">
              Roadmap
            </a>
            <a href="/changelog" className="text-muted-foreground hover:text-foreground transition-colors">
              Changelog
            </a>
          </div>
          <p className="text-muted-foreground text-center sm:text-right">{t('landing.footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
