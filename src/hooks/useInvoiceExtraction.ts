import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export interface ExtractedInvoiceData {
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
}

export interface InvoiceExtractionResult {
  extracted: ExtractedInvoiceData;
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
}

export function useInvoiceExtraction() {
  const authApi = useAuthApi();
  
  return useMutation({
    mutationFn: async (mediaId: string): Promise<InvoiceExtractionResult> => {
      const { data, error } = await authApi.invoke(
        'extract-invoice-from-photo',
        {
          method: 'POST',
          body: JSON.stringify({ mediaId })
        }
      );
      
      if (error) throw error;
      return data as InvoiceExtractionResult;
    }
  });
}
