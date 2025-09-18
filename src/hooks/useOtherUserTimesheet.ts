import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

interface TimesheetEntry {
  id: string;
  user_id: string;
  business_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface MemberInfo {
  id: string;
  email: string;
  full_name: string | null;
}

export function useOtherUserTimesheet(userId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const authEdgeApi = createAuthEdgeApi(getToken);

  const { data, isLoading } = useQuery({
    queryKey: ["other-user-timesheet", userId],
    queryFn: async () => {
      const result = await authEdgeApi.invoke("timesheet-crud", {
        method: "GET",
        queryParams: { userId }
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!userId,
  });

  const entries: TimesheetEntry[] = data?.entries || [];
  const memberInfo: MemberInfo | null = data?.memberInfo || null;

  const editEntryMutation = useMutation({
    mutationFn: async (params: {
      entryId: string;
      clockInTime?: string;
      clockOutTime?: string;
      notes?: string;
      action: string;
      targetUserId?: string;
    }) => {
      const result = await authEdgeApi.invoke("timesheet-crud", {
        method: "PUT",
        body: params,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["other-user-timesheet", userId] });
      toast.success("Entry updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update entry");
    },
  });

  return {
    entries,
    memberInfo,
    isLoading,
    editEntry: editEntryMutation.mutate,
    isEditingEntry: editEntryMutation.isPending,
  };
}