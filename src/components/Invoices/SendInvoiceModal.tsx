import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { useCustomersData } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { buildInvoiceEmail } from '@/utils/emailTemplates';
import { escapeHtml } from '@/utils/sanitize';
import { toast } from 'sonner';
import type { Invoice } from '@/types';
import { invalidationHelpers } from '@/queries/keys';

export interface SendInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  toEmail?: string;
  customerName?: string;
}

export default function SendInvoiceModal({ open, onOpenChange, invoice, toEmail, customerName }: SendInvoiceModalProps) {
  const { business, businessName, businessLogoUrl, businessLightLogoUrl, businessId } = useBusinessContext();
  const { data: customers = [] } = useCustomersData();
  const queryClient = useQueryClient();
  const { getToken } = useClerkAuth();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { html, defaultSubject } = useMemo(() => {
    if (!invoice) return { html: "", defaultSubject: "" };
    const logo = businessLightLogoUrl || businessLogoUrl;
    const token = (invoice as any).publicToken as string | undefined;
    const payUrl = token ? `${window.location.origin}/invoice-pay?i=${invoice.id}&t=${token}` : undefined;
    const built = buildInvoiceEmail({ businessName: businessName || '', businessLogoUrl: logo, customerName, invoice, payUrl });
    return { html: built.html, defaultSubject: built.subject };
  }, [invoice, businessName, businessLogoUrl, businessLightLogoUrl, customerName]);

const previewHtml = useMemo(() => {
  if (!message?.trim()) return html;
  const safe = escapeHtml(message).replace(/\n/g, '<br />');
  const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safe}</div>`;
  const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
  return `${introBlock}${hr}${html}`;
}, [message, html]);

  useEffect(() => {
    if (open) {
      const defaultTo = (() => {
        if (toEmail && toEmail.trim()) return toEmail;
        if (!invoice) return "";
        const cust = customers.find(c => c.id === invoice.customerId);
        return cust?.email || "";
      })();
      setTo(defaultTo);
      setSubject(invoice ? `${businessName || ''} • Invoice ${invoice.number}` : "");
      setMessage("");
    }
  }, [open, invoice, toEmail, businessName, customers]);

  async function send() {
    if (!invoice) return;
    if (!to) {
      toast.error("Customer has no email on file. Add an email to the customer to send.");
      return;
    }
    setSending(true);
    try {
      const finalHtml = (() => {
        if (!message?.trim()) return html;
        const safe = escapeHtml(message).replace(/\n/g, '<br />');
        const introBlock = `<div style=\"margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;\">${safe}</div>`;
        const hr = `<hr style=\"border:none; border-top:1px solid #e5e7eb; margin:12px 0;\" />`;
        return `${introBlock}${hr}${html}`;
      })();
      console.info('[SendInvoiceModal] sending invoice email', { invoiceId: invoice.id, to });
      await edgeRequest(fn("resend-send-email"), {
        method: "POST",
        body: JSON.stringify({ to, subject: subject || defaultSubject, html: finalHtml, invoice_id: invoice.id }),
      });
      console.info('[SendInvoiceModal] sent', { invoiceId: invoice.id });
      // Invalidate cache and let server update the status
      if (businessId) {
        invalidationHelpers.invoices(queryClient, businessId);
      }
      toast.success("Invoice sent successfully");
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
          <DialogTitle>Send Invoice</DialogTitle>
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
            <Button onClick={send} disabled={sending || !to}>{sending ? 'Sending…' : 'Send Email'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}