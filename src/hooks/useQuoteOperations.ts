import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useBusinessContext } from './useBusinessContext';
import { useLifecycleEmailIntegration } from './useLifecycleEmailIntegration';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';
import type { Quote } from '@/types';

export function useCreateQuote() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const { triggerQuoteCreated } = useLifecycleEmailIntegration();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteData: Partial<Quote>) => {
      const { data, error } = await authApi.invoke('quotes-crud', {
        method: 'POST',
        body: quoteData
      });

      if (error) {
        throw new Error(error.message || 'Failed to create quote');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate quotes query
      queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId || '') });
      
      // Trigger lifecycle email for first quote milestone
      try {
        triggerQuoteCreated();
      } catch (error) {
        console.error('[useCreateQuote] Failed to trigger quote milestone email:', error);
      }
      
      toast.success('Quote created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create quote');
    }
  });
}

export function useConvertQuoteToJob() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const { triggerJobScheduled } = useLifecycleEmailIntegration();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, jobData }: { quoteId: string; jobData: any }) => {
      const { data, error } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: { ...jobData, sourceQuoteId: quoteId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to convert quote to job');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId || '') });
      
      // Trigger lifecycle email for first job milestone
      try {
        triggerJobScheduled();
      } catch (error) {
        console.error('[useConvertQuoteToJob] Failed to trigger job milestone email:', error);
      }
      
      toast.success('Quote converted to job successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to convert quote to job');
    }
  });
}

export function useConvertQuoteToInvoice() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const { triggerInvoiceSent } = useLifecycleEmailIntegration();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, invoiceData }: { quoteId: string; invoiceData: any }) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: { ...invoiceData, sourceQuoteId: quoteId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create invoice from quote');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId || '') });
      
      // Trigger lifecycle email for first invoice milestone
      try {
        triggerInvoiceSent();
      } catch (error) {
        console.error('[useConvertQuoteToInvoice] Failed to trigger invoice milestone email:', error);
      }
      
      toast.success('Invoice created from quote successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create invoice from quote');
    }
  });
}

export function useDeleteQuote() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await authApi.invoke('quotes-crud', {
        method: 'DELETE',
        body: { id: quoteId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete quote');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate quotes query
      queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId || '') });
      
      toast.success('Quote deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete quote');
    }
  });
}