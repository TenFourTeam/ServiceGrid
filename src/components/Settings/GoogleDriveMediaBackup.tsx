import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGoogleDriveSync } from '@/hooks/useGoogleDriveSync';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { Loader2, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function GoogleDriveMediaBackup() {
  const { isConnected } = useGoogleDriveConnection();
  const { syncMedia, isSyncing } = useGoogleDriveSync();

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Connect to Google Drive to backup media
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleBackupAll = () => {
    syncMedia({ entityType: 'media', syncAll: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Backup</CardTitle>
        <CardDescription>Backup job photos and videos to Google Drive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Full Media Backup</p>
              <p className="text-sm text-muted-foreground">
                Backup all job photos and videos to Drive
              </p>
            </div>
            <Button onClick={handleBackupAll} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Backing up...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Backup
                </>
              )}
            </Button>
          </div>

          {isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">Uploading...</span>
              </div>
              <Progress value={33} className="h-2" />
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-medium">Backup Settings</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Format</span>
              <Badge variant="outline">Original</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Organization</span>
              <Badge variant="outline">By Job</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duplicate Check</span>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Media will be organized in folders:</p>
          <code className="block mt-2 p-2 bg-muted rounded text-xs">
            ServiceGrid → Customer Name → Job Title → media/
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
