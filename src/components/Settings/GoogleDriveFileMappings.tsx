import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleDriveFileMappings } from '@/hooks/useGoogleDriveFiles';
import { Loader2, ExternalLink, FileText, Image as ImageIcon, Briefcase, Users } from 'lucide-react';
import { getDriveSyncStatusColor, formatDriveFileSize } from '@/utils/drive-helpers';
import { format } from 'date-fns';

const entityIcons = {
  media: ImageIcon,
  invoice: FileText,
  quote: FileText,
  job: Briefcase,
  customer: Users,
};

export function GoogleDriveFileMappings() {
  const { data: fileMappings, isLoading } = useGoogleDriveFileMappings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fileMappings || fileMappings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No file mappings yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File Mappings</CardTitle>
        <CardDescription>Links between ServiceGrid entities and Drive files</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {fileMappings.map((mapping) => {
              const Icon = entityIcons[mapping.sg_entity_type] || FileText;
              return (
                <div
                  key={mapping.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{mapping.drive_file_name}</p>
                      <Badge variant="outline" className="capitalize">
                        {mapping.sg_entity_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDriveFileSize(mapping.file_size_bytes || 0)}</span>
                      <span className={getDriveSyncStatusColor(mapping.sync_status || 'pending')}>
                        {mapping.sync_status}
                      </span>
                      {mapping.last_synced_at && (
                        <span>Synced {format(new Date(mapping.last_synced_at), 'PP')}</span>
                      )}
                    </div>
                    {mapping.error_message && (
                      <p className="text-xs text-red-600">{mapping.error_message}</p>
                    )}
                  </div>
                  {mapping.drive_web_view_link && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a href={mapping.drive_web_view_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
