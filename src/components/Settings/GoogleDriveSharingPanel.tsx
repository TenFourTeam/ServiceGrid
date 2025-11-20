import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGoogleDriveSharing } from '@/hooks/useGoogleDriveSharing';
import { useGoogleDriveConnection } from '@/hooks/useGoogleDriveConnection';
import { Share2, Users, Mail, Link as LinkIcon } from 'lucide-react';

export function GoogleDriveSharingPanel() {
  const { isConnected } = useGoogleDriveConnection();
  const { createShareLink, shareWithEmail } = useGoogleDriveSharing();

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Connect to Google Drive to enable sharing features
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sharing & Collaboration</CardTitle>
        <CardDescription>Share files with customers and team members</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Share Links</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Create shareable links for invoices and media
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Create Link
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Email Access</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Grant access via email to specific files
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Share via Email
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Team Sharing</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Share folders with your team members
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Manage Team
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Customer Access</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Give customers access to their job files
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Manage Access
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Active Shares</h4>
          <div className="text-center py-6 text-muted-foreground text-sm">
            No active shares yet
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium text-sm">Permission Levels</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Viewer</Badge>
            <Badge variant="outline">Commenter</Badge>
            <Badge variant="outline">Editor</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
