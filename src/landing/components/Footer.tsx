import { useLanguage } from "@/contexts/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  
  return (
    <footer role="contentinfo" className="border-t">
      <div className="container py-10 text-sm">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">{t('landing.footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
