import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useGoogleDriveSync } from '@/hooks/useGoogleDriveSync';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { Loader2, Upload, FileText, Image, Briefcase, Users } from 'lucide-react';
import { toast } from 'sonner';

export function GoogleDriveSyncDashboard() {
  const { isConnected } = useGoogleDriveConnection();
  const { syncMedia, isSyncing } = useGoogleDriveSync();

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Connect to Google Drive to enable sync features
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSyncAll = () => {
    syncMedia({ entityType: 'media', syncAll: true });
    toast.info('Starting full media backup...');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync Dashboard</CardTitle>
          <CardDescription>Manage automatic backups and exports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Automatic Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup new media and documents
              </p>
            </div>
            <Switch id="auto-sync" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Media Backup
                  </CardTitle>
                  <Badge variant="outline">Auto</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Backup job photos and videos to Drive
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                >
                  {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Backup All Media
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document Export
                  </CardTitle>
                  <Badge variant="outline">Manual</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Export invoices and quotes as PDFs
                </p>
                <Button size="sm" className="w-full" variant="outline" disabled>
                  Configure Export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Job Folders
                  </CardTitle>
                  <Badge variant="outline">Auto</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Organize files by customer and job
                </p>
                <Button size="sm" className="w-full" variant="outline" disabled>
                  View Structure
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Sharing
                  </CardTitle>
                  <Badge variant="outline">Manual</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Share files with customers and team
                </p>
                <Button size="sm" className="w-full" variant="outline" disabled>
                  Manage Sharing
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
