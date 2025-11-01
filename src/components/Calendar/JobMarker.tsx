import { Job } from '@/types';
import { getTeamMemberColor } from '@/utils/teamColors';
import { MapPin } from 'lucide-react';

interface JobMarkerProps {
  job: Job;
  selectedMemberId?: string | null;
}

/**
 * Custom map marker for jobs
 * Color-coded by status, priority, and team member
 */
export function JobMarker({ job, selectedMemberId }: JobMarkerProps) {
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

  return (
    <div 
      className="relative"
      title={`${job.title || 'Untitled Job'}`}
    >
      {isPulsing && (
        <div 
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: markerColor, opacity: 0.4 }}
        />
      )}
      
      <div
        className="relative flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white"
        style={{ backgroundColor: markerColor }}
      >
        <MapPin className="w-6 h-6 text-white" />
      </div>

      {/* Job number badge */}
      <div
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold"
        style={{ borderColor: markerColor, color: markerColor }}
      >
        {job.priority || ''}
      </div>
    </div>
  );
}
