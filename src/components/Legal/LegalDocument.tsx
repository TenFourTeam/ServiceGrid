import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '@/components/Layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLegalDocument } from '@/hooks/useLegalDocument';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LegalDocument() {
  const { slug } = useParams<{ slug: string }>();
  const { businessName } = useBusinessContext();
  const { t, language } = useLanguage();
  const { frontmatter, content, isLoading, error } = useLegalDocument(slug || '', language);

  useEffect(() => {
    if (!isLoading && frontmatter.title) {
      const title = `${businessName ? businessName + ' — ' : ''}${slug ? t(`legal.documents.${slug}`) : frontmatter.title}`;
      document.title = title;

      const desc = frontmatter.description;
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
    }
  }, [businessName, frontmatter.title, frontmatter.description, isLoading, slug, t]);

  if (isLoading) {
    return (
      <AppLayout title={t('legal.document.loading')}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-4/6"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title={t('legal.document.error')}>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-xl font-semibold text-destructive mb-2">{t('legal.document.notFound')}</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild variant="outline">
              <Link to="/legal">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('legal.document.backToOverview')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: JSX.Element[] = [];
    let currentSection: JSX.Element[] = [];
    let inList = false;
    let listItems: JSX.Element[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        currentSection.push(
          <ul key={`list-${elements.length}`} className="list-disc pl-6 mt-1 text-sm text-muted-foreground space-y-1">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const flushSection = () => {
      if (currentSection.length > 0) {
        elements.push(
          <article key={`section-${elements.length}`} className="space-y-2">
            {currentSection}
          </article>
        );
        currentSection = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (inList) flushList();
        return;
      }

      // H2 headings (##)
      if (trimmed.startsWith('## ')) {
        flushList();
        flushSection();
        const text = trimmed.substring(3);
        currentSection.push(
          <h3 key={`h3-${index}`} className="font-medium text-foreground">
            {text}
          </h3>
        );
      }
      // List items (-)
      else if (trimmed.startsWith('- ')) {
        if (!inList) {
          inList = true;
        }
        const text = trimmed.substring(2);
        listItems.push(
          <li key={`li-${index}`}>
            {text}
          </li>
        );
      }
      // Regular paragraphs
      else if (!trimmed.startsWith('#')) {
        flushList();
        currentSection.push(
          <p key={`p-${index}`} className="text-sm text-muted-foreground">
            {trimmed}
          </p>
        );
      }
    });

    flushList();
    flushSection();

    return elements;
  };

  return (
    <AppLayout title={slug ? t(`legal.documents.${slug}`) : frontmatter.title}>
      <header className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/legal">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('legal.document.backToOverview')}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {slug ? t(`legal.documents.${slug}`) : frontmatter.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t('legal.document.lastUpdated')} {new Date(frontmatter.lastUpdated).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        <p className="text-sm text-muted-foreground mt-2">{frontmatter.description}</p>
      </header>

      <main>
        <div className="space-y-6">
          {renderMarkdown(content)}
        </div>
      </main>
    </AppLayout>
  );
}