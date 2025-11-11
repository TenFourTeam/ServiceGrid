import { useEffect, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapCircleProps {
  center: { lat: number; lng: number };
  radius: number; // in meters
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  visible?: boolean;
}

/**
 * Circle overlay component for Google Maps
 * Wraps google.maps.Circle for use with @vis.gl/react-google-maps
 */
export function MapCircle({
  center,
  radius,
  strokeColor = '#3b82f6',
  strokeOpacity = 0.8,
  strokeWeight = 2,
  fillColor = '#3b82f6',
  fillOpacity = 0.15,
  visible = true,
}: MapCircleProps) {
  const map = useMap();

  // Create circle instance
  const circle = useMemo(() => {
    if (!map) return null;

    return new google.maps.Circle({
      strokeColor,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
      center,
      radius,
      map,
      clickable: false,
      editable: false,
      draggable: false,
      visible,
    });
  }, [map]);

  // Update circle properties when props change
  useEffect(() => {
    if (!circle) return;

    circle.setCenter(center);
    circle.setRadius(radius);
    circle.setOptions({
      strokeColor,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
      visible,
    });
  }, [circle, center, radius, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity, visible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (circle) {
        circle.setMap(null);
      }
    };
  }, [circle]);

  return null;
}
