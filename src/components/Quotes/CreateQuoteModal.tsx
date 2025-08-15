import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { QuoteForm } from "@/components/Quotes/QuoteForm";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import type { Customer, Quote } from "@/types";

export interface CreateQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  defaultTaxRate?: number;
  onRequestSend?: (quote: Quote) => void;
}

export default function CreateQuoteModal({ open, onOpenChange, customers, defaultTaxRate = 0.1, onRequestSend }: CreateQuoteModalProps) {
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      console.log('Creating quote with data:', formData);
      const result = await edgeRequest(fn('quotes'), {
        method: 'POST',
        body: JSON.stringify({
          customerId: formData.customerId,
          address: formData.address,
          lineItems: formData.lineItems.map((li: any) => ({
            name: li.name,
            qty: li.qty,
            unit: li.unit || null,
            unitPrice: li.unitPrice,
            lineTotal: li.lineTotal,
          })),
          taxRate: formData.taxRate,
          discount: formData.discount,
          notesInternal: formData.notesInternal || null,
          terms: formData.terms || null,
          paymentTerms: formData.paymentTerms,
          frequency: formData.frequency,
          depositRequired: formData.depositRequired,
          depositPercent: formData.depositPercent,
        }),
      });

      // Invalidate quotes data
      if (businessId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId) });
      }

      // Map API response to Quote interface
      const quote: Quote = {
        id: result.quote.id,
        number: result.quote.number,
        businessId: businessId || '',
        customerId: formData.customerId,
        address: formData.address,
        lineItems: formData.lineItems,
        taxRate: result.quote.taxRate,
        discount: result.quote.discount,
        subtotal: result.quote.subtotal,
        total: result.quote.total,
        status: result.quote.status,
        files: [],
        notesInternal: formData.notesInternal,
        terms: formData.terms,
        paymentTerms: formData.paymentTerms,
        frequency: formData.frequency,
        depositRequired: formData.depositRequired,
        depositPercent: formData.depositPercent,
        sentAt: undefined,
        viewCount: result.quote.viewCount || 0,
        createdAt: result.quote.createdAt || new Date().toISOString(),
        updatedAt: result.quote.updatedAt || new Date().toISOString(),
        publicToken: result.quote.publicToken,
      };

      onOpenChange(false);
      onRequestSend?.(quote);
      toast.success('Quote created successfully');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quote</DialogTitle>
        </DialogHeader>
        
        <QuoteForm
          customers={customers}
          defaultTaxRate={defaultTaxRate}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          disabled={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}