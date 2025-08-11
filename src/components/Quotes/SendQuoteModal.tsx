
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/store/useAppStore";
import type { Quote } from "@/types";
import { buildQuoteEmail } from "@/utils/emailTemplates";
import { toast } from "sonner";
import { escapeHtml } from "@/utils/sanitize";
import { useQueryClient } from "@tanstack/react-query";
import { SUPABASE_URL, edgeFetchJson } from "@/utils/edgeApi";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

export interface SendQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  toEmail?: string;
  customerName?: string;
}

export default function SendQuoteModal({ open, onOpenChange, quote, toEmail, customerName }: SendQuoteModalProps) {
  const store = useStore();
  const queryClient = useQueryClient();
  const { getToken } = useClerkAuth();
  const [to, setTo] = useState(toEmail ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { html, defaultSubject } = useMemo(() => {
    if (!quote) return { html: "", defaultSubject: "" };
    const base = window.location.origin;
    const approveUrl = `${base}/quote-action?type=approve&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
    const editUrl = `${base}/quote-action?type=edit&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
    const pixelUrl = `${SUPABASE_URL}/functions/v1/quote-events?type=open&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
    const logo = store.business.lightLogoUrl || store.business.logoUrl;
    const built = buildQuoteEmail({ businessName: store.business.name, businessLogoUrl: logo, customerName, quote, approveUrl, editUrl, pixelUrl });
    return { html: built.html, defaultSubject: built.subject };
  }, [quote, store.business.name, store.business.logoUrl, store.business.lightLogoUrl, customerName]);
  const previewHtml = useMemo(() => {
    if (!message?.trim()) return html;
    const safe = escapeHtml(message).replace(/\n/g, '<br />');
    const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safe}</div>`;
    const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
    return `${introBlock}${hr}${html}`;
  }, [message, html]);

  // Reset state on open/quote change
  useEffect(() => {
    if (open) {
      setTo(toEmail ?? "");
      setSubject(quote ? `${store.business.name} • Quote ${quote.number}` : "");
      setMessage("");
    }
  }, [open, quote, toEmail, store.business.name]);

  async function send() {
    if (!quote) return;
    if (!to) {
      toast.error("Please enter a recipient email");
      return;
    }
    setSending(true);
    try {
      const finalHtml = (() => {
        if (!message?.trim()) return html;
        const safe = escapeHtml(message).replace(/\n/g, '<br />');
        const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safe}</div>`;
        const hr = `<hr style=\"border:none; border-top:1px solid #e5e7eb; margin:12px 0;\" />`;
        return `${introBlock}${hr}${html}`;
      })();
      console.info('[SendQuoteModal] sending quote email', { quoteId: quote.id, to });
      await edgeFetchJson("resend-send-email", getToken, {
        method: "POST",
        body: { to, subject: subject || defaultSubject, html: finalHtml, quote_id: quote.id, from_name: store.business.name },
      });
      console.info('[SendQuoteModal] sent', { quoteId: quote.id });
      // Optimistically mark as Sent in React Query cache for immediate UI update
      queryClient.setQueryData<{ rows: Array<{ id: string; status: string; updatedAt?: string }> }>(
        ["supabase", "quotes"],
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          return {
            rows: old.rows.map((r) =>
              r.id === quote.id ? { ...r, status: "Sent", updatedAt: now } : r
            ),
          };
        }
      );
      store.sendQuote(quote.id);
      await queryClient.invalidateQueries({ queryKey: ["supabase", "quotes"] });
      toast.success("Quote sent successfully");
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Quote</DialogTitle>
        </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">To</label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={defaultSubject} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Message (optional)</label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Add a short note..." />
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <div className="text-sm font-medium">Preview</div>
              <div className="relative">
                <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
                  <div className="mt-2 px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
                    Preview only. Links and buttons are disabled.
                  </div>
                </div>
                <div
                  className="email-preview border rounded-md p-4 pt-8 max-h-[50vh] overflow-auto bg-background"
                  aria-label="Email preview (non-interactive)"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
              <Button onClick={send} disabled={sending || (!!quote && (quote.status === 'Sent' || quote.status === 'Approved'))}>{sending ? 'Sending…' : 'Send Email'}</Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

