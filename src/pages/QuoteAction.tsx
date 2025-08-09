import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const FUNC_BASE = 'https://ijudkzqfriazabiosnvb.functions.supabase.co/quote-events';

type ActionType = 'approve' | 'edit';

type Status = 'idle' | 'ok' | 'error';

export default function QuoteActionPage() {
  const [params] = useSearchParams();
  const type = (params.get('type') || params.get('action')) as ActionType | null;
  const quoteId = params.get('quote_id');
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('idle');

  const titles = useMemo(() => ({
    approve: {
      title: 'Thanks! Your approval has been recorded.',
      desc: 'You can safely close this page now.',
    },
    edit: {
      title: 'Thanks! Your edit request has been recorded.',
      desc: 'We\'ll reach out shortly to confirm the changes you\'d like.',
    },
  }), []);

  useEffect(() => {
    // SEO basics
    const pageTitle = type === 'approve' ? 'Quote Approved' : type === 'edit' ? 'Edit Request Recorded' : 'Quote Action';
    document.title = `${pageTitle} • TenFour Lawn`;
    const existing = document.querySelector('link[rel="canonical"]');
    const href = window.location.href;
    if (existing) (existing as HTMLLinkElement).href = href; else {
      const l = document.createElement('link'); l.rel = 'canonical'; l.href = href; document.head.appendChild(l);
    }
  }, [type]);

  useEffect(() => {
    async function run() {
      if (!type || !quoteId || !token) { setStatus('error'); return; }
      try {
        const url = `${FUNC_BASE}?type=${encodeURIComponent(type)}&quote_id=${encodeURIComponent(quoteId)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) throw new Error('Request failed');
        setStatus('ok');
      } catch (e) {
        console.error('quote action error', e);
        setStatus('error');
      }
    }
    run();
  }, [type, quoteId, token]);

  const content = () => {
    if (!type || !quoteId || !token) {
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
          <p className="text-muted-foreground">We couldn\'t record your action. You can try again or reply to the email, and we\'ll take care of it.</p>
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
            <CardTitle>Quote Action</CardTitle>
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
