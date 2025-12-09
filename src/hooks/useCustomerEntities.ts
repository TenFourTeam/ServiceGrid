import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface CustomerJob {
  id: string;
  title: string;
  status: string;
  starts_at?: string;
  address?: string;
}

export interface CustomerQuote {
  id: string;
  number: string;
  total: number;
  status: string;
  created_at: string;
}

export interface CustomerInvoice {
  id: string;
  number: string;
  total: number;
  status: string;
  due_at?: string;
}

export function useCustomerEntities(customerId: string | null) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  const jobs = useQuery({
    queryKey: ['customer-entities-jobs', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await authApi.invoke(`jobs-crud?customerId=${customerId}`, {
        method: 'GET',
      });
      if (error) throw error;
      return (data.jobs || []).map((j: any) => ({
        id: j.id,
        title: j.title || 'Untitled Job',
        status: j.status,
        starts_at: j.starts_at,
        address: j.address,
      })) as CustomerJob[];
    },
    enabled: !!customerId && !!businessId,
  });

  const quotes = useQuery({
    queryKey: ['customer-entities-quotes', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await authApi.invoke(`quotes-crud?customerId=${customerId}`, {
        method: 'GET',
      });
      if (error) throw error;
      return (data.quotes || []).map((q: any) => ({
        id: q.id,
        number: q.number,
        total: q.total,
        status: q.status,
        created_at: q.created_at,
      })) as CustomerQuote[];
    },
    enabled: !!customerId && !!businessId,
  });

  const invoices = useQuery({
    queryKey: ['customer-entities-invoices', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await authApi.invoke(`invoices-crud?customerId=${customerId}`, {
        method: 'GET',
      });
      if (error) throw error;
      return (data.invoices || []).map((i: any) => ({
        id: i.id,
        number: i.number,
        total: i.total,
        status: i.status,
        due_at: i.due_at,
      })) as CustomerInvoice[];
    },
    enabled: !!customerId && !!businessId,
  });

  return {
    jobs: jobs.data || [],
    quotes: quotes.data || [],
    invoices: invoices.data || [],
    isLoading: jobs.isLoading || quotes.isLoading || invoices.isLoading,
  };
}
