import { useMemo, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Job } from '@/types';
import { useGeocoding } from '@/hooks/useGeocoding';
import { JobMarker } from './JobMarker';
import { JobInfoWindow } from './JobInfoWindow';
import { MapLegend } from './MapLegend';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/Button';
import { MapPin } from 'lucide-react';

interface RouteMapViewProps {
  date: Date;
  jobs: Job[];
  selectedMemberId?: string | null;
  onJobClick?: (job: Job) => void;
}

/**
 * Interactive map view showing job locations with markers
 * Features: geocoding, custom markers, info windows, team color coding
 */
export function RouteMapView({ date, jobs, selectedMemberId, onJobClick }: RouteMapViewProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of USA as default

  // Check if Google Maps API key is configured
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4 max-w-md p-8">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Google Maps Not Configured</h3>
          <p className="text-sm text-muted-foreground">
            Add your Google Maps API key to the <code className="bg-muted px-1 py-0.5 rounded">.env</code> file to enable route visualization.
          </p>
          <p className="text-xs text-muted-foreground">
            Set <code className="bg-muted px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> with your API key.
          </p>
          <Button 
            variant="secondary" 
            onClick={() => window.open('https://console.cloud.google.com/google/maps-apis', '_blank', 'noopener,noreferrer')}
          >
            Get API Key
          </Button>
        </div>
      </div>
    );
  }

  // Extract unique addresses from jobs
  const addresses = useMemo(() => {
    return jobs
      .filter(j => j.address)
      .map(j => j.address!);
  }, [jobs]);

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

  // Filter jobs with valid coordinates
  const jobsWithCoords = useMemo(() => {
    if (!coordinates) return [];
    
    return jobs
      .map(job => {
        if (!job.address) return null;
        const coords = coordinates.get(job.address);
        if (!coords) return null;
        return { job, coords };
      })
      .filter(Boolean) as Array<{ job: Job; coords: { lat: number; lng: number } }>;
  }, [jobs, coordinates]);

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

  if (jobsWithCoords.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-muted-foreground">No Jobs to Display</h3>
          <p className="text-sm text-muted-foreground">
            Add jobs with addresses to see them on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full">
        <Map
          mapId="route-map"
          center={mapCenter}
          zoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          {jobsWithCoords.map(({ job, coords }) => (
            <AdvancedMarker
              key={job.id}
              position={coords}
              onClick={() => {
                setSelectedJob(job);
                if (onJobClick) onJobClick(job);
              }}
            >
              <JobMarker job={job} selectedMemberId={selectedMemberId} />
            </AdvancedMarker>
          ))}

          {selectedJob && (
            <JobInfoWindow
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
            />
          )}
        </Map>

        <MapLegend jobs={jobs} selectedMemberId={selectedMemberId} />
      </div>
    </APIProvider>
  );
}
