import { useMemo } from 'react';
import { RecurringJobTemplate } from './useRecurringJobs';
import { useGeocoding } from './useGeocoding';

interface Territory {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  templates: RecurringJobTemplate[];
  color: string;
}

interface TerritoryAnalysis {
  territories: Territory[];
  unassigned: RecurringJobTemplate[];
}

/**
 * Analyzes recurring job locations and clusters them into logical territories
 * Uses simple geographic clustering based on coordinates
 */
export function useTerritoryAnalysis(templates: RecurringJobTemplate[]): TerritoryAnalysis {
  // Get all addresses
  const addresses = templates
    .map(t => t.address)
    .filter((addr): addr is string => !!addr && addr.trim().length > 0);

  const { data: coordinatesMap, isLoading } = useGeocoding(addresses);

  return useMemo(() => {
    if (isLoading || !coordinatesMap || templates.length === 0) {
      return { territories: [], unassigned: templates };
    }

    // Filter templates with valid coordinates
    const templatesWithCoords = templates.filter(t => 
      t.address && coordinatesMap.has(t.address)
    );

    if (templatesWithCoords.length < 3) {
      // Not enough data for clustering
      return { territories: [], unassigned: templates };
    }

    // Simple k-means clustering
    const k = Math.min(Math.ceil(templatesWithCoords.length / 4), 5); // 2-5 territories
    const clusters = kMeansClustering(templatesWithCoords, coordinatesMap, k);

    // Assign territory names based on geographic position
    const territories: Territory[] = clusters.map((cluster, idx) => {
      const center = calculateCenter(cluster, coordinatesMap);
      const name = generateTerritoryName(center, idx);
      const color = TERRITORY_COLORS[idx % TERRITORY_COLORS.length];

      return {
        id: `territory-${idx + 1}`,
        name,
        center,
        templates: cluster,
        color,
      };
    });

    const unassigned = templates.filter(
      t => !t.address || !coordinatesMap.has(t.address)
    );

    return { territories, unassigned };
  }, [templates, coordinatesMap, isLoading]);
}

// K-means clustering implementation
function kMeansClustering(
  templates: RecurringJobTemplate[],
  coordinatesMap: Map<string, { lat: number; lng: number }>,
  k: number
): RecurringJobTemplate[][] {
  // Initialize centroids randomly
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  let centroids = shuffled.slice(0, k).map(t => {
    const coords = coordinatesMap.get(t.address!);
    return coords ? { lat: coords.lat, lng: coords.lng } : null;
  }).filter((c): c is { lat: number; lng: number } => c !== null);

  if (centroids.length === 0) return [templates];

  let clusters: RecurringJobTemplate[][] = [];
  let changed = true;
  let iterations = 0;
  const maxIterations = 20;

  while (changed && iterations < maxIterations) {
    // Assign templates to nearest centroid
    clusters = Array.from({ length: centroids.length }, () => [] as RecurringJobTemplate[]);
    
    for (const template of templates) {
      const coords = coordinatesMap.get(template.address!);
      if (!coords) continue;

      let minDist = Infinity;
      let clusterIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = distance(coords, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          clusterIdx = i;
        }
      }

      clusters[clusterIdx].push(template);
    }

    // Remove empty clusters
    clusters = clusters.filter(c => c.length > 0);

    // Recalculate centroids
    const newCentroids = clusters.map(cluster => calculateCenter(cluster, coordinatesMap));
    
    // Check if centroids changed
    changed = !centroids.every((c, i) => 
      newCentroids[i] && 
      Math.abs(c.lat - newCentroids[i].lat) < 0.001 && 
      Math.abs(c.lng - newCentroids[i].lng) < 0.001
    );

    centroids = newCentroids;
    iterations++;
  }

  return clusters.filter(c => c.length > 0);
}

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function calculateCenter(
  cluster: RecurringJobTemplate[],
  coordinatesMap: Map<string, { lat: number; lng: number }>
): { lat: number; lng: number } {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const template of cluster) {
    const coords = coordinatesMap.get(template.address!);
    if (coords) {
      sumLat += coords.lat;
      sumLng += coords.lng;
      count++;
    }
  }

  return {
    lat: sumLat / count,
    lng: sumLng / count,
  };
}

function generateTerritoryName(center: { lat: number; lng: number }, index: number): string {
  // Simple naming based on relative position
  // In a real app, you might use reverse geocoding to get city/neighborhood names
  const names = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone'];
  return names[index] || `Zone ${index + 1}`;
}

const TERRITORY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
