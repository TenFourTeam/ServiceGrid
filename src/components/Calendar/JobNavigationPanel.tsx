import { useMemo, useState } from 'react';
import { Job } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface JobNavigationPanelProps {
  jobs: Array<{ job: Job; coords: { lat: number; lng: number } }>;
  selectedJobId: string | null;
  currentJobIndex: number;
  onJobSelect: (jobId: string, index: number) => void;
  onClose: () => void;
}

/**
 * Collapsible sidebar panel showing list of jobs for easy navigation
 * Allows filtering, searching, and quick selection of jobs on the map
 */
export function JobNavigationPanel({ 
  jobs, 
  selectedJobId, 
  currentJobIndex,
  onJobSelect, 
  onClose 
}: JobNavigationPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    
    const query = searchQuery.toLowerCase();
    return jobs.filter(({ job }) => {
      const titleMatch = job.title?.toLowerCase().includes(query);
      const addressMatch = job.address?.toLowerCase().includes(query);
      return titleMatch || addressMatch;
    });
  }, [jobs, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'In Progress':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'Scheduled':
      case 'Schedule Approved':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'Canceled':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="absolute top-4 left-4 z-10 w-80 max-h-[calc(100vh-8rem)] flex flex-col shadow-lg">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Jobs ({filteredJobs.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1 h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-2 pt-0">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? 'No jobs found' : 'No jobs for this date'}
            </div>
          ) : (
            filteredJobs.map(({ job }, index) => {
              const isSelected = job.id === selectedJobId;
              const actualIndex = jobs.findIndex(j => j.job.id === job.id);
              
              return (
                <button
                  key={job.id}
                  onClick={() => onJobSelect(job.id, actualIndex)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    "hover:shadow-md hover:border-primary/30",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={cn(
                      "font-medium text-sm line-clamp-1",
                      isSelected && "text-primary"
                    )}>
                      {job.title || 'Untitled Job'}
                    </h4>
                    <Badge className={cn("text-xs", getStatusColor(job.status))}>
                      {job.status}
                    </Badge>
                  </div>

                  {job.startsAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(job.startsAt), 'h:mm a')}
                        {job.endsAt && ` - ${format(new Date(job.endsAt), 'h:mm a')}`}
                      </span>
                    </div>
                  )}

                  {job.address && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{job.address}</span>
                    </div>
                  )}

                  {job.priority && job.priority <= 2 && (
                    <Badge variant="destructive" className="text-xs mt-2">
                      High Priority
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
