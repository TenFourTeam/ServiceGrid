import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { toast } from 'sonner';
import type { RadiusFilter } from '@/hooks/useJobLocationQuery';

interface LocationFilterProps {
  onFilterChange: (filter: RadiusFilter | null) => void;
  className?: string;
}

/**
 * Location-based filter for jobs
 * Allows filtering by radius around a center point
 */
export function LocationFilter({ onFilterChange, className }: LocationFilterProps) {
  const [address, setAddress] = useState('');
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(5); // Default 5km
  const [isActive, setIsActive] = useState(false);
  const { getPlaceDetails } = usePlacesAutocomplete();

  const radiusMiles = (radiusKm * 0.621371).toFixed(1);

  const handlePlaceSelect = async (placeId: string, description: string) => {
    setAddress(description);
    
    // Fetch full place details including coordinates
    const placeDetails = await getPlaceDetails(placeId);
    
    if (placeDetails) {
      setCenterCoords({ lat: placeDetails.lat, lng: placeDetails.lng });
    } else {
      toast.error('Could not get coordinates for this location');
    }
  };

  const handleApply = () => {
    if (!centerCoords) {
      return;
    }

    const filter: RadiusFilter = {
      type: 'radius',
      latitude: centerCoords.lat,
      longitude: centerCoords.lng,
      radiusMeters: radiusKm * 1000, // Convert km to meters
    };

    setIsActive(true);
    onFilterChange(filter);
  };

  const handleClear = () => {
    setAddress('');
    setCenterCoords(null);
    setRadiusKm(5);
    setIsActive(false);
    onFilterChange(null);
  };

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Location Filter</h3>
          {isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Active
            </span>
          )}
        </div>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Address Input */}
        <div className="space-y-1.5">
          <Label htmlFor="location-address" className="text-xs">
            Center Location
          </Label>
          <AddressAutocomplete
            id="location-address"
            value={address}
            onChange={setAddress}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Enter address or place"
            className="h-9 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Jobs within this radius will be shown
          </p>
        </div>

        {/* Radius Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="radius-slider" className="text-xs">
              Search Radius
            </Label>
            <span className="text-xs font-medium text-foreground">
              {radiusKm} km ({radiusMiles} mi)
            </span>
          </div>
          <Slider
            id="radius-slider"
            min={1}
            max={50}
            step={1}
            value={[radiusKm]}
            onValueChange={(values) => setRadiusKm(values[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApply}
            disabled={!centerCoords}
            className="flex-1 h-9 text-sm"
            size="sm"
          >
            Apply Filter
          </Button>
          {isActive && (
            <Button
              onClick={handleClear}
              variant="outline"
              className="flex-1 h-9 text-sm"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
