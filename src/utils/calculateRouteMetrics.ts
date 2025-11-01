import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';

export interface RouteMetrics {
  totalTravelTime: number; // minutes
  totalDistance: number; // miles
  totalJobTime: number; // minutes
  efficiencyScore: number; // 0-100, higher is better
  suggestions: string[];
  segments: Array<{
    from: string;
    to: string;
    travelTime: number;
    distance: number;
  }>;
}

/**
 * Calculate comprehensive metrics for a route of recurring jobs
 * Efficiency score = (job time / (job time + travel time)) * 100
 */
export function calculateRouteMetrics(
  templates: RecurringJobTemplate[],
  travelTimes: Array<{ travelTimeMinutes: number; distanceMiles: number; origin: string; destination: string }>
): RouteMetrics {
  let totalTravelTime = 0;
  let totalDistance = 0;
  let totalJobTime = 0;
  const segments: RouteMetrics['segments'] = [];
  const suggestions: string[] = [];

  // Calculate total job time
  templates.forEach(template => {
    totalJobTime += template.estimated_duration_minutes || 0;
  });

  // Calculate travel time and distance between consecutive jobs
  for (let i = 0; i < templates.length - 1; i++) {
    const current = templates[i];
    const next = templates[i + 1];
    
    if (!current.address || !next.address) continue;

    const travelData = travelTimes.find(
      tt => tt.origin === current.address && tt.destination === next.address
    );

    if (travelData) {
      totalTravelTime += travelData.travelTimeMinutes;
      totalDistance += travelData.distanceMiles;
      
      segments.push({
        from: current.address,
        to: next.address,
        travelTime: travelData.travelTimeMinutes,
        distance: travelData.distanceMiles,
      });

      // Flag long travel segments
      if (travelData.travelTimeMinutes > 30) {
        suggestions.push(
          `Long travel time (${Math.round(travelData.travelTimeMinutes)} min) between "${current.title}" and "${next.title}"`
        );
      }
    }
  }

  // Calculate efficiency score
  const totalTime = totalJobTime + totalTravelTime;
  const efficiencyScore = totalTime > 0 ? Math.round((totalJobTime / totalTime) * 100) : 0;

  // Generate suggestions
  if (efficiencyScore < 60) {
    suggestions.push('Route efficiency is low. Consider reordering jobs to reduce travel time.');
  }
  
  if (totalTravelTime > totalJobTime) {
    suggestions.push('Travel time exceeds job time. Route optimization recommended.');
  }

  if (segments.length > 0) {
    const longestSegment = segments.reduce((max, seg) => 
      seg.travelTime > max.travelTime ? seg : max
    );
    if (longestSegment.travelTime > 45) {
      suggestions.push(`Consider splitting route - longest segment is ${Math.round(longestSegment.travelTime)} min`);
    }
  }

  return {
    totalTravelTime,
    totalDistance,
    totalJobTime,
    efficiencyScore,
    suggestions,
    segments,
  };
}
