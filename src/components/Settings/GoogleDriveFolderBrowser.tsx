import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleDriveFiles } from '@/hooks/useGoogleDriveFiles';
import { Loader2, Folder, File, Search, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { formatDriveFileSize } from '@/utils/drive-helpers';
import { format } from 'date-fns';

export function GoogleDriveFolderBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const { files, isLoading } = useGoogleDriveFiles();

  const filteredFiles = files?.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Browse Files</CardTitle>
        <CardDescription>View and manage files in your Google Drive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFiles && filteredFiles.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  {file.mimeType.includes('folder') ? (
                    <Folder className="h-5 w-5 text-blue-600" />
                  ) : (
                    <File className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDriveFileSize(file.size)}</span>
                      <span>{format(new Date(file.modifiedTime), 'PP')}</span>
                    </div>
                  </div>
                  {file.webViewLink && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No files found' : 'No files yet'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
