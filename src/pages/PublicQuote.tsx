import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/utils/format";

interface SnapshotShape {
  number: string;
  businessName: string;
  customerName: string;
  items: { name: string; qty?: number; unitPrice?: number; lineTotal?: number }[];
  subtotal: number;
  taxRate: number;
  discount: number;
  total: number;
  address?: string;
  terms?: string;
  depositRequired?: boolean;
  depositPercent?: number;
  paymentTerms?: string;
}

const PublicQuote: React.FC = () => {
  const { slug = "", token = "" } = useParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<SnapshotShape | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch snapshot and canonicalize URL
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("estimate-view", {
          body: { token },
        });
        if (error || (data as any)?.error) {
          setError((error as any)?.message || (data as any)?.error || "Quote not found");
          return;
        }
        const { snapshot, slug: canonical } = data as { snapshot: SnapshotShape; slug: string };
        if (!snapshot) {
          setError("Quote not found");
          return;
        }
        if (canonical && slug !== canonical) {
          navigate(`/c/${canonical}/q/${token}`, { replace: true });
        }
        if (isMounted) setSnapshot(snapshot);
      } catch (e: any) {
        setError(e?.message || "Failed to load quote");
      }
    })();
    return () => { isMounted = false };
  }, [slug, token, navigate]);

  // Basic SEO updates
  useEffect(() => {
    if (!snapshot) return;
    document.title = `Quote ${snapshot.number} — ${snapshot.businessName}`;
    const desc = `View quote ${snapshot.number} from ${snapshot.businessName}`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, [snapshot]);

  const rows = useMemo(() => (snapshot?.items || []).map((li, idx) => {
    const qty = li.qty ?? 1;
    const unit = formatMoney(li.unitPrice ?? 0);
    const amt = formatMoney(li.lineTotal ?? Math.round(qty * (li.unitPrice ?? 0)));
    return (
      <tr key={idx}>
        <td className="py-3 pr-2 border-b border-border">{li.name}</td>
        <td className="py-3 px-2 text-center border-b border-border">{qty}</td>
        <td className="py-3 px-2 text-right border-b border-border">{unit}</td>
        <td className="py-3 pl-2 text-right border-b border-border">{amt}</td>
      </tr>
    );
  }), [snapshot]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <article className="max-w-xl w-full text-center">
          <h1 className="text-2xl font-semibold">Quote not found</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </article>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading quote…</p>
      </main>
    );
  }

  const tax = Math.round(snapshot.subtotal * (snapshot.taxRate || 0));

  return (
    <>
      <header className="w-full bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-xl font-semibold">Quote {snapshot.number}</h1>
          <p className="opacity-90">{snapshot.businessName}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <section aria-labelledby="customer">
          <h2 id="customer" className="sr-only">Customer</h2>
          <p className="text-sm text-muted-foreground">For</p>
          <p className="text-lg font-medium">{snapshot.customerName}</p>
          {snapshot.address && <p className="mt-1 text-muted-foreground">Service address: {snapshot.address}</p>}
        </section>

        <section className="mt-6" aria-labelledby="items">
          <h2 id="items" className="sr-only">Line items</h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Item</th>
                  <th className="text-center p-2">Qty</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="summary">
          <h2 id="summary" className="sr-only">Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Payment terms</div>
              <div className="font-medium">{snapshot.paymentTerms || "Due on receipt"}</div>
              {snapshot.depositRequired && (
                <div className="mt-1 text-sm text-muted-foreground">Deposit: {snapshot.depositPercent ?? 0}%</div>
              )}
              {snapshot.terms && (
                <div className="mt-4 p-3 rounded-md border bg-muted/30">
                  <div className="font-medium mb-1">Terms</div>
                  <div className="text-sm whitespace-pre-line">{snapshot.terms}</div>
                </div>
              )}
            </div>
            <div className="sm:justify-self-end w-full sm:max-w-xs">
              <div className="flex justify-between py-1"><span>Subtotal</span><span>{formatMoney(snapshot.subtotal)}</span></div>
              <div className="flex justify-between py-1"><span>Tax ({Math.round((snapshot.taxRate||0)*100)}%)</span><span>{formatMoney(tax)}</span></div>
              {snapshot.discount > 0 && (
                <div className="flex justify-between py-1"><span>Discount</span><span>-{formatMoney(snapshot.discount)}</span></div>
              )}
              <div className="flex justify-between py-2 border-t mt-2 font-semibold"><span>Total</span><span>{formatMoney(snapshot.total)}</span></div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default PublicQuote;
