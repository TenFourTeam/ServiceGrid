import { useAIActivityLog } from "@/hooks/useAIActivityLog";
import { Zap, Mail, Users, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const actionIcons: Record<string, React.ReactNode> = {
  lead_scoring: <Zap className="h-4 w-4 text-amber-500" />,
  lead_assignment: <Users className="h-4 w-4 text-green-500" />,
  welcome_email: <Mail className="h-4 w-4 text-blue-500" />,
  email_sent: <Mail className="h-4 w-4 text-emerald-500" />,
};

export function AutomationActivityLog() {
  const { recentActivity, isLoading } = useAIActivityLog();

  const automationActivities = recentActivity.filter((a) => {
    const actionType = (a.metadata as Record<string, unknown>)?.action_type;
    return (
      actionType &&
      ["lead_scoring", "lead_assignment", "welcome_email", "email_sent"].includes(
        actionType as string
      )
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-4 w-4 animate-spin mr-2" />
        Loading activity...
      </div>
    );
  }

  if (automationActivities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent automation activity</p>
        <p className="text-xs mt-1">
          Enable automation settings above, then submit a test request to see activity here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {automationActivities.slice(0, 20).map((activity) => {
        const actionType = (activity.metadata as Record<string, unknown>)?.action_type as string;
        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <div className="mt-0.5">
              {actionIcons[actionType] || <Zap className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{activity.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
