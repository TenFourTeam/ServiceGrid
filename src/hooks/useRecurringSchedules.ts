import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { queryKeys } from "@/queries/keys";
import { useAuthApi } from "@/hooks/useAuthApi";
import { toast } from "sonner";

export interface RecurringSchedule {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  quote_id: string;
  quote_number: string;
  frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  amount: number;
  next_billing_date: string;
  last_invoice_date: string | null;
  total_invoices_generated: number;
  is_active: boolean;
  stripe_subscription_id: string | null;
  created_at: string;
}

export function useRecurringSchedules() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: queryKeys.data.recurringSchedules(businessId || ''),
    enabled: isAuthenticated && !!businessId,
    queryFn: async () => {
      console.info("[useRecurringSchedules] fetching schedules");
      
      const { data, error } = await authApi.invoke('recurring-schedules-crud', {
        method: 'GET',
        headers: {
          'x-business-id': businessId
        }
      });
      
      if (error) {
        console.error("[useRecurringSchedules] error:", error);
        throw new Error(error.message || 'Failed to fetch recurring schedules');
      }
      
      console.info("[useRecurringSchedules] fetched", data?.schedules?.length || 0, "schedules");
      
      return data?.schedules || [];
    },
    staleTime: 30_000,
  });
}

export function useGenerateNextInvoice() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      console.info("[useGenerateNextInvoice] generating invoice for schedule", scheduleId);
      
      const { data, error } = await authApi.invoke('recurring-schedules-crud', {
        method: 'POST',
        headers: {
          'x-business-id': businessId
        },
        body: {
          action: 'generate_next',
          scheduleId
        }
      });
      
      if (error) {
        console.error("[useGenerateNextInvoice] error:", error);
        throw new Error(error.message || 'Failed to generate invoice');
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Invoice generated successfully! Next invoice scheduled for ${new Date(data.nextBillingDate).toLocaleDateString()}`);
      
      // Invalidate both recurring schedules and invoices queries
      queryClient.invalidateQueries({ queryKey: queryKeys.data.recurringSchedules(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId || '') });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate invoice');
    }
  });
}