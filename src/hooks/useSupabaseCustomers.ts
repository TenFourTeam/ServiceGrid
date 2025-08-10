
import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";
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
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<{ rows: DbCustomerRow[] } | null, Error>({
    queryKey: ["supabase", "customers"],
    enabled,
    queryFn: async () => {
      console.info("[useSupabaseCustomers] fetching...");
      const data = await edgeFetchJson("customers", getToken);
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
