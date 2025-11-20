import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { DriveSyncOptions } from '@/types/googleDrive';

export function useGoogleDriveSync() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const syncMedia = useMutation({
    mutationFn: async (options: DriveSyncOptions & { jobId?: string; customerId?: string }) => {
      const { data, error } = await authApi.invoke('google-drive-sync-media', {
        method: 'POST',
        body: {
          entityIds: options.entityIds,
          syncAll: options.syncAll,
          jobId: options.jobId,
          customerId: options.customerId,
        }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'sync-logs', businessId] });
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'file-mappings', businessId] });
      toast.success(`Media sync completed: ${data.itemsSynced} items`);
    },
    onError: (error: Error) => {
      toast.error(`Media sync failed: ${error.message}`);
    },
  });

  const exportInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await authApi.invoke('google-drive-export-invoice-pdf', {
        method: 'POST',
        body: { invoiceId }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'sync-logs', businessId] });
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'file-mappings', businessId] });
      toast.success('Invoice exported to Google Drive');
    },
    onError: (error: Error) => {
      toast.error(`Invoice export failed: ${error.message}`);
    },
  });

  const exportQuote = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await authApi.invoke('google-drive-export-quote-pdf', {
        method: 'POST',
        body: { quoteId }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'sync-logs', businessId] });
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'file-mappings', businessId] });
      toast.success('Quote exported to Google Drive');
    },
    onError: (error: Error) => {
      toast.error(`Quote export failed: ${error.message}`);
    },
  });

  const exportReport = useMutation({
    mutationFn: async (params: { reportType: string; startDate: string; endDate: string }) => {
      const { data, error } = await authApi.invoke('google-drive-export-report', {
        method: 'POST',
        body: params
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive', 'sync-logs', businessId] });
      toast.success('Report exported to Google Drive');
    },
    onError: (error: Error) => {
      toast.error(`Report export failed: ${error.message}`);
    },
  });

  return {
    syncMedia: syncMedia.mutate,
    exportInvoice: exportInvoice.mutate,
    exportQuote: exportQuote.mutate,
    exportReport: exportReport.mutate,
    isSyncing: syncMedia.isPending || exportInvoice.isPending || exportQuote.isPending || exportReport.isPending,
  };
}
