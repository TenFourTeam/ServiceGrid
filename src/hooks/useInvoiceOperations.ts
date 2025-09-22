import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { useLifecycleEmailIntegration } from './useLifecycleEmailIntegration';
import { queryKeys } from '@/queries/keys';

import type { Invoice } from '@/types';

interface InvoiceCacheData {
  invoices: Invoice[];
  count: number;
}

export function useCreateInvoice() {
  const { businessId } = useBusinessContext();
  const { triggerInvoiceSent } = useLifecycleEmailIntegration();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceData: Partial<Invoice>) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: invoiceData,
        toast: {
          success: 'Invoice created successfully!',
          loading: 'Creating invoice...',
          error: 'Failed to create invoice'
        }
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to create invoice');
      }

      return data;
    },
    onSuccess: (data) => {
      // Optimistic update: add the new invoice to cache immediately
      if ((data as any)?.invoice) {
        queryClient.setQueryData(queryKeys.data.invoices(businessId || ''), (oldData: InvoiceCacheData | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              invoices: [(data as any)?.invoice, ...oldData.invoices],
              count: oldData.count + 1
            };
          }
          return { invoices: [(data as any)?.invoice], count: 1 };
        });
      }
      
      // Also invalidate and refetch for server confirmation
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.data.invoices(businessId || ''),
        refetchType: 'active'
      });
      
      try {
        triggerInvoiceSent();
      } catch (error) {
        console.error('[useCreateInvoice] Failed to trigger invoice milestone email:', error);
      }
    },
    onError: (error: Error | unknown) => {
      console.error('[useCreateInvoice] error:', error);
    }
  });
}

export function useSendInvoice() {
  const { businessId } = useBusinessContext();
  const { triggerInvoiceSent } = useLifecycleEmailIntegration();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, recipientEmail, subject, message }: { 
      invoiceId: string; 
      recipientEmail: string; 
      subject: string; 
      message?: string; 
    }) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: { 
          action: 'send',
          invoiceId,
          recipientEmail,
          subject,
          message
        },
        toast: {
          success: 'Invoice sent successfully!',
          loading: 'Sending invoice...',
          error: 'Failed to send invoice'
        }
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to send invoice');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.data.invoices(businessId || ''),
        refetchType: 'active'
      });
      
      try {
        triggerInvoiceSent();
      } catch (error) {
        console.error('[useSendInvoice] Failed to trigger invoice milestone email:', error);
      }
    },
    onError: (error: Error | unknown) => {
      console.error('[useSendInvoice] error:', error);
    }
  });
}

export function useUpdateInvoice() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, updates }: { invoiceId: string; updates: Partial<Invoice> }) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'PUT',
        body: { id: invoiceId, ...updates },
        toast: {
          success: 'Invoice updated successfully!',
          loading: 'Updating invoice...',
          error: 'Failed to update invoice'
        }
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to update invoice');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.data.invoices(businessId || ''),
        refetchType: 'active'
      });
    },
    onError: (error: Error | unknown) => {
      console.error('[useUpdateInvoice] error:', error);
    }
  });
}

export function useRecordPayment() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      amount, 
      method, 
      paidAt 
    }: { 
      invoiceId: string; 
      amount: number; 
      method: 'Cash' | 'Check' | 'Card';
      paidAt: string;
    }) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: { 
          action: 'record_payment',
          invoiceId,
          amount,
          method,
          paidAt
        },
        toast: {
          success: 'Payment recorded successfully!',
          loading: 'Recording payment...',
          error: 'Failed to record payment'
        }
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to record payment');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.data.invoices(businessId || ''),
        refetchType: 'active'
      });
    },
    onError: (error: Error | unknown) => {
      console.error('[useRecordPayment] error:', error);
    }
  });
}

export function useDeleteInvoice() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'DELETE',
        body: { id: invoiceId },
        toast: {
          success: 'Invoice deleted successfully!',
          loading: 'Deleting invoice...',
          error: 'Failed to delete invoice'
        }
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to delete invoice');
      }

      return data;
    },
    onSuccess: (data, invoiceId) => {
      // Optimistic update: remove invoice from cache
      queryClient.setQueryData(queryKeys.data.invoices(businessId || ''), (oldData: InvoiceCacheData | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            invoices: oldData.invoices.filter((invoice: Invoice) => invoice.id !== invoiceId),
            count: Math.max(0, oldData.count - 1)
          };
        }
        return oldData;
      });
      
      // Also invalidate and refetch for server confirmation
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.data.invoices(businessId || ''),
        refetchType: 'active'
      });
    },
    onError: (error: Error | unknown) => {
      console.error('[useDeleteInvoice] error:', error);
    }
  });
}