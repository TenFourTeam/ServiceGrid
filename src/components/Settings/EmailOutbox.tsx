import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MailSendRow {
  id: string;
  created_at: string;
  subject: string;
  to_email: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  provider_message_id: string | null;
}

export default function EmailOutbox() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mail-sends"],
    queryFn: async (): Promise<MailSendRow[]> => {
      const { data, error } = await supabase
        .from("mail_sends")
        .select("id, created_at, subject, to_email, status, error_code, error_message, provider_message_id")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as any) as MailSendRow[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Email Sends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {error && (
          <div className="text-sm text-destructive">Failed to load outbox. Please refresh.</div>
        )}
        <div className="space-y-2">
          {(data || []).map((row) => (
            <div key={row.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{row.subject}</div>
                <div className="text-xs text-muted-foreground truncate">To: {row.to_email}</div>
                {row.error_message && (
                  <div className="text-xs text-destructive mt-1 truncate">{row.error_message}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={row.status === "sent" ? "default" : row.status === "failed" ? "destructive" : "secondary"}>
                  {row.status}
                </Badge>
                <div className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
