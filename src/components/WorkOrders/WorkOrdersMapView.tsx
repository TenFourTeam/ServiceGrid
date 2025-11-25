import { useMemo, useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Job } from '@/types';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import { JobMarker } from '../Calendar/JobMarker';
import { JobInfoWindow } from '../Calendar/JobInfoWindow';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle, Route, X, Loader2 } from 'lucide-react';
import { MapCircle } from '@/components/ui/map-circle';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { useJobRouteOptimization } from '@/hooks/useJobRouteOptimization';
import { useRouteDirections } from '@/hooks/useRouteDirections';
import { RouteDirectionsDialog } from './RouteDirectionsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { RadiusFilter } from '@/hooks/useJobLocationQuery';

interface WorkOrdersMapViewProps {
  jobs: Job[];
  locationFilter: RadiusFilter | null;
  onJobClick?: (job: Job) => void;
  isRoutePlanningMode?: boolean;
}

export function WorkOrdersMapView({ 
  jobs, 
  locationFilter, 
  onJobClick,
  isRoutePlanningMode = false 
}: WorkOrdersMapViewProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [mapZoom, setMapZoom] = useState(11);
  
  // Multi-selection state for route planning
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [startingAddress, setStartingAddress] = useState('');
  const [startingCoords, setStartingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { getPlaceDetails } = usePlacesAutocomplete();
  
  // Route optimization
  const { mutate: optimizeRoute, isPending: isOptimizing } = useJobRouteOptimization();
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);
  const [directionsWaypoints, setDirectionsWaypoints] = useState<any[]>([]);
  const [showDirectionsDialog, setShowDirectionsDialog] = useState(false);
  
  // Fetch directions when waypoints are ready
  const { data: directions, isLoading: loadingDirections } = useRouteDirections(
    directionsWaypoints,
    { enabled: directionsWaypoints.length >= 2 }
  );

  const { data: apiKey, isLoading: isLoadingApiKey, error: apiKeyError } = useGoogleMapsApiKey();

  // Toggle job selection
  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // Handle place selection for starting location
  const handleStartingPlaceSelect = async (placeId: string, description: string) => {
    setStartingAddress(description);
    
    const placeDetails = await getPlaceDetails(placeId);
    if (placeDetails) {
      setStartingCoords({ lat: placeDetails.lat, lng: placeDetails.lng });
    } else {
      toast.error('Could not get coordinates for this location');
    }
  };

  // Handle route optimization
  const handleOptimizeRoute = () => {
    const selectedJobs = jobs.filter(job => selectedJobIds.has(job.id));
    
    if (selectedJobs.length < 2) {
      toast.error('Select at least 2 jobs to optimize route');
      return;
    }
    
    // Use custom starting location, or location filter center, or undefined
    const startLocation = startingCoords ? {
      address: startingAddress,
      lat: startingCoords.lat,
      lng: startingCoords.lng
    } : (locationFilter ? {
      address: 'Filter Center',
      lat: locationFilter.latitude,
      lng: locationFilter.longitude
    } : undefined);
    
    optimizeRoute({
      businessId: selectedJobs[0].businessId,
      jobs: selectedJobs,
      startLocation,
      constraints: {
        startTime: '08:00',
        endTime: '17:00'
      }
    }, {
      onSuccess: (result) => {
        setOptimizationResult(result);
        setShowOptimizationDialog(true);
        
        // Prepare waypoints for directions
        const waypoints = result.optimizedJobs.map((job: Job) => ({
          lat: job.latitude,
          lng: job.longitude,
          address: job.address,
          jobId: job.id
        }));
        
        setDirectionsWaypoints(waypoints);
      }
    });
  };

  // Clear selection and exit planning mode
  const clearSelection = () => {
    setSelectedJobIds(new Set());
    setStartingAddress('');
    setStartingCoords(null);
  };

  // Extract unique addresses from jobs
  const addresses = useMemo(() => {
    if (!apiKey) return [];
    return jobs
      .filter(j => j.address)
      .map(j => j.address!);
  }, [jobs, apiKey]);

  // Geocode all addresses
  const { data: coordinates, isLoading } = useGeocoding(addresses);

  // Create jobs with coordinates
  const jobsWithCoords = useMemo(() => {
    if (!coordinates) return [];
    
    return jobs
      .map(job => {
        const coords = job.address ? coordinates.get(job.address) : null;
        return coords ? { job, coords } : null;
      })
      .filter((item): item is { job: Job; coords: { lat: number; lng: number } } => item !== null);
  }, [jobs, coordinates]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    if (locationFilter) {
      return {
        center: { lat: locationFilter.latitude, lng: locationFilter.longitude },
        zoom: 12
      };
    }

    if (jobsWithCoords.length === 0) {
      return { center: mapCenter, zoom: mapZoom };
    }

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    jobsWithCoords.forEach(({ coords }) => {
      minLat = Math.min(minLat, coords.lat);
      maxLat = Math.max(maxLat, coords.lat);
      minLng = Math.min(minLng, coords.lng);
      maxLng = Math.max(maxLng, coords.lng);
    });

    return {
      center: {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2
      },
      zoom: 11
    };
  }, [jobsWithCoords, locationFilter, mapCenter, mapZoom]);

  if (isLoadingApiKey || !apiKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (apiKeyError) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load map</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (jobsWithCoords.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No jobs with addresses to display</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <APIProvider apiKey={apiKey}>
        <Map
          mapId="work-orders-map"
          defaultCenter={bounds.center}
          defaultZoom={bounds.zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="h-full w-full"
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
          {jobsWithCoords.map(({ job, coords }) => (
            <AdvancedMarker
              key={job.id}
              position={coords}
              onClick={() => {
                if (isRoutePlanningMode) {
                  toggleJobSelection(job.id);
                } else {
                  setSelectedJob(job);
                  if (onJobClick) onJobClick(job);
                }
              }}
            >
              <JobMarker 
                job={job} 
                isSelected={selectedJob?.id === job.id}
                isMultiSelected={selectedJobIds.has(job.id)}
              />
            </AdvancedMarker>
          ))}

          {selectedJob && !isRoutePlanningMode && (
            <JobInfoWindow job={selectedJob} onClose={() => setSelectedJob(null)} />
          )}

          {/* Multi-select toolbar */}
          {isRoutePlanningMode && (
            <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-10 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedJobIds.size} selected
                </span>
                <Button 
                  onClick={handleOptimizeRoute}
                  disabled={selectedJobIds.size < 2 || isOptimizing}
                  size="sm"
                >
                  {isOptimizing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Route className="h-4 w-4 mr-2" />
                  )}
                  Optimize Route
                </Button>
                <Button onClick={clearSelection} size="sm" variant="outline">
                  Clear
                </Button>
                <Button onClick={clearSelection} size="sm" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Starting location selector */}
          {isRoutePlanningMode && selectedJobIds.size > 0 && (
            <div className="absolute top-20 left-4 right-4 sm:right-auto z-10 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-3 sm:max-w-sm">
              <label className="text-sm font-medium mb-2 block">
                Starting Location (Optional)
              </label>
              <AddressAutocomplete
                value={startingAddress}
                onChange={setStartingAddress}
                onPlaceSelect={handleStartingPlaceSelect}
                placeholder="Search address..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {startingCoords 
                  ? 'Custom starting location set'
                  : locationFilter 
                    ? 'Will use filter center as starting point'
                    : 'Leave empty to start from first job'}
              </p>
            </div>
          )}
        </Map>
      </APIProvider>

      {/* Optimization Results Dialog */}
      <Dialog open={showOptimizationDialog} onOpenChange={setShowOptimizationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Route Optimization Results</DialogTitle>
            <DialogDescription>
              AI has analyzed your selected jobs and optimized the route
            </DialogDescription>
          </DialogHeader>
          
          {optimizationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Estimated Travel Time</div>
                  <div className="text-2xl font-bold">{Math.round(optimizationResult.estimatedTravelTime)} min</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Time Saved</div>
                  <div className="text-2xl font-bold text-green-600">{Math.round(optimizationResult.estimatedTimeSaved)} min</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">AI Reasoning</div>
                <p className="text-sm text-muted-foreground">{optimizationResult.reasoning}</p>
              </div>
              
              {optimizationResult.suggestions?.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Suggestions</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {optimizationResult.suggestions.map((suggestion: string, i: number) => (
                      <li key={i}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              onClick={() => {
                setShowOptimizationDialog(false);
                setShowDirectionsDialog(true);
              }}
              disabled={!directions && loadingDirections}
            >
              {loadingDirections ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading Directions...
                </>
              ) : (
                <>
                  <Route className="h-4 w-4 mr-2" />
                  View Turn-by-Turn Directions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Directions Dialog */}
      <RouteDirectionsDialog
        open={showDirectionsDialog}
        onOpenChange={setShowDirectionsDialog}
        directions={directions || null}
        jobs={optimizationResult?.optimizedJobs || []}
      />
    </>
  );
}
