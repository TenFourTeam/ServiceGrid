import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthProvider";

export interface DbCustomerRow {
  id: string;
  name: string;
  email?: string | null;
  address?: string | null;
}

export function useSupabaseCustomers(opts?: { enabled?: boolean }) {
  const { user } = useAuth();
  const enabled = !!user && (opts?.enabled ?? true);

  return useQuery<{ rows: DbCustomerRow[] } | null, Error>({
    queryKey: ["supabase", "customers"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(["id", "name", "email", "address"].join(","))
        .order("updated_at", { ascending: false });

      if (error) throw error;
      const rows: DbCustomerRow[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        address: r.address,
      }));
      return { rows };
    },
    staleTime: 30_000,
  });
}
