import { useMemo, useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Job } from '@/types';
import { useGeocoding } from '@/hooks/useGeocoding';
import { JobMarker } from './JobMarker';
import { JobInfoWindow } from './JobInfoWindow';
import { JobNavigationPanel } from './JobNavigationPanel';
import { MapLegend } from './MapLegend';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/Button';
import { MapPin, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // San Francisco as default
  const [mapZoom, setMapZoom] = useState(11);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [currentJobIndex, setCurrentJobIndex] = useState<number>(0);
  const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(true);

  // Check if Google Maps API key is configured
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Debug: Log the API key value (first 10 chars only for security)
  console.log('[RouteMapView] API Key status:', {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    preview: apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined',
    envValue: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  if (!apiKey || apiKey.trim() === '') {
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

  // Focus on a specific job by centering map and opening info window
  const focusJob = (jobId: string) => {
    const jobWithCoords = jobsWithCoords.find(j => j.job.id === jobId);
    if (!jobWithCoords) return;
    
    setSelectedJobId(jobId);
    setMapCenter(jobWithCoords.coords);
    setMapZoom(15); // Closer zoom for focused view
    setSelectedJob(jobWithCoords.job);
  };

  // Navigate to next or previous job
  const navigateToJob = (direction: 'next' | 'prev') => {
    if (jobsWithCoords.length === 0) return;
    
    const newIndex = direction === 'next' 
      ? (currentJobIndex + 1) % jobsWithCoords.length
      : (currentJobIndex - 1 + jobsWithCoords.length) % jobsWithCoords.length;
    
    setCurrentJobIndex(newIndex);
    focusJob(jobsWithCoords[newIndex].job.id);
  };

  // Handle job selection from navigation panel
  const handleJobSelect = (jobId: string, index: number) => {
    setCurrentJobIndex(index);
    focusJob(jobId);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateToJob('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToJob('prev');
      } else if (e.key === 'Escape') {
        setSelectedJob(null);
        setSelectedJobId(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentJobIndex, jobsWithCoords]);

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

  console.log('[RouteMapView] Rendering map with:', {
    mapCenter,
    jobsCount: jobsWithCoords.length,
    mapId: 'd174fd11e8cacedb35e319da'
  });

  return (
    <APIProvider apiKey={apiKey} onLoad={() => console.log('[RouteMapView] Google Maps API loaded')}>
      <div className="relative w-full h-full min-h-[400px]">
        <Map
          mapId="d174fd11e8cacedb35e319da"
          center={mapCenter}
          zoom={mapZoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
          onCameraChanged={() => console.log('[RouteMapView] Camera changed')}
        >
          {jobsWithCoords.map(({ job, coords }, index) => (
            <AdvancedMarker
              key={job.id}
              position={coords}
              onClick={() => {
                setSelectedJob(job);
                setSelectedJobId(job.id);
                setCurrentJobIndex(index);
                if (onJobClick) onJobClick(job);
              }}
            >
              <JobMarker 
                job={job} 
                selectedMemberId={selectedMemberId}
                isSelected={job.id === selectedJobId}
              />
            </AdvancedMarker>
          ))}

          {selectedJob && (
            <JobInfoWindow
              job={selectedJob}
              jobNumber={currentJobIndex + 1}
              totalJobs={jobsWithCoords.length}
              onClose={() => {
                setSelectedJob(null);
                setSelectedJobId(null);
              }}
              onNavigate={navigateToJob}
            />
          )}
        </Map>

        {/* Navigation Panel */}
        {isNavigationPanelOpen && jobsWithCoords.length > 0 && (
          <JobNavigationPanel
            jobs={jobsWithCoords}
            selectedJobId={selectedJobId}
            currentJobIndex={currentJobIndex}
            onJobSelect={handleJobSelect}
            onClose={() => setIsNavigationPanelOpen(false)}
          />
        )}

        {/* Toggle Navigation Panel Button */}
        {!isNavigationPanelOpen && jobsWithCoords.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsNavigationPanelOpen(true)}
            className="absolute top-4 left-4 z-10 shadow-lg"
          >
            <List className="h-4 w-4 mr-2" />
            Jobs ({jobsWithCoords.length})
          </Button>
        )}

        {/* Navigation Controls */}
        {jobsWithCoords.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToJob('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
              {currentJobIndex + 1} / {jobsWithCoords.length}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToJob('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <MapLegend jobs={jobs} selectedMemberId={selectedMemberId} />
      </div>
    </APIProvider>
  );
}
