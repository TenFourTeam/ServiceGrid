import { RecurringJobTemplate, RecurrencePattern } from '@/hooks/useRecurringJobs';
import { MapPin, Calendar, RefreshCw } from 'lucide-react';

interface RecurringJobMarkerProps {
  template: RecurringJobTemplate;
}

/**
 * Custom map marker for recurring job templates
 * Color-coded by recurrence pattern with frequency badges
 */
export function RecurringJobMarker({ template }: RecurringJobMarkerProps) {
  // Determine marker color and icon based on recurrence pattern
  const getMarkerStyle = () => {
    switch (template.recurrence_pattern) {
      case 'daily':
        return {
          color: '#3B82F6', // Blue
          icon: RefreshCw,
          label: 'Daily'
        };
      case 'weekly':
        return {
          color: '#10B981', // Green
          icon: Calendar,
          label: 'Weekly'
        };
      case 'biweekly':
        return {
          color: '#8B5CF6', // Purple
          icon: Calendar,
          label: 'Bi-weekly'
        };
      case 'monthly':
        return {
          color: '#F59E0B', // Orange
          icon: Calendar,
          label: 'Monthly'
        };
      default:
        return {
          color: '#6B7280', // Gray
          icon: MapPin,
          label: 'Custom'
        };
    }
  };

  const { color, icon: Icon, label } = getMarkerStyle();
  const isActive = template.is_active;

  return (
    <div 
      className="relative"
      title={`${template.title || 'Untitled Template'} - ${label}`}
    >
      {isActive && (
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ backgroundColor: color, opacity: 0.3 }}
        />
      )}
      
      <div
        className="relative flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white"
        style={{ 
          backgroundColor: isActive ? color : '#9CA3AF',
          opacity: isActive ? 1 : 0.5
        }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Pattern badge */}
      <div
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-white border text-[10px] font-bold whitespace-nowrap shadow-sm"
        style={{ borderColor: color, color: color }}
      >
        {label}
      </div>

      {/* Inactive overlay */}
      {!isActive && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white" 
          title="Inactive"
        />
      )}
    </div>
  );
}
