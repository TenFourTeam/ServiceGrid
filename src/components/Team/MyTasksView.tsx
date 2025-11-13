import { useNavigate } from 'react-router-dom';
import { Calendar, CheckSquare, MapPin, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyTasks } from '@/hooks/useMyTasks';
import { format } from 'date-fns';

export function MyTasksView() {
  const { data: tasks, isLoading } = useMyTasks();
  const navigate = useNavigate();

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">My Assigned Tasks</h3>
          <p className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} pending completion
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.itemId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Task Title */}
                  <div>
                    <h4 className="font-medium">{task.itemTitle}</h4>
                    {task.itemDescription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.itemDescription}
                      </p>
                    )}
                  </div>

                  {/* Job Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" />
                      <span>{task.jobTitle}</span>
                    </div>
                    {task.jobStartsAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(task.jobStartsAt), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                    {task.jobAddress && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{task.jobAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Checklist Info */}
                  <p className="text-xs text-muted-foreground">
                    From checklist: {task.checklistTitle}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {/* Photo Badge */}
                  {task.requiredPhotoCount > 0 && (
                    <Badge
                      variant={task.currentPhotoCount >= task.requiredPhotoCount ? "default" : "destructive"}
                      className="gap-1"
                    >
                      <Camera className="h-3 w-3" />
                      {task.currentPhotoCount}/{task.requiredPhotoCount}
                    </Badge>
                  )}

                  {/* Go to Job Button */}
                  <Button
                    size="sm"
                    onClick={() => navigate(`/calendar?job=${task.jobId}`)}
                  >
                    Go to Job
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
