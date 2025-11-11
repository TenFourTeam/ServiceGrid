import { useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { JobMarker } from '@/components/Calendar/JobMarker';
import { JobInfoWindow } from '@/components/Calendar/JobInfoWindow';
import { MapCircle } from '@/components/ui/map-circle';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Job } from '@/types';
import type { RadiusFilter } from '@/hooks/useJobLocationQuery';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin } from 'lucide-react';

interface WorkOrdersMapViewProps {
  jobs: Array<Job & { distance_meters?: number }>;
  locationFilter: RadiusFilter | null;
  onJobClick?: (job: Job) => void;
}

/**
 * Map view for Work Orders with location filtering visualization
 * Shows jobs as markers with optional radius circle overlay
 */
export function WorkOrdersMapView({ jobs, locationFilter, onJobClick }: WorkOrdersMapViewProps) {
  const { data: apiKey } = useGoogleMapsApiKey();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Geocode all job addresses
  const addresses = useMemo(() => 
    jobs.map(j => j.address).filter(Boolean) as string[], 
    [jobs]
  );
  const geocodingResults = useGeocoding(addresses);

  // Create markers with coordinates
  const markers = useMemo(() => {
    return jobs.map(job => {
      const geocoded = geocodingResults[job.address || ''];
      return {
        job,
        lat: geocoded?.lat ?? null,
        lng: geocoded?.lng ?? null,
      };
    }).filter(m => m.lat !== null && m.lng !== null) as Array<{
      job: Job & { distance_meters?: number };
      lat: number;
      lng: number;
    }>;
  }, [jobs, geocodingResults]);

  // Calculate map bounds and center
  const { center, zoom } = useMemo(() => {
    if (locationFilter) {
      // Center on filter location
      return {
        center: { lat: locationFilter.latitude, lng: locationFilter.longitude },
        zoom: 12,
      };
    }

    if (markers.length === 0) {
      return { center: { lat: 32.7763, lng: -96.7969 }, zoom: 10 }; // Dallas default
    }

    // Calculate bounds from markers
    const lats = markers.map(m => m.lat);
    const lngs = markers.map(m => m.lng);
    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;

    return {
      center: { lat: centerLat, lng: centerLng },
      zoom: 11,
    };
  }, [markers, locationFilter]);

  const selectedJob = useMemo(() => 
    markers.find(m => m.job.id === selectedJobId)?.job ?? null,
    [markers, selectedJobId]
  );

  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            {locationFilter 
              ? 'No jobs found within the selected radius. Try expanding your search area.'
              : 'No jobs with valid addresses to display on the map.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId="work-orders-map"
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="h-full w-full rounded-lg"
      >
        {/* Location filter radius circle */}
        {locationFilter && (
          <MapCircle
            center={{ lat: locationFilter.latitude, lng: locationFilter.longitude }}
            radius={locationFilter.radiusMeters}
            strokeColor="hsl(var(--primary))"
            strokeOpacity={0.8}
            strokeWeight={2}
            fillColor="hsl(var(--primary))"
            fillOpacity={0.15}
          />
        )}

        {/* Job markers */}
        {markers.map(({ job, lat, lng }) => (
          <AdvancedMarker
            key={job.id}
            position={{ lat, lng }}
            onClick={() => {
              setSelectedJobId(job.id);
              onJobClick?.(job);
            }}
          >
            <JobMarker
              job={job as any}
              isSelected={selectedJobId === job.id}
            />
          </AdvancedMarker>
        ))}

        {/* Info window for selected job */}
        {selectedJob && (
          <JobInfoWindow
            job={selectedJob as any}
            onClose={() => setSelectedJobId(null)}
            onViewDetails={() => onJobClick?.(selectedJob)}
          />
        )}
      </Map>

      {/* Distance legend when location filter is active */}
      {locationFilter && (
        <Card className="absolute bottom-4 left-4 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
              <span className="text-muted-foreground">
                {(locationFilter.radiusMeters / 1000).toFixed(1)} km radius
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </APIProvider>
  );
}
