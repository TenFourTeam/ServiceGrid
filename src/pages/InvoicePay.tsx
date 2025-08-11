import { useEffect, useMemo, useState } from "react";
import { edgePublicJson } from "@/utils/edgeApi";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function InvoicePay() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const invoiceId = params.get("i");
  const token = params.get("t");

  useEffect(() => {
    document.title = "Pay Invoice | Customer Payment";
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!invoiceId || !token) {
        setError("Missing invoice information.");
        setLoading(false);
        return;
      }
      try {
        const data = await edgePublicJson("create-invoice-payment-public", {
          method: "POST",
          body: { invoice_id: invoiceId, token },
        });
        if (data?.url) {
          setCheckoutUrl(data.url);
          // Open in a new tab per Stripe guidelines
          window.open(data.url, "_blank");
        } else {
          setError("Failed to create checkout session.");
        }
      } catch (e: any) {
        setError(e.message || "Unable to start payment.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [invoiceId, token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <main className="w-full max-w-xl text-center space-y-6">
        <h1 className="text-2xl font-semibold">Secure invoice payment</h1>
        {loading && (
          <p className="text-muted-foreground">Preparing your Stripe checkout…</p>
        )}
        {!loading && !error && checkoutUrl && (
          <div className="space-y-3">
            <p className="text-muted-foreground">A new tab should have opened. If not, continue below.</p>
            <Button asChild>
              <a href={checkoutUrl} target="_blank" rel="noreferrer">Open Stripe Checkout</a>
            </Button>
            <div>
              <Button variant="secondary" onClick={() => navigate("/")}>Return home</Button>
            </div>
          </div>
        )}
        {!loading && error && (
          <div className="space-y-4">
            <p className="text-destructive">{error}</p>
            <Button variant="secondary" onClick={() => navigate("/")}>Return home</Button>
          </div>
        )}
      </main>
    </div>
  );
}
