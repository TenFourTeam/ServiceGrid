import { useEffect } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Shield } from 'lucide-react';
import { useStore } from '@/store/useAppStore';

export default function LegalPage() {
  const { business } = useStore();

  useEffect(() => {
    const title = `${business.name ? business.name + ' — ' : ''}Terms & Services`;
    document.title = title;

    const desc = 'Read our Terms of Use and Privacy Policy for services and data practices.';
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
  }, [business.name]);

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
              <a href="#terms" className="flex items-center gap-2 underline-offset-4 hover:underline">
                <FileText className="h-4 w-4" />
                <span>Terms of use</span>
              </a>
              <Separator />
              <a href="#privacy" className="flex items-center gap-2 underline-offset-4 hover:underline">
                <Shield className="h-4 w-4" />
                <span>Privacy policy</span>
              </a>
            </CardContent>
          </Card>
        </section>

        <section id="terms" aria-labelledby="terms-heading" className="mb-10">
          <h2 id="terms-heading" className="text-xl font-medium">Terms of use</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These Terms of Use outline the rules and guidelines for using our services. By accessing or using the
            application, you agree to be bound by these terms. If you do not agree, please discontinue use.
          </p>
        </section>

        <section id="privacy" aria-labelledby="privacy-heading" className="mb-10">
          <h2 id="privacy-heading" className="text-xl font-medium">Privacy policy</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We respect your privacy. This policy explains what information we collect, how we use it, and your choices
            regarding your data. We only collect information necessary to provide and improve our services.
          </p>
        </section>
      </main>
    </AppLayout>
  );
}
