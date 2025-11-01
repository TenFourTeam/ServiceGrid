import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Clock, TrendingUp } from 'lucide-react';
import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';

interface Territory {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  templates: RecurringJobTemplate[];
  color: string;
}

interface TerritoryInsightsPanelProps {
  territories: Territory[];
  onClose: () => void;
}

export function TerritoryInsightsPanel({ territories, onClose }: TerritoryInsightsPanelProps) {
  // Calculate insights
  const totalTemplates = territories.reduce((sum, t) => sum + t.templates.length, 0);
  const avgTemplatesPerTerritory = totalTemplates / territories.length;

  // Find most/least busy territories
  const sortedBySize = [...territories].sort((a, b) => b.templates.length - a.templates.length);
  const busiest = sortedBySize[0];
  const lightest = sortedBySize[sortedBySize.length - 1];

  return (
    <Card className="absolute top-4 right-4 w-80 shadow-lg z-10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Territory Insights</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{territories.length}</div>
            <div className="text-xs text-muted-foreground">Territories</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{totalTemplates}</div>
            <div className="text-xs text-muted-foreground">Total Jobs</div>
          </div>
        </div>

        {/* Territory Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Territory Distribution
          </h4>
          {territories.map((territory) => {
            const percentage = Math.round((territory.templates.length / totalTemplates) * 100);
            return (
              <div key={territory.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: territory.color }}
                  />
                  <span>{territory.name}</span>
                </div>
                <Badge variant="secondary">{territory.templates.length} jobs ({percentage}%)</Badge>
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recommendations
          </h4>
          <div className="space-y-2 text-sm">
            {busiest && lightest && busiest.id !== lightest.id && (
              <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-blue-800">
                  <strong>{busiest.name}</strong> has {busiest.templates.length} jobs while{' '}
                  <strong>{lightest.name}</strong> has {lightest.templates.length}.
                  Consider balancing workload across territories.
                </p>
              </div>
            )}
            
            {avgTemplatesPerTerritory > 8 && (
              <div className="p-2 bg-orange-50 rounded-md border border-orange-200">
                <p className="text-orange-800 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  High job density detected. Consider adding more team members.
                </p>
              </div>
            )}

            <div className="p-2 bg-green-50 rounded-md border border-green-200">
              <p className="text-green-800 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Group jobs from the same territory on the same days to minimize travel time.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
