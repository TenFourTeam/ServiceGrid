import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleDriveSyncLog } from '@/hooks/useGoogleDriveSyncLog';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { formatSyncDuration } from '@/utils/drive-helpers';

export function GoogleDriveSyncHistory() {
  const { data: syncLogs, isLoading } = useGoogleDriveSyncLog();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!syncLogs || syncLogs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No sync history yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync History</CardTitle>
        <CardDescription>Recent backup and sync activities</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {syncLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="mt-0.5">
                  {log.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {log.status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                  {log.status === 'partial' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {log.sync_type.replace(/_/g, ' ')}
                      </span>
                      {log.direction === 'to_drive' ? (
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="outline" className="capitalize">
                        {log.entity_type}
                      </Badge>
                    </div>
                    <Badge
                      variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
                    >
                      {log.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{log.items_succeeded}/{log.items_processed} succeeded</span>
                    {log.items_failed > 0 && (
                      <span className="text-red-600">{log.items_failed} failed</span>
                    )}
                    <span>
                      {formatSyncDuration(log.started_at, log.completed_at || undefined)}
                    </span>
                  </div>
                  {log.error_message && (
                    <p className="text-sm text-red-600">{log.error_message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.started_at), 'PPp')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
