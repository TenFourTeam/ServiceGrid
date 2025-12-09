import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface PortalCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  hasPortalAccess: boolean;
}

export function usePortalCustomers() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['portal-customers', businessId],
    queryFn: async () => {
      // Fetch customers with portal access (have customer_accounts entry)
      const { data, error } = await authApi.invoke('customers-crud?includePortalStatus=true', {
        method: 'GET',
      });

      if (error) throw error;

      // Filter to only customers with portal access
      const customers = (data.customers || []) as any[];
      return customers
        .filter((c: any) => c.has_portal_access)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          hasPortalAccess: true,
        })) as PortalCustomer[];
    },
    enabled: !!businessId,
  });
}
