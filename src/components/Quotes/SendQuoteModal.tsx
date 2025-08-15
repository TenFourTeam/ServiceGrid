
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState, useEffect } from "react";
import { useCustomersData } from "@/queries/unified";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import type { Quote } from "@/types";
import { generateQuoteEmail, generateQuoteSubject, combineMessageWithQuote } from "@/utils/quoteEmailTemplates";
import { useQueryClient } from "@tanstack/react-query";
import { edgeToast } from "@/utils/edgeRequestWithToast";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { invalidationHelpers } from '@/queries/keys';

export interface SendQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  toEmail?: string;
  customerName?: string;
}

export default function SendQuoteModal({ open, onOpenChange, quote, toEmail, customerName }: SendQuoteModalProps) {
  const { business, businessName, businessLogoUrl, businessLightLogoUrl, businessId } = useBusinessContext();
  const { data: customers = [] } = useCustomersData();
  const queryClient = useQueryClient();
  const { getToken } = useClerkAuth();
  const [to, setTo] = useState(toEmail ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { html, defaultSubject } = useMemo(() => {
    if (!quote) return { html: "", defaultSubject: "" };
    const logo = businessLightLogoUrl || businessLogoUrl;
    const emailData = generateQuoteEmail({
      businessName: businessName || '',
      businessLogoUrl: logo,
      customerName,
      quote
    });
    return { html: emailData.html, defaultSubject: emailData.subject };
  }, [quote, businessName, businessLogoUrl, businessLightLogoUrl, customerName]);
  
  const previewHtml = useMemo(() => 
    combineMessageWithQuote(message, html), 
    [message, html]
  );

  // Reset state on open/quote change
  useEffect(() => {
    if (open) {
      const defaultTo = (() => {
        if (toEmail && toEmail.trim()) return toEmail;
        if (!quote) return "";
        const cust = customers.find(c => c.id === quote.customerId);
        return cust?.email || "";
      })();
      setTo(defaultTo);
      setSubject(quote ? generateQuoteSubject(businessName || '', quote.number) : "");
      setMessage("");
    }
  }, [open, quote, toEmail, businessName, customers]);

  async function send() {
    if (!quote) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || !emailRegex.test(to)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const finalHtml = combineMessageWithQuote(message, html);
      console.info('[SendQuoteModal] sending quote email', { quoteId: quote.id, to });
      await edgeToast.send(fn("resend-send-email"), { 
        to, 
        subject: subject || defaultSubject, 
        html: finalHtml, 
        quote_id: quote.id 
      }, "Quote sent successfully");
      console.info('[SendQuoteModal] sent', { quoteId: quote.id });
      // Invalidate cache and let server update the status
      if (businessId) {
        invalidationHelpers.quotes(queryClient, businessId);
      }
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
                <label className="text-sm font-medium text-muted-foreground">To (from customer)</label>
                <Input value={to} disabled placeholder="No email on file" />
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
              <Button onClick={send} disabled={sending || !to || (!!quote && (quote.status === 'Sent' || quote.status === 'Approved'))}>{sending ? 'Sending…' : 'Send Email'}</Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

