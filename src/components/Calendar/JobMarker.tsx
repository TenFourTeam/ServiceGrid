import { Job } from '@/types';
import { getTeamMemberColor } from '@/utils/teamColors';
import { MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJobDisplayName } from '@/utils/jobDisplay';

interface JobMarkerProps {
  job: Job;
  selectedMemberId?: string | null;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  routeOrder?: number;
  eta?: string;
  isRouteMode?: boolean;
  onClick?: () => void;
}

/**
 * Custom map marker for jobs
 * Color-coded by status, priority, and team member
 */
export function JobMarker({ job, selectedMemberId, isSelected = false, isMultiSelected = false, routeOrder, eta, isRouteMode = false, onClick }: JobMarkerProps) {
  // Determine marker color based on priority and status
  const getMarkerColor = () => {
    // Urgent jobs (high priority)
    if (job.priority && job.priority <= 2) {
      return '#EF4444'; // Red
    }

    // Status-based colors
    switch (job.status) {
      case 'Completed':
        return '#10B981'; // Green
      case 'In Progress':
        return '#F59E0B'; // Yellow
      case 'Scheduled':
      case 'Schedule Approved':
        return '#4F46E5'; // Indigo
      default:
        return '#6B7280'; // Default gray
    }
  };

  const markerColor = getMarkerColor();
  const isPulsing = job.status === 'In Progress';

  // Dynamic sizing based on route mode
  const markerSize = isRouteMode 
    ? 'w-8 h-8' 
    : (isSelected ? 'w-12 h-12' : 'w-10 h-10');
  
  const iconSize = isRouteMode 
    ? 'w-4 h-4' 
    : (isSelected ? 'w-7 h-7' : 'w-6 h-6');

  return (
    <div 
      className="relative cursor-pointer"
      title={getJobDisplayName(job)}
      onClick={onClick}
      style={{ pointerEvents: 'auto' }}
    >
      {/* ETA badge above marker */}
      {eta && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg z-10">
          {eta}
          {routeOrder && (
            <span className="ml-1 opacity-70">#{routeOrder}</span>
          )}
        </div>
      )}

      {/* Selection ring */}
      {isSelected && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
          style={{ 
            backgroundColor: markerColor, 
            opacity: 0.3,
            width: '56px',
            height: '56px',
            left: '-8px',
            top: '-8px'
          }}
        />
      )}

      {isPulsing && (
        <div 
          className="absolute inset-0 rounded-full animate-ping pointer-events-none"
          style={{ backgroundColor: markerColor, opacity: 0.4 }}
        />
      )}
      
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full shadow-lg border-2 transition-all",
          isRouteMode && markerSize,
          !isRouteMode && (isSelected ? 'w-12 h-12 border-white border-4' : 'w-10 h-10 border-white'),
          isMultiSelected && 'ring-4 ring-primary/50 border-primary'
        )}
        style={{ backgroundColor: markerColor }}
      >
        <MapPin className={cn('text-white', iconSize)} />
      </div>

      {/* Multi-select checkmark overlay */}
      {isMultiSelected && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center border-2 border-background shadow-lg">
          <Check className="h-3 w-3" />
        </div>
      )}

      {/* Priority badge - only show when not in route mode */}
      {!eta && job.priority && (
        <div
          className={`absolute -top-1 -right-1 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold ${
            isSelected ? 'w-6 h-6' : 'w-5 h-5'
          }`}
          style={{ borderColor: markerColor, color: markerColor }}
        >
          {job.priority}
        </div>
      )}
    </div>
  );
}
