import { useMemo } from 'react';
import { Job } from '@/types';
import { useBusinessMembersData } from '@/hooks/useBusinessMembers';
import { getTeamMemberColor } from '@/utils/teamColors';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MapLegendProps {
  jobs: Job[];
  selectedMemberId?: string | null;
}

/**
 * Map legend showing team member colors and job counts
 */
export function MapLegend({ jobs, selectedMemberId }: MapLegendProps) {
  const { data: members = [] } = useBusinessMembersData();

  // Calculate job counts per team member
  const memberJobCounts = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; color: string }>();

    jobs.forEach(job => {
      const assignedMembers = job.assignedMembers || [];
      assignedMembers.forEach(member => {
        const existing = counts.get(member.id) || {
          name: member.name || member.email || 'Unknown',
          count: 0,
          color: getTeamMemberColor(member.id),
        };
        counts.set(member.id, { ...existing, count: existing.count + 1 });
      });
    });

    return Array.from(counts.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [jobs, members]);

  if (memberJobCounts.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-10">
      <Card className="bg-background/95 backdrop-blur-sm">
        <CardContent className="p-3 space-y-2">
          <h4 className="text-sm font-semibold text-foreground mb-2">Team Members</h4>
          
          {memberJobCounts.map(({ id, name, count, color }) => (
            <div 
              key={id}
              className="flex items-center gap-2 text-sm"
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-foreground flex-1">{name}</span>
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </div>
          ))}

          <div className="pt-2 mt-2 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>High Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span>Scheduled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
