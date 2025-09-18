import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Shield, Cookie, BadgeDollarSign } from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLegalDocuments } from '@/hooks/useLegalDocument';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LegalPage() {
  const { businessName } = useBusinessContext();
  const { t } = useLanguage();
  const documents = useLegalDocuments();

  const iconMap = {
    FileText,
    Cookie,
    BadgeDollarSign,
    Shield
  };

  useEffect(() => {
    const title = `${businessName ? businessName + ' — ' : ''}${t('legal.title')}`;
    document.title = title;

    const desc = t('legal.metaDescription');
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, [businessName, t]);

  return (
    <AppLayout title={t('legal.title')}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('legal.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('legal.description')}</p>
      </header>

      <main>
        <section aria-labelledby="legal-overview" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle id="legal-overview">{t('legal.overview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map((doc, index) => {
                const IconComponent = iconMap[doc.icon as keyof typeof iconMap];
                return (
                  <div key={doc.slug}>
                    <Link 
                      to={`/legal/${doc.slug}`} 
                      className="flex items-center gap-2 underline-offset-4 hover:underline"
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{t(`legal.documents.${doc.slug}`)}</span>
                    </Link>
                    {index < documents.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      </main>
    </AppLayout>
  );
}