import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, FileText, Users, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";

interface AuditLogsListProps {
  businessId?: string;
}

const getResourceIcon = (resourceType: string) => {
  switch (resourceType) {
    case 'customer':
      return <Users className="h-4 w-4" />;
    case 'job':
      return <Calendar className="h-4 w-4" />;
    case 'quote':
    case 'invoice':
      return <FileText className="h-4 w-4" />;
    case 'payment':
      return <DollarSign className="h-4 w-4" />;
    case 'member':
      return <User className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'create':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'update':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'delete':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'invite':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function AuditLogsList({ businessId }: AuditLogsListProps) {
  const { data: auditLogs, isLoading, error } = useAuditLogs(businessId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Failed to load audit logs</p>
      </Card>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No audit logs found</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        
        <div className="space-y-3">
          {auditLogs && auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getResourceIcon(log.resource_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={getActionColor(log.action)}
                  >
                    {log.action}
                  </Badge>
                  <span className="text-sm text-muted-foreground capitalize">
                    {log.resource_type}
                  </span>
                </div>
                
                <div className="text-sm space-y-1">
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="text-muted-foreground">
                      {log.details.name && (
                        <span>Name: {log.details.name}</span>
                      )}
                      {log.details.email && (
                        <span className="ml-2">Email: {log.details.email}</span>
                      )}
                      {log.details.status && (
                        <span className="ml-2">Status: {log.details.status}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    {log.resource_id && (
                      <span className="ml-2 font-mono">
                        ID: {log.resource_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}