import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export function GoogleDriveSettings() {
  const { connection, health, isLoading, isConnecting, isDisconnecting, isConnected, connect, disconnect } = useGoogleDriveConnection();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Manage your Google Drive integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status</span>
                {isConnected ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Not Connected
                  </Badge>
                )}
              </div>
              {connection?.google_account_email && (
                <p className="text-sm text-muted-foreground">{connection.google_account_email}</p>
              )}
            </div>
            {isConnected ? (
              <Button
                variant="destructive"
                onClick={() => disconnect()}
                disabled={isDisconnecting}
              >
                {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disconnect
              </Button>
            ) : (
              <Button onClick={() => connect()} disabled={isConnecting}>
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect to Google Drive
              </Button>
            )}
          </div>

          {connection?.last_synced_at && (
            <div className="text-sm text-muted-foreground">
              Last synced: {format(new Date(connection.last_synced_at), 'PPp')}
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && health && (
        <Card>
          <CardHeader>
            <CardTitle>Health Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Token Valid</span>
              {health.tokenValid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Sync Success</span>
              {health.lastSyncSuccess ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Syncs</span>
              <Badge variant="outline">{health.pendingSyncs}</Badge>
            </div>
            {!health.tokenValid && (
              <Alert>
                <AlertDescription>
                  Your token has expired. Please reconnect to continue syncing.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
