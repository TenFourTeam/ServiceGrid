import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Clock, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import { RouteMetrics } from '@/utils/calculateRouteMetrics';

interface RoutePreviewPanelProps {
  metrics: RouteMetrics;
  onClose: () => void;
  onOptimize?: () => void;
}

/**
 * Displays comprehensive route metrics and optimization suggestions
 */
export function RoutePreviewPanel({ metrics, onClose, onOptimize }: RoutePreviewPanelProps) {
  const getEfficiencyColor = (score: number) => {
    if (score >= 75) return 'bg-success text-success-foreground';
    if (score >= 50) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <Card className="absolute top-4 right-4 w-80 max-h-[80vh] overflow-y-auto shadow-xl z-20 animate-in slide-in-from-right">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">Route Metrics</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Analysis of {metrics.segments.length + 1} jobs
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mr-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Efficiency Score */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Efficiency Score</span>
          </div>
          <Badge className={getEfficiencyColor(metrics.efficiencyScore)}>
            {metrics.efficiencyScore}%
          </Badge>
        </div>

        {/* Time Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Job Time
            </span>
            <span className="font-medium">{formatTime(metrics.totalJobTime)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Travel Time
            </span>
            <span className="font-medium">{formatTime(metrics.totalTravelTime)}</span>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="font-medium">Total Distance</span>
            <span className="font-medium">{metrics.totalDistance.toFixed(1)} mi</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total Time</span>
            <span className="font-medium">
              {formatTime(metrics.totalJobTime + metrics.totalTravelTime)}
            </span>
          </div>
        </div>

        {/* Route Segments */}
        {metrics.segments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Route Segments</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {metrics.segments.map((segment, idx) => (
                <div 
                  key={idx}
                  className="text-xs p-2 rounded bg-muted/30 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">Leg {idx + 1}</span>
                  </div>
                  <div className="flex items-center justify-between pl-4">
                    <span className="text-muted-foreground">{formatTime(segment.travelTime)}</span>
                    <span className="text-muted-foreground">{segment.distance.toFixed(1)} mi</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {metrics.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Suggestions
            </h4>
            <div className="space-y-2">
              {metrics.suggestions.map((suggestion, idx) => (
                <div 
                  key={idx}
                  className="text-xs p-2 rounded bg-warning/10 text-warning-foreground border border-warning/20"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimize Button */}
        {onOptimize && metrics.efficiencyScore < 85 && (
          <Button 
            className="w-full" 
            onClick={onOptimize}
            variant="default"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Optimize Route
          </Button>
        )}
      </div>
    </Card>
  );
}
