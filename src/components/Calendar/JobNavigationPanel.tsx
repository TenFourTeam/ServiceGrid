import { useMemo, useState, useEffect } from 'react';
import { Job } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, Search, X, ChevronRight, ChevronLeft, List, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getJobDisplayName } from '@/utils/jobDisplay';

interface JobNavigationPanelProps {
  jobs: Array<{ job: Job; coords: { lat: number; lng: number } }>;
  selectedJobId: string | null;
  currentJobIndex: number;
  onJobSelect: (jobId: string, index: number) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  isMultiSelectMode?: boolean;
  selectedJobIds?: Set<string>;
  onToggleSelection?: (jobId: string) => void;
}

/**
 * Resizable sidebar panel showing list of jobs for easy navigation
 * Allows filtering, searching, and quick selection of jobs on the map
 * Can be collapsed to a minimal state to avoid obstructing the map
 */
export function JobNavigationPanel({ 
  jobs, 
  selectedJobId, 
  currentJobIndex,
  onJobSelect,
  isCollapsed,
  onCollapsedChange,
  isMultiSelectMode = false,
  selectedJobIds = new Set(),
  onToggleSelection
}: JobNavigationPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('jobNavigationPanelCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

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

  // Collapsed state - minimal vertical bar
  if (isCollapsed) {
    return (
      <div className="h-full w-full bg-background border-r border-border flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange(false)}
          className="h-8 w-8 p-0"
          title="Expand job list"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="writing-mode-vertical-rl text-sm font-medium text-muted-foreground flex items-center gap-2">
            <List className="h-4 w-4 rotate-90" />
            <span className="rotate-180">JOBS ({jobs.length})</span>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state - full job list
  return (
    <div className="h-full w-full bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">
            Jobs ({filteredJobs.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(true)}
            className="h-6 w-6 p-0"
            title="Collapse panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
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
      </div>

      {/* Job List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? 'No jobs found' : 'No jobs for this date'}
            </div>
          ) : (
            filteredJobs.map(({ job }, index) => {
              const isSelected = job.id === selectedJobId;
              const isMultiSelected = selectedJobIds.has(job.id);
              const actualIndex = jobs.findIndex(j => j.job.id === job.id);
              
              return (
                <button
                  key={job.id}
                  onClick={() => {
                    if (isMultiSelectMode && onToggleSelection) {
                      onToggleSelection(job.id);
                    } else {
                      onJobSelect(job.id, actualIndex);
                    }
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all relative",
                    "hover:shadow-md hover:border-primary/30",
                    isMultiSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border bg-card"
                  )}
                >
                  {isMultiSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={cn(
                      "font-medium text-sm line-clamp-1",
                      isMultiSelected ? "text-primary" : isSelected && "text-primary"
                    )}>
                      {getJobDisplayName(job)}
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
        </div>
      </ScrollArea>
    </div>
  );
}
