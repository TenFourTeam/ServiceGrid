import { Badge } from "@/components/ui/badge";

export function StatusLegend() {
  return (
    <div className="flex items-center gap-6 mb-4 p-3 bg-card rounded-lg border">
      <span className="text-sm font-medium text-muted-foreground">Job Status:</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-status-scheduled text-status-scheduled-foreground hover:bg-status-scheduled">
            Scheduled
          </Badge>
          <span className="text-xs text-muted-foreground">Can move & resize</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-status-in-progress text-status-in-progress-foreground hover:bg-status-in-progress">
            In Progress
          </Badge>
          <span className="text-xs text-muted-foreground">Can only extend time</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-status-completed text-status-completed-foreground hover:bg-status-completed">
            Completed
          </Badge>
          <span className="text-xs text-muted-foreground">Read-only</span>
        </div>
      </div>
    </div>
  );
}