
import { useQuery } from "@tanstack/react-query";
import { useAuthSnapshot } from "@/auth";
import { useApiClient } from "@/auth";
import { qk } from "@/queries/keys";
import { z } from "zod";

export interface DbCustomerRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

const CustomersResponseSchema = z.object({
  rows: z.array(z.any()).optional().default([]),
});

export function useSupabaseCustomers(opts?: { enabled?: boolean }) {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && (opts?.enabled ?? true);

  return useQuery<{ rows: DbCustomerRow[] } | null, Error>({
    queryKey: qk.customersList(snapshot.businessId || ''),
    enabled: enabled && !!snapshot.businessId,
    queryFn: async () => {
      console.info("[useSupabaseCustomers] fetching...");
      const response = await apiClient.get("/customers");
      if (response.error) throw new Error(response.error);
      const data = response.data;
      if (!data) {
        console.info("[useSupabaseCustomers] no data (null) – likely signed out");
        return { rows: [] };
      }
      const parsed = CustomersResponseSchema.parse(data);
      const rows: DbCustomerRow[] = (parsed.rows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
      }));
      console.info("[useSupabaseCustomers] fetched", rows.length, "rows");
      return { rows };
    },
    staleTime: 30_000,
  });
}
