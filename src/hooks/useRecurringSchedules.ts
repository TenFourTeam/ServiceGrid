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
      
      queryClient.invalidateQueries({ queryKey: queryKeys.data.recurringSchedules(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId || '') });
    },
    onError: (error: Error) {
      toast.error(error.message || 'Failed to generate invoice');
    }
  });
}

export interface RecurringScheduleDetail extends RecurringSchedule {
  invoices: Array<{
    id: string;
    number: string;
    total: number;
    status: string;
    created_at: string;
  }>;
}

export function useRecurringScheduleDetail(scheduleId: string | null) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<RecurringScheduleDetail>({
    queryKey: queryKeys.data.recurringSchedules(businessId || '').concat(['detail', scheduleId || '']),
    enabled: !!businessId && !!scheduleId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke(`recurring-schedules-crud?scheduleId=${scheduleId}`, {
        method: 'GET',
        headers: { 'x-business-id': businessId }
      });

      if (error) throw new Error(error.message || 'Failed to fetch schedule details');
      
      return {
        ...data.schedule,
        invoices: data.invoices || [],
        customer_name: data.schedule.customer?.name,
        customer_email: data.schedule.customer?.email,
        quote_number: data.schedule.quote?.number,
        amount: data.schedule.quote?.total || 0,
      };
    },
  });
}

export function usePauseSubscription() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data, error } = await authApi.invoke('recurring-schedules-crud', {
        method: 'PATCH',
        body: { action: 'pause', scheduleId }
      });
      if (error) throw new Error(error.message || 'Failed to pause subscription');
      return data;
    },
    onSuccess: () => {
      toast.success('Subscription paused successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.data.recurringSchedules(businessId || '') });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to pause subscription');
    },
  });
}

export function useResumeSubscription() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data, error } = await authApi.invoke('recurring-schedules-crud', {
        method: 'PATCH',
        body: { action: 'resume', scheduleId }
      });
      if (error) throw new Error(error.message || 'Failed to resume subscription');
      return data;
    },
    onSuccess: () => {
      toast.success('Subscription resumed successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.data.recurringSchedules(businessId || '') });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resume subscription');
    },
  });
}

export function useCancelSubscription() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data, error } = await authApi.invoke(`recurring-schedules-crud?id=${scheduleId}`, {
        method: 'DELETE'
      });
      if (error) throw new Error(error.message || 'Failed to cancel subscription');
      return data;
    },
    onSuccess: () => {
      toast.success('Subscription canceled successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.data.recurringSchedules(businessId || '') });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel subscription');
    },
  });
}