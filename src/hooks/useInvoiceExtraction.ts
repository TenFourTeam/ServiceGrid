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
      
      if (error) {
        // Parse specific error types
        const errorMessage = error.message || error.error || 'Unknown error';
        
        if (error.status === 429 || error.errorType === 'RATE_LIMIT') {
          const rateLimitError = new Error('AI is experiencing high demand. Please try again in a moment.');
          (rateLimitError as any).errorType = 'RATE_LIMIT';
          throw rateLimitError;
        }
        
        if (error.status === 402 || error.errorType === 'PAYMENT_REQUIRED') {
          const paymentError = new Error('AI credits exhausted. Please add credits to continue.');
          (paymentError as any).errorType = 'PAYMENT_REQUIRED';
          (paymentError as any).link = 'https://lovable.dev/settings/usage';
          throw paymentError;
        }
        
        throw new Error(errorMessage);
      }
      
      return data as InvoiceExtractionResult;
    }
  });
}
