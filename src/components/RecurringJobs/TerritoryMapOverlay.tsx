// Note: Polygon would be from @vis.gl/react-google-maps but we'll use a custom approach
// import { Polygon } from '@vis.gl/react-google-maps';
import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';

interface Territory {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  templates: RecurringJobTemplate[];
  color: string;
}

interface TerritoryMapOverlayProps {
  territories: Territory[];
  coordinatesMap: Map<string, { lat: number; lng: number }>;
  onTerritoryClick?: (territory: Territory) => void;
}

export function TerritoryMapOverlay({ 
  territories, 
  coordinatesMap,
  onTerritoryClick 
}: TerritoryMapOverlayProps) {
  if (territories.length === 0) return null;

  // Territory overlay visualization would require Google Maps Polygon component
  // For now, this is a placeholder for the visual territory boundaries
  // In production, you would use @vis.gl/react-google-maps Polygon component
  
  return (
    <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-md z-10">
      <h4 className="text-sm font-medium mb-2">Territories</h4>
      <div className="space-y-1">
        {territories.map((territory) => (
          <button
            key={territory.id}
            onClick={() => onTerritoryClick?.(territory)}
            className="flex items-center gap-2 text-sm hover:bg-muted p-1 rounded w-full text-left"
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: territory.color }}
            />
            <span>{territory.name}</span>
            <span className="text-muted-foreground ml-auto">{territory.templates.length}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function calculateBounds(coords: { lat: number; lng: number }[]) {
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

function createBoundaryPolygon(
  bounds: { north: number; south: number; east: number; west: number },
  center: { lat: number; lng: number }
): google.maps.LatLngLiteral[] {
  // Add some padding to the bounds
  const latPadding = (bounds.north - bounds.south) * 0.15;
  const lngPadding = (bounds.east - bounds.west) * 0.15;

  // Create an elliptical boundary
  const points: google.maps.LatLngLiteral[] = [];
  const numPoints = 32;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const lat = center.lat + (bounds.north - bounds.south + latPadding) * Math.sin(angle) / 2;
    const lng = center.lng + (bounds.east - bounds.west + lngPadding) * Math.cos(angle) / 2;
    points.push({ lat, lng });
  }

  return points;
}
