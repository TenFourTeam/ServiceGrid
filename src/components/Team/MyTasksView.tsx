import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckSquare, MapPin, Camera, Bell, Check, Upload, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMyTasks } from '@/hooks/useMyTasks';
import { useCompleteChecklistItem } from '@/hooks/useJobChecklist';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function MyTasksView() {
  const { data, isLoading } = useMyTasks();
  const tasks = data?.tasks || [];
  const currentTimesheet = data?.currentTimesheet;
  const navigate = useNavigate();
  const completeItem = useCompleteChecklistItem();
  const { uploadMedia } = useMediaUpload();
  const { businessId } = useBusinessContext();
  
  // Filter and sort state
  const [filterJob, setFilterJob] = useState<string>('all');
  const [filterPhotoStatus, setFilterPhotoStatus] = useState<'all' | 'photos-needed' | 'photos-complete'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'job' | 'photos'>('date');
  
  // File upload state
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique jobs for filter dropdown
  const uniqueJobs = useMemo(() => {
    if (!tasks) return [];
    const jobMap = new Map();
    tasks.forEach(task => {
      if (!jobMap.has(task.jobId)) {
        jobMap.set(task.jobId, { id: task.jobId, title: task.jobTitle });
      }
    });
    return Array.from(jobMap.values());
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks || [];
    
    // Filter by job
    if (filterJob !== 'all') {
      result = result.filter(t => t.jobId === filterJob);
    }
    
    // Filter by photo status
    if (filterPhotoStatus === 'photos-needed') {
      result = result.filter(t => 
        t.requiredPhotoCount > 0 && t.currentPhotoCount < t.requiredPhotoCount
      );
    } else if (filterPhotoStatus === 'photos-complete') {
      result = result.filter(t => 
        t.requiredPhotoCount > 0 && t.currentPhotoCount >= t.requiredPhotoCount
      );
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'job':
          return a.jobTitle.localeCompare(b.jobTitle);
        case 'photos':
          const aNeeded = Math.max(0, a.requiredPhotoCount - a.currentPhotoCount);
          const bNeeded = Math.max(0, b.requiredPhotoCount - b.currentPhotoCount);
          return bNeeded - aNeeded;
        case 'date':
        default:
          if (!a.jobStartsAt) return 1;
          if (!b.jobStartsAt) return -1;
          return new Date(a.jobStartsAt).getTime() - new Date(b.jobStartsAt).getTime();
      }
    });
    
    return result;
  }, [tasks, filterJob, filterPhotoStatus, sortBy]);

  // Handlers
  const handleMarkComplete = async (task: any) => {
    try {
      await completeItem.mutateAsync({
        itemId: task.itemId,
        isCompleted: true,
        jobId: task.jobId,
      });
      
      toast.success('Task completed! ✅', {
        description: `"${task.itemTitle}" has been marked as complete.`,
      });
    } catch (error) {
      toast.error('Failed to complete task', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleUploadClick = (task: any) => {
    setUploadingTaskId(task.itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !uploadingTaskId || !businessId) return;

    const task = tasks?.find(t => t.itemId === uploadingTaskId);
    if (!task) return;

    toast.info('Uploading photos...', {
      description: `Uploading ${files.length} photo(s) for "${task.itemTitle}"`,
    });

    try {
      for (const file of files) {
        await uploadMedia(file, {
          jobId: task.jobId,
          businessId,
          checklistItemId: task.itemId,
        });
      }
      
      toast.success('Photos uploaded! 📸', {
        description: `Successfully uploaded ${files.length} photo(s).`,
      });
    } catch (error) {
      toast.error('Upload failed', {
        description: 'Some photos could not be uploaded. Please try again.',
      });
    } finally {
      setUploadingTaskId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported', {
        description: 'Your browser does not support notifications',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notifications enabled! 🔔', {
        description: "You'll be notified of new task assignments",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Tasks Assigned</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            You don't have any checklist tasks assigned to you at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Clock-In Status Alert */}
      {currentTimesheet && (
        <Alert className="border-primary/20 bg-primary/5">
          <Clock className="h-4 w-4" />
          <AlertTitle>Currently Clocked In</AlertTitle>
          <AlertDescription>
            {currentTimesheet.jobId ? (
              <span>
                Working on job since {format(new Date(currentTimesheet.clockInTime), 'h:mm a')}
                {' • '}
                {Math.floor((Date.now() - new Date(currentTimesheet.clockInTime).getTime()) / 60000)} min elapsed
              </span>
            ) : (
              <span>Clocked in since {format(new Date(currentTimesheet.clockInTime), 'h:mm a')}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">My Assigned Tasks</h3>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedTasks.length} task{filteredAndSortedTasks.length !== 1 ? 's' : ''} pending completion
            </p>
          </div>
        </div>

        {/* Notification Permission Banner */}
        {typeof Notification !== 'undefined' && 
         Notification.permission === 'default' && (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertTitle>Enable notifications</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm">Get notified when new tasks are assigned to you</span>
              <Button size="sm" onClick={requestNotificationPermission}>
                Enable
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={filterJob} onValueChange={setFilterJob}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {uniqueJobs.map(job => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPhotoStatus} onValueChange={(value) => setFilterPhotoStatus(value as 'all' | 'photos-needed' | 'photos-complete')}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Photo status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="photos-needed">Photos Needed</SelectItem>
              <SelectItem value="photos-complete">Photos Complete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'job' | 'photos')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Job Date</SelectItem>
              <SelectItem value="job">Job Name</SelectItem>
              <SelectItem value="photos">Photos Needed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Task List */}
      <div className="space-y-3">
        {filteredAndSortedTasks.map((task) => (
          <Card key={task.itemId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 space-y-2">
                  {/* Task Title */}
                  <div>
                    <h4 className="font-medium text-base sm:text-sm">{task.itemTitle}</h4>
                    {task.itemDescription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.itemDescription}
                      </p>
                    )}
                  </div>

                  {/* Job Info */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-3 w-3 flex-shrink-0" />
                      <span>{task.jobTitle}</span>
                    </div>
                    {task.jobStartsAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>{format(new Date(task.jobStartsAt), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                    {task.jobAddress && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{task.jobAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Checklist Info */}
                  <p className="text-xs text-muted-foreground">
                    From checklist: {task.checklistTitle}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                  {/* Photo Badge */}
                  {task.requiredPhotoCount > 0 && (
                    <Badge
                      variant={task.currentPhotoCount >= task.requiredPhotoCount ? "default" : "destructive"}
                      className="gap-1 flex-1 sm:flex-initial justify-center"
                    >
                      <Camera className="h-3 w-3" />
                      {task.currentPhotoCount}/{task.requiredPhotoCount}
                    </Badge>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Upload Photos Button */}
                    {task.requiredPhotoCount > 0 && task.currentPhotoCount < task.requiredPhotoCount && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUploadClick(task)}
                        className="min-h-[44px] sm:min-h-[36px]"
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    )}

                    {/* Mark Complete Button */}
                    {task.currentPhotoCount >= task.requiredPhotoCount && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkComplete(task)}
                        disabled={completeItem.isPending}
                        className="min-h-[44px] sm:min-h-[36px]"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}

                    {/* Go to Job Button */}
                    <Button
                      size="sm"
                      onClick={() => navigate(`/calendar?job=${task.jobId}`)}
                      className="min-h-[44px] sm:min-h-[36px]"
                    >
                      View Job
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
