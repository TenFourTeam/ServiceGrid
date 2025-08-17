import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useBusinessContext } from './useBusinessContext';
import { useLifecycleEmailIntegration } from './useLifecycleEmailIntegration';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';
import type { Invoice } from './useInvoicesData';

export function useCreateInvoice() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const { triggerInvoiceSent } = useLifecycleEmailIntegration();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceData: Partial<Invoice>) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: invoiceData
      });

      if (error) {
        throw new Error(error.message || 'Failed to create invoice');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate invoices query
      queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId || '') });
      
      // Trigger lifecycle email for first invoice milestone
      try {
        triggerInvoiceSent();
      } catch (error) {
        console.error('[useCreateInvoice] Failed to trigger invoice milestone email:', error);
      }
      
      toast.success('Invoice created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create invoice');
    }
  });
}

export function useSendInvoice() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const { triggerInvoiceSent } = useLifecycleEmailIntegration();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
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
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send invoice');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate invoices query
      queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId || '') });
      
      // Trigger lifecycle email for first invoice milestone
      try {
        triggerInvoiceSent();
      } catch (error) {
        console.error('[useSendInvoice] Failed to trigger invoice milestone email:', error);
      }
      
      toast.success('Invoice sent successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invoice');
    }
  });
}

export function useUpdateInvoice() {
  const { getToken } = useAuth();
  const { businessId } = useBusinessContext();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, updates }: { invoiceId: string; updates: Partial<Invoice> }) => {
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'PUT',
        body: { id: invoiceId, ...updates }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update invoice');
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate invoices query
      queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId || '') });
      toast.success('Invoice updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update invoice');
    }
  });
}