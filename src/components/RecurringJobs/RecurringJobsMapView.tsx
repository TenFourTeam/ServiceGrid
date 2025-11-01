import { useMemo, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';
import { useGeocoding } from '@/hooks/useGeocoding';
import { RecurringJobMarker } from './RecurringJobMarker';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecurringJobsMapViewProps {
  templates: RecurringJobTemplate[];
  onTemplateClick?: (template: RecurringJobTemplate) => void;
}

/**
 * Interactive map view showing recurring job templates with pattern-based markers
 * Features: geocoding, custom markers, info windows, pattern color coding
 */
export function RecurringJobsMapView({ templates, onTemplateClick }: RecurringJobsMapViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<RecurringJobTemplate | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of USA as default

  // Extract unique addresses from templates
  const addresses = useMemo(() => {
    return templates
      .filter(t => t.address)
      .map(t => t.address!);
  }, [templates]);

  // Geocode all addresses
  const { data: coordinates, isLoading } = useGeocoding(addresses);

  // Calculate map bounds to fit all markers
  const bounds = useMemo(() => {
    if (!coordinates || coordinates.size === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    coordinates.forEach(({ lat, lng }) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    // Update map center
    if (isFinite(minLat) && isFinite(maxLat) && isFinite(minLng) && isFinite(maxLng)) {
      setMapCenter({
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2,
      });
    }

    return {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng,
    };
  }, [coordinates]);

  // Filter templates with valid coordinates
  const templatesWithCoords = useMemo(() => {
    if (!coordinates) return [];
    
    return templates
      .map(template => {
        if (!template.address) return null;
        const coords = coordinates.get(template.address);
        if (!coords) return null;
        return { template, coords };
      })
      .filter(Boolean) as Array<{ template: RecurringJobTemplate; coords: { lat: number; lng: number } }>;
  }, [templates, coordinates]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (templatesWithCoords.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-muted-foreground">No Templates to Display</h3>
          <p className="text-sm text-muted-foreground">
            Add recurring job templates with addresses to see them on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <div className="relative w-full h-full">
        <Map
          mapId="recurring-jobs-map"
          center={mapCenter}
          zoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          {templatesWithCoords.map(({ template, coords }) => (
            <AdvancedMarker
              key={template.id}
              position={coords}
              onClick={() => {
                setSelectedTemplate(template);
                if (onTemplateClick) onTemplateClick(template);
              }}
            >
              <RecurringJobMarker template={template} />
            </AdvancedMarker>
          ))}
        </Map>

        {/* Info Window */}
        {selectedTemplate && (
          <Card className="absolute top-4 right-4 w-80 p-4 shadow-lg z-10">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedTemplate.title || 'Untitled Template'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.recurrence_pattern.replace('_', ' ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {selectedTemplate.notes && (
                <p className="text-sm">{selectedTemplate.notes}</p>
              )}

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Address:</span>
                  <p className="text-muted-foreground">{selectedTemplate.address}</p>
                </div>

                {selectedTemplate.estimated_duration_minutes && (
                  <div>
                    <span className="font-medium">Duration:</span>
                    <span className="text-muted-foreground ml-2">
                      {selectedTemplate.estimated_duration_minutes} min
                    </span>
                  </div>
                )}

                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 ${selectedTemplate.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {selectedTemplate.assigned_members && selectedTemplate.assigned_members.length > 0 && (
                  <div>
                    <span className="font-medium">Assigned:</span>
                    <span className="text-muted-foreground ml-2">
                      {selectedTemplate.assigned_members.length} team member(s)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Legend */}
        <Card className="absolute bottom-4 left-4 p-3 shadow-lg">
          <h4 className="text-sm font-semibold mb-2">Recurrence Patterns</h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
              <span>Daily</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span>Weekly</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
              <span>Bi-weekly</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span>Monthly</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#9CA3AF]" />
              <span>Inactive</span>
            </div>
          </div>
        </Card>
      </div>
    </APIProvider>
  );
}
