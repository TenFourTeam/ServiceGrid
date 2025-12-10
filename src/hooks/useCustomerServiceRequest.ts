import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { toast } from 'sonner';

interface ServiceRequestData {
  serviceType: string;
  description: string;
  preferredDate?: string;
  preferredTime?: string;
  address?: string;
  urgency?: 'normal' | 'urgent';
}

export function useCustomerServiceRequest() {
  const { sessionToken } = useCustomerAuth();

  const submitRequest = useMutation({
    mutationFn: async (data: ServiceRequestData) => {
      if (!sessionToken) throw new Error('Not authenticated');

      const { data: response, error } = await supabase.functions.invoke('customer-service-request', {
        method: 'POST',
        headers: { 'x-session-token': sessionToken },
        body: data,
      });

      if (error) throw error;
      if (!response.success) throw new Error(response.error || 'Failed to submit request');
      return response.request;
    },
    onSuccess: () => {
      toast.success('Service request submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit service request');
    },
  });

  return {
    submitRequest,
    isSubmitting: submitRequest.isPending,
  };
}
