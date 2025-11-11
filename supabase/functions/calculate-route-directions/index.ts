import { corsHeaders } from '../_shared/cors.ts';

interface Waypoint {
  lat: number;
  lng: number;
  address: string;
  jobId?: string;
}

interface DirectionsRequest {
  waypoints: Waypoint[];
  optimize?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waypoints, optimize = false }: DirectionsRequest = await req.json();
    
    if (!waypoints || waypoints.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 waypoints required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    // Build Directions API URL
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
    const intermediateWaypoints = waypoints.slice(1, -1)
      .map(w => `${w.lat},${w.lng}`)
      .join('|');

    const params = new URLSearchParams({
      origin,
      destination,
      key: GOOGLE_MAPS_API_KEY,
      mode: 'driving',
    });

    if (intermediateWaypoints) {
      params.append('waypoints', `${optimize ? 'optimize:true|' : ''}${intermediateWaypoints}`);
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    
    console.info('[calculate-route-directions] Fetching directions', { 
      waypointCount: waypoints.length,
      optimize 
    });

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Directions API error: ${data.status}`);
    }

    // Extract key information
    const route = data.routes[0];
    const legs = route.legs;

    const directions = {
      totalDistance: legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
      totalDuration: legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
      polyline: route.overview_polyline.points,
      legs: legs.map((leg: any) => ({
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions,
          distance: step.distance,
          duration: step.duration,
          polyline: step.polyline.points,
        }))
      }))
    };

    return new Response(
      JSON.stringify({ directions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calculate-route-directions] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
