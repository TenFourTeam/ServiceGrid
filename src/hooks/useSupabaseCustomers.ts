import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { getClerkTokenStrict } from "@/utils/clerkToken";

export interface DbCustomerRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export function useSupabaseCustomers(opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && (opts?.enabled ?? true);

  return useQuery<{ rows: DbCustomerRow[] } | null, Error>({
    queryKey: ["supabase", "customers"],
    enabled,
    queryFn: async () => {
      const token = await getClerkTokenStrict(getToken);

      const r = await fetch(`${SUPABASE_URL}/functions/v1/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Failed to load customers (${r.status}): ${txt}`);
      }

      const data = await r.json();
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
