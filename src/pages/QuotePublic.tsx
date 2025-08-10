import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/store/useAppStore";
import { formatMoney } from "@/utils/format";

export default function QuotePublicPage() {
  const { token } = useParams<{ token: string }>();
  const store = useStore();
  const quote = useMemo(() => store.quotes.find(q => q.publicToken === token), [store.quotes, token]);

  useEffect(() => {
    // Basic SEO
    const title = quote ? `Quote ${quote.number} • ${quote.total ? formatMoney(quote.total) : ''}` : 'Quote';
    document.title = title;
    const existing = document.querySelector('link[rel="canonical"]');
    const href = window.location.href;
    if (existing) (existing as HTMLLinkElement).href = href; else {
      const l = document.createElement('link'); l.rel = 'canonical'; l.href = href; document.head.appendChild(l);
    }
  }, [quote]);

  if (!quote) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Quote not found</CardTitle>
          </CardHeader>
          <CardContent>
            This link may be invalid or the quote is unavailable.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Quote {quote.number}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <div>Status: {quote.status}</div>
            <div>Total: {formatMoney(quote.total)}</div>
          </div>
          <Separator />
          <div>
            <div className="font-medium mb-2">Line Items</div>
            <div className="space-y-2">
              {quote.lineItems.length === 0 ? (
                <div className="text-muted-foreground">No items</div>
              ) : (
                quote.lineItems.map(li => (
                  <div key={li.id} className="flex justify-between text-sm">
                    <div>{li.name}</div>
                    <div>{formatMoney(li.lineTotal)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
