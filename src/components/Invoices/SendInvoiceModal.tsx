import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useAppStore";
import type { Invoice } from "@/types";
import { buildInvoiceEmail } from "@/utils/emailTemplates";
import { toast } from "sonner";
import { escapeHtml } from "@/utils/sanitize";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

export interface SendInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  toEmail?: string;
  customerName?: string;
}

export default function SendInvoiceModal({ open, onOpenChange, invoice, toEmail, customerName }: SendInvoiceModalProps) {
  const store = useStore();
  const queryClient = useQueryClient();
  const { getToken } = useClerkAuth();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { html, defaultSubject } = useMemo(() => {
    if (!invoice) return { html: "", defaultSubject: "" };
    const logo = store.business.lightLogoUrl || store.business.logoUrl;
    const built = buildInvoiceEmail({ businessName: store.business.name, businessLogoUrl: logo, customerName, invoice });
    return { html: built.html, defaultSubject: built.subject };
  }, [invoice, store.business.name, store.business.logoUrl, store.business.lightLogoUrl, customerName]);

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
        const cust = store.customers.find(c => c.id === invoice.customerId);
        return cust?.email || "";
      })();
      setTo(defaultTo);
      setSubject(invoice ? `${store.business.name} • Invoice ${invoice.number}` : "");
      setMessage("");
    }
  }, [open, invoice, toEmail, store.business.name, store.customers]);

  async function send() {
    if (!invoice) return;
    if (!to) {
      toast.error("Please enter a recipient email");
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
      await edgeFetchJson("resend-send-email", getToken, {
        method: "POST",
        body: { to, subject: subject || defaultSubject, html: finalHtml, invoice_id: invoice.id, from_name: store.business.name, reply_to: store.business.replyToEmail },
      });
      console.info('[SendInvoiceModal] sent', { invoiceId: invoice.id });
      // Optimistically mark as Sent
      queryClient.setQueryData<{ rows: Array<{ id: string; status: string; updatedAt?: string }> }>(
        ["supabase", "invoices"],
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          return {
            rows: old.rows.map((r) =>
              r.id === invoice.id ? { ...r, status: "Sent", updatedAt: now } : r
            ),
          };
        }
      );
      store.sendInvoice(invoice.id);
      await queryClient.invalidateQueries({ queryKey: ["supabase", "invoices"] });
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
            <Button onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send Email'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
