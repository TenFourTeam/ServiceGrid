import { useLanguage } from "@/contexts/LanguageContext";
import { getIndustries } from "../industryData";

export function Footer() {
  const { t } = useLanguage();
  const industries = getIndustries(t);
  
  return (
    <footer role="contentinfo" className="border-t bg-muted/30">
      <div className="container py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t('landing.footer.company')}
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.nav.pricing')}
                </a>
              </li>
              <li>
                <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.nav.blog')}
                </a>
              </li>
              <li>
                <a href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.nav.roadmap')}
                </a>
              </li>
              <li>
                <a href="/changelog" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.nav.changelog')}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources - Industries */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t('landing.footer.resources')}
            </h3>
            <ul className="space-y-3">
              {industries.map((industry) => (
                <li key={industry.slug}>
                  <a 
                    href={`/industries/${industry.slug}`} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {industry.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t('landing.footer.product')}
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.footer.features')}
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.footer.pricing')}
                </a>
              </li>
              <li>
                <a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.footer.documentation')}
                </a>
              </li>
              <li>
                <a href="/#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.footer.testimonials')}
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t('landing.footer.community')}
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="/roadmap" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.nav.roadmap')}
                </a>
              </li>
              <li>
                <a href="/changelog" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t('landing.nav.changelog')}
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/yourusername/servicegrid" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a 
                  href="https://discord.gg/servicegrid" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Minimal Copyright */}
        <p className="mt-12 pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
          {t('landing.footer.copyright')}
        </p>
      </div>
    </footer>
  );
}
