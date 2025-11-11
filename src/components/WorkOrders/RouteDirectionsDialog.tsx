import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navigation, Clock, Route as RouteIcon, ExternalLink, Printer } from 'lucide-react';
import { Map, APIProvider, useMap } from '@vis.gl/react-google-maps';
import { useGoogleMapsApiKey } from '@/hooks/useGoogleMapsApiKey';
import type { RouteDirections } from '@/hooks/useRouteDirections';
import type { Job } from '@/types';
import { useEffect, useMemo } from 'react';

interface RouteDirectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directions: RouteDirections | null;
  jobs: Job[];
}

// Polyline decoder
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const poly: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return poly;
}

// Polyline renderer component
function RoutePolyline({ encodedPolyline }: { encodedPolyline: string }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;

    const path = decodePolyline(encodedPolyline);
    
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: 'hsl(var(--primary))',
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });

    polyline.setMap(map);

    // Fit bounds to show entire route
    const bounds = new google.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    map.fitBounds(bounds);

    return () => {
      polyline.setMap(null);
    };
  }, [map, encodedPolyline]);

  return null;
}

// Map markers component
function RouteMarkers({ jobs }: { jobs: Job[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const markers = jobs.map((job, index) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: job.latitude!, lng: job.longitude! },
        map,
        title: job.title || job.address || `Stop ${index + 1}`,
        content: (() => {
          const div = document.createElement('div');
          div.className = 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'center';
          div.textContent = String.fromCharCode(65 + index);
          return div;
        })(),
      });

      return marker;
    });

    return () => {
      markers.forEach(marker => marker.map = null);
    };
  }, [map, jobs]);

  return null;
}

export function RouteDirectionsDialog({ 
  open, 
  onOpenChange, 
  directions,
  jobs 
}: RouteDirectionsDialogProps) {
  const { data: apiKey } = useGoogleMapsApiKey();

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)} mi`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  };

  const handleOpenInGoogleMaps = () => {
    const waypoints = jobs.map(j => j.address).filter(Boolean);
    const url = `https://www.google.com/maps/dir/${waypoints.join('/')}`;
    window.open(url, '_blank');
  };

  const mapCenter = useMemo(() => {
    if (jobs.length > 0 && jobs[0].latitude && jobs[0].longitude) {
      return { lat: jobs[0].latitude, lng: jobs[0].longitude };
    }
    return { lat: 37.7749, lng: -122.4194 };
  }, [jobs]);

  if (!directions) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Turn-by-Turn Directions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatDistance(directions.totalDistance)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatDuration(directions.totalDuration)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleOpenInGoogleMaps} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
            <Button onClick={() => window.print()} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          {/* Map Preview with Polyline */}
          {apiKey && (
            <div className="h-[300px] rounded-lg overflow-hidden border">
              <APIProvider apiKey={apiKey}>
                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={12}
                  mapId="route-directions-map"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                >
                  <RoutePolyline encodedPolyline={directions.polyline} />
                  <RouteMarkers jobs={jobs} />
                </Map>
              </APIProvider>
            </div>
          )}

          {/* Step-by-step directions */}
          <Accordion type="multiple" className="w-full">
            {directions.legs.map((leg, legIndex) => (
              <AccordionItem key={legIndex} value={`leg-${legIndex}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <Badge variant="secondary" className="font-bold">
                      {String.fromCharCode(65 + legIndex)} → {String.fromCharCode(66 + legIndex)}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{leg.endAddress}</div>
                      <div className="text-sm text-muted-foreground">
                        {leg.distance.text} · {leg.duration.text}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-3 ml-4">
                    {leg.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex gap-3">
                        <span className="text-muted-foreground font-mono text-sm">
                          {stepIndex + 1}.
                        </span>
                        <div className="flex-1">
                          <div 
                            className="text-sm"
                            dangerouslySetInnerHTML={{ __html: step.instruction }}
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {step.distance.text}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
