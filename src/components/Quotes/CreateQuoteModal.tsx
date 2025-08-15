import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useQuoteMutations } from "@/mutations/useQuoteMutations";
import { QuoteForm } from "@/components/Quotes/QuoteForm";
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
  const { createQuote } = useQuoteMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const result = await createQuote.mutateAsync({
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
      });

      // Map API response to Quote interface
      const quote: Quote = {
        id: result.id,
        number: result.number,
        businessId: businessId || '',
        customerId: formData.customerId,
        address: formData.address,
        lineItems: formData.lineItems,
        taxRate: result.taxRate,
        discount: result.discount,
        subtotal: result.subtotal,
        total: result.total,
        status: result.status,
        files: [],
        notesInternal: formData.notesInternal,
        terms: formData.terms,
        paymentTerms: formData.paymentTerms,
        frequency: formData.frequency,
        depositRequired: formData.depositRequired,
        depositPercent: formData.depositPercent,
        sentAt: undefined,
        viewCount: result.viewCount || 0,
        createdAt: result.createdAt || new Date().toISOString(),
        updatedAt: result.updatedAt || new Date().toISOString(),
        publicToken: result.publicToken,
      };

      onOpenChange(false);
      onRequestSend?.(quote);
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