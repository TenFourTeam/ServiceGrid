import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";
export interface DbCustomerRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export function useSupabaseCustomers(opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<{ rows: DbCustomerRow[] } | null, Error>({
    queryKey: ["supabase", "customers"],
    enabled,
    queryFn: async () => {
      const data = await edgeFetchJson("customers", getToken);
      const rows: DbCustomerRow[] = (data?.rows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
      }));
      return { rows };
    },
      const rows: DbCustomerRow[] = (data?.rows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
      }));
      return { rows };
    },
    staleTime: 30_000,
  });
}
