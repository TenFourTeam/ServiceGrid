import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGoogleDriveSync } from '@/hooks/useGoogleDriveSync';
import { Loader2, Upload, Download, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function GoogleDriveBulkOperations() {
  const { syncMedia, isSyncing } = useGoogleDriveSync();
  const [progress, setProgress] = useState(0);

  const handleBulkBackup = () => {
    syncMedia({ entityType: 'media', syncAll: true });
    setProgress(50);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Operations</CardTitle>
        <CardDescription>Perform large-scale sync operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Bulk operations may take several minutes depending on the amount of data.
            Do not close this page during the operation.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Full Backup</h4>
                <p className="text-sm text-muted-foreground">
                  Backup all media, invoices, and quotes
                </p>
              </div>
              <Button onClick={handleBulkBackup} disabled={isSyncing}>
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
            </div>
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Selective Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Choose specific entities to backup
                </p>
              </div>
              <Button variant="outline" disabled>
                Configure
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Import from Drive</h4>
                <p className="text-sm text-muted-foreground">
                  Import documents from your Drive to ServiceGrid
                </p>
              </div>
              <Button variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">Operation Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure stable internet connection</li>
            <li>Large operations may take 10-30 minutes</li>
            <li>Check sync history after completion</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
