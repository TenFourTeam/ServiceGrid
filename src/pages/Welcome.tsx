import AppLayout from '@/components/Layout/AppLayout';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/onboarding/useOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';
import { useStore } from '@/store/useAppStore';

export default function WelcomePage() {
  const nav = useNavigate();
  const store = useStore();
  const { steps, complete } = useOnboarding();

  useEffect(() => {
    // SEO: meta description + canonical
    const metaName = 'description';
    const content = 'Get started with TenFour Lawn: set business details, add a customer, create a quote, schedule a job, and connect email sending.';
    let tag = document.querySelector(`meta[name="${metaName}"]`);
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute('name', metaName); document.head.appendChild(tag); }
    tag.setAttribute('content', content);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link); }
    link.setAttribute('href', window.location.href);
  }, []);

  useEffect(() => {
    if (complete) nav('/calendar', { replace: true });
  }, [complete, nav]);

  return (
    <AppLayout title="Welcome">
      <section className="max-w-3xl mx-auto space-y-6">
        <header>
          <h2 className="text-3xl font-bold">Welcome to TenFour Lawn</h2>
          <p className="text-muted-foreground mt-1">Your quick checklist to get value in minutes.</p>
        </header>

        <Card>
          <CardHeader><CardTitle>Get started</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-6 rounded-full grid place-items-center border bg-background">{i+1}</div>
                    <span className={s.done ? 'line-through text-muted-foreground' : ''}>{s.label}</span>
                  </div>
                  {s.id === 'job' ? (
                    <NewJobSheet />
                  ) : s.id === 'email' ? (
                    <Button asChild variant="secondary"><a href={s.href}>{s.done ? 'View' : 'Connect'}</a></Button>
                  ) : (
                    <Button asChild variant="secondary"><a href={s.href}>{s.done ? 'View' : 'Start'}</a></Button>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Or explore with demo data</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Load realistic demo data to see quotes, jobs and invoices in action. You can reset anytime in Settings.</p>
            <Button onClick={() => store.seedDemo()}>Load Demo Data</Button>
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
