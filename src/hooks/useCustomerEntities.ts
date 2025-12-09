import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface CustomerJob {
  id: string;
  title: string | null;
  status: string;
  starts_at: string | null;
}

export interface CustomerQuote {
  id: string;
  number: string;
  status: string;
  total: number;
}

export interface CustomerInvoice {
  id: string;
  number: string;
  status: string;
  total: number;
}

export function useCustomerEntities(customerId: string | null) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  // Fetch jobs - if customerId is null, fetch all jobs for the business
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['customer-entities-jobs', customerId, businessId],
    queryFn: async () => {
      const queryParams: Record<string, string> = { limit: '20' };
      if (customerId) {
        queryParams.customerId = customerId;
      }
      const { data, error } = await authApi.invoke('jobs-crud', { 
        method: 'GET',
        queryParams,
      });
      if (error || !data) return [];
      const jobsData = data.jobs || data || [];
      return jobsData.map((j: any) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        starts_at: j.starts_at,
      })) as CustomerJob[];
    },
    enabled: !!businessId,
  });

  // Fetch quotes - if customerId is null, fetch all quotes for the business
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ['customer-entities-quotes', customerId, businessId],
    queryFn: async () => {
      const queryParams: Record<string, string> = { limit: '20' };
      if (customerId) {
        queryParams.customerId = customerId;
      }
      const { data, error } = await authApi.invoke('quotes-crud', { 
        method: 'GET',
        queryParams,
      });
      if (error || !data) return [];
      const quotesData = data.quotes || data || [];
      return quotesData.map((q: any) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        total: q.total,
      })) as CustomerQuote[];
    },
    enabled: !!businessId,
  });

  // Fetch invoices - if customerId is null, fetch all invoices for the business
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['customer-entities-invoices', customerId, businessId],
    queryFn: async () => {
      const queryParams: Record<string, string> = { limit: '20' };
      if (customerId) {
        queryParams.customerId = customerId;
      }
      const { data, error } = await authApi.invoke('invoices-crud', { 
        method: 'GET',
        queryParams,
      });
      if (error || !data) return [];
      const invoicesData = data.invoices || data || [];
      return invoicesData.map((i: any) => ({
        id: i.id,
        number: i.number,
        status: i.status,
        total: i.total,
      })) as CustomerInvoice[];
    },
    enabled: !!businessId,
  });

  return {
    jobs,
    quotes,
    invoices,
    isLoading: jobsLoading || quotesLoading || invoicesLoading,
  };
}
