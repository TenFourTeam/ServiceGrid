import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buildEdgeFunctionUrl } from '@/utils/env';

type ActionType = 'confirm';

type Status = 'idle' | 'ok' | 'error';

export default function JobActionPage() {
  const [params] = useSearchParams();
  const type = params.get('type') as ActionType | null;
  const jobId = params.get('job_id');
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('idle');

  const titles = useMemo(() => ({
    confirm: {
      title: 'Thanks! Your appointment has been confirmed.',
      desc: 'We look forward to serving you. You can safely close this page now.',
    },
  }), []);

  useEffect(() => {
    // SEO basics
    const pageTitle = type === 'confirm' ? 'Appointment Confirmed' : 'Job Action';
    document.title = `${pageTitle} • ServiceGrid`;
    const existing = document.querySelector('link[rel="canonical"]');
    const href = window.location.href;
    if (existing) (existing as HTMLLinkElement).href = href; else {
      const l = document.createElement('link'); l.rel = 'canonical'; l.href = href; document.head.appendChild(l);
    }
  }, [type]);

  useEffect(() => {
    async function run() {
      if (!type || !jobId || !token) { setStatus('error'); return; }
      try {
        const url = buildEdgeFunctionUrl('job-confirm', {
          type,
          job_id: jobId,
          token
        });
        const response = await fetch(url, {
          method: 'GET',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStatus('ok');
      } catch (e) {
        console.error('job action error', e);
        setStatus('error');
      }
    }
    run();
  }, [type, jobId, token]);

  const content = () => {
    if (!type || !jobId || !token) {
      return (
        <div className="space-y-2">
          <div className="text-xl font-semibold">Invalid link</div>
          <p className="text-muted-foreground">This action link is missing information. Please contact us if the issue persists.</p>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="space-y-2">
          <div className="text-xl font-semibold">Something went wrong</div>
          <p className="text-muted-foreground">We couldn't record your action. You can try again or reply to the email, and we'll take care of it.</p>
        </div>
      );
    }
    const t = titles[type];
    return (
      <div className="space-y-2">
        <div className="text-xl font-semibold flex items-center gap-2">
          <span className='inline-block size-5 rounded-full bg-primary' aria-hidden />
          {t.title}
        </div>
        <p className="text-muted-foreground">{t.desc}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {content()}
            <div className="pt-2 flex items-center gap-2">
              <Button onClick={() => window.close()} variant="secondary">Close</Button>
              <Button asChild>
                <Link to="/">Back to site</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
