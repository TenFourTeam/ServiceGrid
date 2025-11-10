import { useMemo, useState, useEffect, useRef, startTransition } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Job } from '@/types';
import { useGeocoding } from '@/hooks/useGeocoding';
import { JobMarker } from './JobMarker';
import { JobInfoWindow } from './JobInfoWindow';
import { JobNavigationPanel } from './JobNavigationPanel';
import { MapLegend } from './MapLegend';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/Button';
import { MapPin, ChevronLeft, ChevronRight, AlertCircle, Sparkles, Loader2, CheckSquare, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useJobRouteOptimization } from '@/hooks/useJobRouteOptimization';
import { useIsMobile } from '@/hooks/use-mobile';

interface RouteMapViewProps {
  date: Date;
  jobs: Job[];
  selectedMemberId?: string | null;
  onJobClick?: (job: Job) => void;
}

/**
 * Internal map component that uses the map instance
 */
function MapContent({ 
  jobsWithCoords, 
  selectedJobId,
  selectedJobIds,
  isMultiSelectMode,
  selectedMemberId, 
  onJobClick,
  onMarkerClick,
  onToggleSelection,
  mapRef
}: {
  jobsWithCoords: Array<{ job: Job; coords: { lat: number; lng: number } }>;
  selectedJobId: string | null;
  selectedJobIds: Set<string>;
  isMultiSelectMode: boolean;
  selectedMemberId?: string | null;
  onJobClick?: (job: Job) => void;
  onMarkerClick: (job: Job, index: number) => void;
  onToggleSelection: (jobId: string) => void;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
}) {
  const map = useMap();

  // Capture map instance
  useEffect(() => {
    if (map) {
      mapRef.current = map;
      console.log('[RouteMapView] Map instance captured');
    }
  }, [map, mapRef]);

  return (
    <>
      {jobsWithCoords.map(({ job, coords }, index) => (
        <AdvancedMarker
          key={`${job.id}-${coords.lat}-${coords.lng}`}
          position={coords}
          onClick={() => {
            if (isMultiSelectMode) {
              // Multi-select mode: toggle selection
              onToggleSelection(job.id);
            } else {
              // Batch state updates with startTransition
              startTransition(() => {
                onMarkerClick(job, index);
              });
              if (onJobClick) onJobClick(job);
            }
          }}
        >
          <JobMarker 
            job={job} 
            selectedMemberId={selectedMemberId}
            isSelected={job.id === selectedJobId}
            isMultiSelected={selectedJobIds.has(job.id)}
          />
        </AdvancedMarker>
      ))}
    </>
  );
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
  const [mapError, setMapError] = useState<string | null>(null);
  const [isNavigationPanelCollapsed, setIsNavigationPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('jobNavigationPanelCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Multi-selection state
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // Route optimization
  const { mutate: optimizeRoute, isPending: isOptimizing } = useJobRouteOptimization();
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showOptimizationDialog, setShowOptimizationDialog] = useState(false);

  // Refs for performance optimization
  const mapRef = useRef<google.maps.Map | null>(null);
  const initialBoundsSet = useRef(false);
  const isMobile = useIsMobile();
  const [showNavPanel, setShowNavPanel] = useState(false);

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

    // Update map center only once on initial load
    if (isFinite(minLat) && isFinite(maxLat) && isFinite(minLng) && isFinite(maxLng)) {
      if (!initialBoundsSet.current) {
        setMapCenter({
          lat: (minLat + maxLat) / 2,
          lng: (minLng + maxLng) / 2,
        });
        initialBoundsSet.current = true;
      }
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
    if (!jobWithCoords || !mapRef.current) return;
    
    // Use imperative API for smooth pan/zoom without state conflicts
    mapRef.current.panTo(jobWithCoords.coords);
    
    // Zoom after a brief delay to allow pan to complete
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setZoom(15);
      }
    }, 300);
    
    setSelectedJobId(jobId);
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

  const handleOptimizeRoute = () => {
    const selectedJobs = jobsWithCoords
      .filter(({ job }) => selectedJobIds.has(job.id))
      .map(({ job }) => job);
    
    if (selectedJobs.length < 2) return;
    
    optimizeRoute({
      businessId: selectedJobs[0].businessId,
      jobs: selectedJobs,
      constraints: {
        startTime: '08:00',
        endTime: '17:00'
      }
    }, {
      onSuccess: (result) => {
        setOptimizationResult(result);
        setShowOptimizationDialog(true);
      }
    });
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

  // Display error state if map fails to load
  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4 max-w-md p-8">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Map Error</h3>
          <p className="text-sm text-muted-foreground">{mapError}</p>
          <Button 
            variant="secondary" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
    jobsCount: jobsWithCoords.length
  });

  return (
    <APIProvider 
      apiKey={apiKey}
      onLoad={() => console.log('[RouteMapView] Google Maps API loaded')}
      onError={(error) => {
        console.error('[RouteMapView] Maps API error:', error);
        setMapError('Failed to load Google Maps. Check your API key and enabled APIs.');
      }}
    >
      {isMobile ? (
        <div className="flex flex-col h-full w-full">
          {/* Collapsible Navigation Panel on Mobile */}
          <Collapsible open={showNavPanel} onOpenChange={setShowNavPanel}>
            <CollapsibleTrigger asChild>
              <Button variant="secondary" className="m-2 w-[calc(100%-1rem)]">
                <MapPin className="h-4 w-4 mr-2" />
                {showNavPanel ? 'Hide' : 'Show'} Jobs ({jobsWithCoords.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="max-h-48 overflow-y-auto border-b">
                <JobNavigationPanel
                  jobs={jobsWithCoords}
                  selectedJobId={selectedJobId}
                  currentJobIndex={currentJobIndex}
                  onJobSelect={handleJobSelect}
                  isCollapsed={false}
                  onCollapsedChange={() => {}}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          {/* Map takes remaining space */}
          <div className="flex-1 relative">
            {/* Multi-Select Mode Toggle */}
            {!isMultiSelectMode && jobsWithCoords.length > 1 && (
              <div className="absolute top-4 left-4 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsMultiSelectMode(true)}
                  className="bg-background/95 backdrop-blur-sm shadow-lg"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select Multiple Jobs
                </Button>
              </div>
            )}

            {/* Multi-Select Toolbar */}
            {isMultiSelectMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-medium">
                    {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} selected
                  </Badge>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={selectedJobIds.size < 2 || isOptimizing}
                    onClick={handleOptimizeRoute}
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Route
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedJobIds(new Set())}
                    disabled={selectedJobIds.size === 0}
                  >
                    Clear
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsMultiSelectMode(false);
                      setSelectedJobIds(new Set());
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Map
              defaultCenter={mapCenter}
              defaultZoom={mapZoom}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            >
              <MapContent
                jobsWithCoords={jobsWithCoords}
                selectedJobId={selectedJobId}
                selectedJobIds={selectedJobIds}
                isMultiSelectMode={isMultiSelectMode}
                selectedMemberId={selectedMemberId}
                onJobClick={onJobClick}
                onMarkerClick={(job, index) => {
                  setSelectedJob(job);
                  setSelectedJobId(job.id);
                  setCurrentJobIndex(index);
                }}
                onToggleSelection={toggleJobSelection}
                mapRef={mapRef}
              />
            </Map>

            {/* Job Info Window positioned over map */}
            {selectedJob && !isMultiSelectMode && (
              <div className="absolute top-4 right-4 z-10 w-80 pointer-events-auto">
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
              </div>
            )}

            {/* Navigation Controls */}
            {jobsWithCoords.length > 1 && !isMultiSelectMode && (
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
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Job Navigation Panel */}
          <ResizablePanel
            defaultSize={isNavigationPanelCollapsed ? 5 : 20}
            minSize={isNavigationPanelCollapsed ? 5 : 15}
            maxSize={isNavigationPanelCollapsed ? 5 : 35}
            collapsible={false}
          >
            <JobNavigationPanel
              jobs={jobsWithCoords}
              selectedJobId={selectedJobId}
              currentJobIndex={currentJobIndex}
              onJobSelect={handleJobSelect}
              isCollapsed={isNavigationPanelCollapsed}
              onCollapsedChange={setIsNavigationPanelCollapsed}
            />
          </ResizablePanel>

          {/* Resize Handle */}
          {!isNavigationPanelCollapsed && (
            <ResizableHandle withHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
          )}

          {/* Map Panel */}
          <ResizablePanel defaultSize={isNavigationPanelCollapsed ? 95 : 80}>
            <div className="relative w-full h-full">
              {/* Multi-Select Mode Toggle */}
              {!isMultiSelectMode && jobsWithCoords.length > 1 && (
                <div className="absolute top-4 left-4 z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsMultiSelectMode(true)}
                    className="bg-background/95 backdrop-blur-sm shadow-lg"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select Multiple Jobs
                  </Button>
                </div>
              )}

              {/* Multi-Select Toolbar */}
              {isMultiSelectMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-medium">
                      {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} selected
                    </Badge>
                    
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={selectedJobIds.size < 2 || isOptimizing}
                      onClick={handleOptimizeRoute}
                    >
                      {isOptimizing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Route
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedJobIds(new Set())}
                      disabled={selectedJobIds.size === 0}
                    >
                      Clear
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsMultiSelectMode(false);
                        setSelectedJobIds(new Set());
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Map
                defaultCenter={mapCenter}
                defaultZoom={mapZoom}
                gestureHandling="greedy"
                disableDefaultUI={false}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
              >
                <MapContent
                  jobsWithCoords={jobsWithCoords}
                  selectedJobId={selectedJobId}
                  selectedJobIds={selectedJobIds}
                  isMultiSelectMode={isMultiSelectMode}
                  selectedMemberId={selectedMemberId}
                  onJobClick={onJobClick}
                  onMarkerClick={(job, index) => {
                    setSelectedJob(job);
                    setSelectedJobId(job.id);
                    setCurrentJobIndex(index);
                  }}
                  onToggleSelection={toggleJobSelection}
                  mapRef={mapRef}
                />
              </Map>

              {/* Job Info Window positioned over map */}
              {selectedJob && !isMultiSelectMode && (
                <div className="absolute top-4 right-4 z-10 w-80 pointer-events-auto">
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
                </div>
              )}

              {/* Navigation Controls */}
              {jobsWithCoords.length > 1 && !isMultiSelectMode && (
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
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Optimization Results Dialog */}
      <Dialog open={showOptimizationDialog} onOpenChange={setShowOptimizationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Route Optimization Results
            </DialogTitle>
            <DialogDescription>
              Your route has been optimized for maximum efficiency
            </DialogDescription>
          </DialogHeader>

          {optimizationResult && (
            <div className="space-y-6">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Time Saved</div>
                    <div className="text-2xl font-bold text-green-600">
                      {optimizationResult.estimatedTimeSaved} min
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Total Travel Time</div>
                    <div className="text-2xl font-bold">
                      {optimizationResult.estimatedTravelTime} min
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Reasoning */}
              <div className="space-y-2">
                <h4 className="font-semibold">Why this route?</h4>
                <p className="text-sm text-muted-foreground">
                  {optimizationResult.reasoning}
                </p>
              </div>

              {/* Optimized Order */}
              <div className="space-y-2">
                <h4 className="font-semibold">Optimized Route</h4>
                <div className="space-y-2">
                  {optimizationResult.optimizedJobs.map((job: Job, index: number) => (
                    <div key={job.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="secondary" className="font-bold">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">{job.title || 'Untitled Job'}</div>
                        <div className="text-sm text-muted-foreground">{job.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              {optimizationResult.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Additional Tips</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {optimizationResult.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowOptimizationDialog(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    // Apply the optimized order - future enhancement
                    setShowOptimizationDialog(false);
                    setIsMultiSelectMode(false);
                    setSelectedJobIds(new Set());
                  }}
                >
                  Apply Route
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </APIProvider>
  );
}
