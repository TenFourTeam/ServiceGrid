import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckSquare, Camera, Calendar, MapPin, Briefcase, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useMyCompletedTasks, type CompletedTask } from '@/hooks/useMyCompletedTasks';
import { MediaViewer } from '@/components/Jobs/MediaViewer';
import { SkeletonList } from '@/components/ui/skeleton-page';

export function TaskCompletionHistoryView() {
  const [dateRange, setDateRange] = useState<number | 'all'>(30);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'photos'>('recent');
  const [selectedTask, setSelectedTask] = useState<CompletedTask | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  
  const { data, isLoading } = useMyCompletedTasks(dateRange);
  
  // Compute stats from data
  const stats = useMemo(() => {
    if (!data) return null;
    return {
      totalCompleted: data.stats.totalCompleted,
      totalPhotos: data.stats.totalPhotos,
      avgPhotosPerTask: data.stats.totalPhotos / Math.max(1, data.stats.completedInRange),
      completedInRange: data.stats.completedInRange
    };
  }, [data]);
  
  // Sort tasks
  const sortedTasks = useMemo(() => {
    if (!data?.completedTasks) return [];
    const tasks = [...data.completedTasks];
    switch (sortBy) {
      case 'oldest':
        return tasks.reverse();
      case 'photos':
        return tasks.sort((a, b) => b.media.length - a.media.length);
      case 'recent':
      default:
        return tasks;
    }
  }, [data?.completedTasks, sortBy]);

  if (isLoading) {
    return <SkeletonList />;
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats?.completedInRange || 0}</div>
            <div className="text-xs text-muted-foreground">Tasks Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats?.totalPhotos || 0}</div>
            <div className="text-xs text-muted-foreground">Photos Captured</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {stats?.avgPhotosPerTask.toFixed(1) || '0'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Photos/Task</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats?.totalCompleted || 0}</div>
            <div className="text-xs text-muted-foreground">All Time Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={dateRange.toString()}
          onValueChange={(value) => setDateRange(value === 'all' ? 'all' : parseInt(value))}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'oldest' | 'photos')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="photos">Most Photos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Timeline */}
      <div className="space-y-4">
        {sortedTasks.map((task) => (
          <Card key={task.itemId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-foreground">{task.itemTitle}</h3>
                    </div>
                    {task.itemDescription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.itemDescription}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Camera className="h-3 w-3" />
                    {task.media.length}
                  </Badge>
                </div>

                {/* Completion Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
                    </span>
                  </div>
                  {task.completedBy && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px]">
                          {task.completedBy.name?.[0] || task.completedBy.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>by {task.completedBy.name || task.completedBy.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    <span>{task.jobTitle}</span>
                  </div>
                  {task.jobAddress && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{task.jobAddress}</span>
                    </div>
                  )}
                </div>

                {/* Photo Grid */}
                {task.media.length > 0 && (
                  <div className="relative">
                    <div className="grid grid-cols-4 gap-2">
                      {task.media.slice(0, 4).map((media, index) => (
                        <button
                          key={media.id}
                          onClick={() => {
                            setSelectedTask(task);
                            setSelectedMediaIndex(index);
                            setGalleryOpen(true);
                          }}
                          className="relative aspect-square rounded-md overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={media.thumbnail_url || media.public_url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 3 && task.media.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                +{task.media.length - 4}
                              </span>
                            </div>
                          )}
                          {media.file_type === 'video' && (
                            <div className="absolute top-1 right-1">
                              <Video className="h-4 w-4 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* From Checklist */}
                <p className="text-xs text-muted-foreground">
                  From checklist: <span className="font-medium">{task.checklistTitle}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!isLoading && sortedTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">No completed tasks yet</h3>
            <p className="text-sm text-muted-foreground">
              {dateRange === 'all' 
                ? 'Completed tasks will appear here with their photos'
                : `No tasks completed in the last ${dateRange} days`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Media Gallery Dialog */}
      {selectedTask && (
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-4xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedTask.itemTitle}</DialogTitle>
              <DialogDescription>
                Completed {formatDistanceToNow(new Date(selectedTask.completedAt), { addSuffix: true })}
              </DialogDescription>
            </DialogHeader>
            <MediaViewer
              media={selectedTask.media.map(m => ({
                id: m.id,
                file_type: m.file_type,
                public_url: m.public_url,
                thumbnail_url: m.thumbnail_url,
                created_at: m.created_at,
                mime_type: m.file_type === 'photo' ? 'image/jpeg' : 'video/mp4',
                original_filename: '',
                file_size: 0,
                upload_status: 'completed' as const,
                metadata: {}
              }))}
              initialIndex={selectedMediaIndex}
              isOpen={galleryOpen}
              onClose={() => setGalleryOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
