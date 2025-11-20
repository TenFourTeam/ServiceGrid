import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuickBooksConnection } from '@/hooks/useQuickBooksConnection';
import { CheckCircle2, XCircle } from 'lucide-react';

export function QuickBooksSettings() {
  const { status, isLoading, isConnected, connect, disconnect } = useQuickBooksConnection();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              QuickBooks Integration
              {isConnected && <Badge variant="default" className="bg-green-600">Connected</Badge>}
            </CardTitle>
            <CardDescription>
              Sync customers, invoices, and payments with QuickBooks Online
            </CardDescription>
          </div>
          {isConnected ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company ID:</span>
                <span className="font-mono text-xs">{status?.realmId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Sync:</span>
                <span>{status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'Never'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your QuickBooks Online account to automatically sync financial data.
            </p>
            <Button 
              onClick={() => connect.mutate()}
              disabled={connect.isPending || isLoading}
            >
              {connect.isPending ? 'Connecting...' : 'Connect to QuickBooks'}
            </Button>
            <p className="text-xs text-muted-foreground">
              ⚠️ QuickBooks API credentials not configured yet. Connection will be enabled once credentials are added.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
