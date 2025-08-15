import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Shield, Cookie, BadgeDollarSign } from 'lucide-react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLegalDocuments } from '@/hooks/useLegalDocument';

export default function LegalPage() {
  const { businessName } = useBusinessContext();
  const documents = useLegalDocuments();

  const iconMap = {
    FileText,
    Cookie,
    BadgeDollarSign,
    Shield
  };

  useEffect(() => {
    const title = `${businessName ? businessName + ' — ' : ''}Terms & Services`;
    document.title = title;

    const desc = 'Read our Terms of Service, Cookie Policy, Service Credit Terms, and Data Processing Addendum.';
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
  }, [businessName]);

  return (
    <AppLayout title="Legal">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Terms & Services</h1>
        <p className="text-sm text-muted-foreground mt-1">Review the policies that govern your use of our services.</p>
      </header>

      <main>
        <section aria-labelledby="legal-overview" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle id="legal-overview">Legal overview</CardTitle>
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
                      <span>{doc.title}</span>
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