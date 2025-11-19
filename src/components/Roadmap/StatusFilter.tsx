import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RoadmapFeature } from '@/hooks/useRoadmapFeatures';

interface StatusFilterProps {
  features: RoadmapFeature[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

const statusConfig = [
  { value: 'all', label: 'All Features', color: 'default' },
  { value: 'under-consideration', label: 'Under Consideration', color: 'secondary' },
  { value: 'planned', label: 'Planned', color: 'default' },
  { value: 'in-progress', label: 'In Progress', color: 'warning' },
  { value: 'shipped', label: 'Shipped', color: 'success' },
  { value: 'unlikely', label: 'Unlikely', color: 'destructive' },
] as const;

export function StatusFilter({ features, selectedStatus, onStatusChange }: StatusFilterProps) {
  const getCount = (status: string) => {
    if (status === 'all') return features.length;
    return features.filter((f) => f.status === status).length;
  };

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium mb-3">Status</h3>
      {statusConfig.map((status) => {
        const count = getCount(status.value);
        const isActive = selectedStatus === status.value;

        return (
          <button
            key={status.value}
            onClick={() => onStatusChange(status.value)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50 text-muted-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
              {status.label}
            </span>
            <Badge variant="secondary" className="ml-2">
              {count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
