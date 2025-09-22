
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState, useEffect } from "react";
import { useCustomersData } from "@/queries/unified";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Quote } from "@/types";
import { generateQuoteEmail, generateQuoteSubject } from "@/utils/quoteEmailTemplates";
import { combineMessageWithEmail } from "@/utils/emailTemplateEngine";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from "sonner";
import { invalidationHelpers } from '@/queries/keys';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface SendQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  toEmail?: string;
  customerName?: string;
}

export default function SendQuoteModal({ open, onOpenChange, quote, toEmail, customerName }: SendQuoteModalProps) {
  const { t } = useLanguage();
  const { business, businessName, businessLogoUrl, businessLightLogoUrl, businessId } = useBusinessContext();
  const { data: customers = [] } = useCustomersData();
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  const [to, setTo] = useState(toEmail ?? "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

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
    combineMessageWithEmail(message, html), 
    [message, html]
  );

  // Check for active subscription when modal opens and quote is subscription
  useEffect(() => {
    async function checkActiveSubscription() {
      if (!open || !quote?.isSubscription || !quote.customerId || !businessId) {
        setHasActiveSubscription(false);
        return;
      }

      setSubscriptionLoading(true);
      try {
        const { data, error } = await supabase
          .from('recurring_schedules')
          .select('id, stripe_subscription_id')
          .eq('customer_id', quote.customerId)
          .eq('business_id', businessId)
          .eq('is_active', true)
          .limit(1);

        if (error) {
          console.error('Failed to check subscription status:', error);
          setHasActiveSubscription(false);
        } else {
          setHasActiveSubscription(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setHasActiveSubscription(false);
      } finally {
        setSubscriptionLoading(false);
      }
    }

    checkActiveSubscription();
  }, [open, quote?.isSubscription, quote?.customerId, businessId]);

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
      toast.error(t('quotes.modal.emailValidation'));
      return;
    }
    setSending(true);
    try {
      const finalHtml = combineMessageWithEmail(message, html);
      console.info('[SendQuoteModal] sending quote email', { quoteId: quote.id, to });
      await authApi.invoke("resend-send-email", { 
        method: 'POST',
        body: {
          to, 
          subject: subject || defaultSubject, 
          html: finalHtml, 
          quote_id: quote.id 
        },
        toast: {
          success: "Quote sent successfully",
          loading: 'Sending quote...',
          error: 'Failed to send quote'
        }
      });
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{t('quotes.modal.sendQuote')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-6 overflow-y-auto flex-1">
          {/* Subscription warning */}
          {quote?.isSubscription && hasActiveSubscription && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                This customer already has an active subscription. Sending this quote will supersede the previous subscription quote and may affect billing.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t('quotes.modal.to')}</label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t('quotes.modal.subject')}</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={defaultSubject} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t('quotes.modal.message')}</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Add a short note..." />
          </div>
          <div className="h-px bg-border" />
          <div className="space-y-2">
            <div className="text-sm font-medium">Preview</div>
            <div className="relative">
              <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
                <div className="mt-2 px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
                  {t('quotes.modal.preview')}
                </div>
              </div>
              <div
                className="email-preview border rounded-md p-4 pt-8 max-h-[40vh] overflow-auto bg-background"
                aria-label="Email preview (non-interactive)"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
        <DrawerFooter>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={sending} className="flex-1">
              {t('quotes.modal.cancel')}
            </Button>
            <Button onClick={send} disabled={sending || !to || (!!quote && quote.status === 'Approved')} className="flex-1">
              {sending ? t('quotes.modal.sending') : t('quotes.modal.sendEmail')}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

