import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Clock, MapPin, Sparkles, X } from 'lucide-react';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useTravelTimes } from '@/hooks/useTravelTimes';
import { calculateRouteMetrics, RouteMetrics } from '@/utils/calculateRouteMetrics';
import { RoutePreviewPanel } from './RoutePreviewPanel';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RouteOptimizerProps {
  templates: RecurringJobTemplate[];
  onClose: () => void;
  onSaveOrder?: (orderedTemplates: RecurringJobTemplate[]) => void;
}

interface SortableItemProps {
  template: RecurringJobTemplate;
  index: number;
}

function SortableItem({ template, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <Card className="p-3 hover:border-primary/50 transition-colors">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Order Badge */}
          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
            {index + 1}
          </Badge>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{template.title}</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {template.estimated_duration_minutes}m
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{template.customer?.name}</span>
              </span>
            </div>
          </div>

          {/* Pattern Badge */}
          <Badge variant="secondary" className="text-xs">
            {template.recurrence_pattern}
          </Badge>
        </div>
      </Card>
    </div>
  );
}

/**
 * Interactive drag-and-drop route optimizer with live metrics
 */
export function RouteOptimizer({ templates, onClose, onSaveOrder }: RouteOptimizerProps) {
  const [orderedTemplates, setOrderedTemplates] = useState<RecurringJobTemplate[]>(templates);
  const [showMetrics, setShowMetrics] = useState(true);
  const [aiInsights, setAiInsights] = useState<{
    reasoning: string;
    timeSaved: number;
    suggestions: string[];
  } | null>(null);
  const [showInsightsDialog, setShowInsightsDialog] = useState(false);

  const { businessId } = useBusinessContext();
  const { mutate: optimizeRoute, isPending: isOptimizing } = useRouteOptimization();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Extract addresses for geocoding
  const addresses = useMemo(() => 
    orderedTemplates
      .filter(t => t.address)
      .map(t => t.address!),
    [orderedTemplates]
  );

  // Get coordinates
  const { data: coordinates } = useGeocoding(addresses);

  // Calculate travel times between consecutive jobs
  const origins = addresses.slice(0, -1);
  const destinations = addresses.slice(1);
  const { data: travelTimes, isLoading: isLoadingTravel } = useTravelTimes(
    origins,
    destinations,
    origins.length > 0 && destinations.length > 0
  );

  // Calculate route metrics
  const metrics = useMemo<RouteMetrics | null>(() => {
    if (!travelTimes || travelTimes.length === 0) return null;
    return calculateRouteMetrics(orderedTemplates, travelTimes);
  }, [orderedTemplates, travelTimes]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedTemplates((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAIOptimize = () => {
    if (!businessId) {
      toast.error('Business context not found');
      return;
    }

    optimizeRoute(
      { 
        businessId, 
        templates: orderedTemplates,
        constraints: {
          maxDailyHours: 8,
          startTime: '08:00',
          endTime: '17:00'
        }
      },
      {
        onSuccess: (result) => {
          setOrderedTemplates(result.optimizedTemplates);
          setAiInsights({
            reasoning: result.reasoning,
            timeSaved: result.estimatedTimeSaved,
            suggestions: result.suggestions
          });
          setShowInsightsDialog(true);
        }
      }
    );
  };

  const handleSave = () => {
    if (onSaveOrder) {
      onSaveOrder(orderedTemplates);
      toast.success('Route order saved successfully');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto h-full flex flex-col py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Route Optimizer</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Drag jobs to reorder • Optimize travel time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowMetrics(!showMetrics)}>
              {showMetrics ? 'Hide' : 'Show'} Metrics
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAIOptimize}
              disabled={isOptimizing || orderedTemplates.length < 2}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isOptimizing ? 'Optimizing...' : 'AI Optimize'}
            </Button>
            <Button onClick={handleSave}>
              Save Order
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Panel - Sortable List */}
          <div className="flex-1 overflow-y-auto pr-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedTemplates.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedTemplates.map((template, index) => (
                  <SortableItem
                    key={template.id}
                    template={template}
                    index={index}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Right Panel - Metrics */}
          {showMetrics && metrics && (
            <div className="w-80 flex-shrink-0">
              <RoutePreviewPanel
                metrics={metrics}
                onClose={() => setShowMetrics(false)}
                onOptimize={handleAIOptimize}
              />
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoadingTravel && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <Card className="px-4 py-2 text-sm text-muted-foreground">
              Calculating travel times...
            </Card>
          </div>
        )}
      </div>

      {/* AI Insights Dialog */}
      <Dialog open={showInsightsDialog} onOpenChange={setShowInsightsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Route Optimization Results
            </DialogTitle>
            <DialogDescription>
              Your route has been optimized for maximum efficiency
            </DialogDescription>
          </DialogHeader>

          {aiInsights && (
            <div className="space-y-4">
              {/* Time Saved */}
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Estimated Time Saved</div>
                <div className="text-3xl font-bold text-primary">
                  {aiInsights.timeSaved} minutes
                </div>
              </div>

              {/* AI Reasoning */}
              <div>
                <div className="text-sm font-medium mb-2">Optimization Strategy</div>
                <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                  {aiInsights.reasoning}
                </div>
              </div>

              {/* Suggestions */}
              {aiInsights.suggestions.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Additional Suggestions</div>
                  <ul className="space-y-2">
                    {aiInsights.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={() => setShowInsightsDialog(false)} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
