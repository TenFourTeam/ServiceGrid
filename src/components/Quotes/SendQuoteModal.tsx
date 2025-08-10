import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState, useEffect } from "react";
import { useStore } from "@/store/useAppStore";
import type { Quote } from "@/types";
import { buildQuoteEmail } from "@/utils/emailTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { escapeHtml } from "@/utils/sanitize";
import { useQueryClient } from "@tanstack/react-query";

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
  const [to, setTo] = useState(toEmail ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { html, defaultSubject } = useMemo(() => {
    if (!quote) return { html: "", defaultSubject: "" };
    const base = window.location.origin;
    const approveUrl = `${base}/quote-action?type=approve&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
    const editUrl = `${base}/quote-action?type=edit&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
    const viewUrl = `${base}/quote/${encodeURIComponent(quote.publicToken)}`;
    const pixelUrl = `https://ijudkzqfriazabiosnvb.functions.supabase.co/quote-events?type=open&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
    const built = buildQuoteEmail({ businessName: store.business.name, businessLogoUrl: store.business.logoUrl, customerName, quote, approveUrl, editUrl, viewUrl, pixelUrl });
    return { html: built.html, defaultSubject: built.subject };
  }, [quote, store.business.name, customerName]);
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
      const { error } = await supabase.functions.invoke("resend-send-email", {
        body: { to, subject: subject || defaultSubject, html: finalHtml, quote_id: quote.id, from_name: store.business.name },
      });
      if (error) throw error;
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
              <div className="border rounded-md p-4 max-h-[50vh] overflow-auto bg-background" dangerouslySetInnerHTML={{ __html: previewHtml }} />
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
