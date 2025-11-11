import { corsHeaders } from '../_shared/cors.ts';
import { requireCtx } from '../_lib/auth.ts';

interface RadiusQuery {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

interface PolygonQuery {
  polygon: Array<{ lat: number; lng: number }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.info('[jobs-location-query] Request received', { method: req.method });
    const ctx = await requireCtx(req);

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const queryType = url.searchParams.get('type') || 'radius';
    
    console.info('[jobs-location-query] Query type:', queryType);

    if (queryType === 'radius') {
      // Radius-based query
      const latitude = parseFloat(url.searchParams.get('latitude') || '');
      const longitude = parseFloat(url.searchParams.get('longitude') || '');
      const radiusMeters = parseFloat(url.searchParams.get('radiusMeters') || '5000');

      if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusMeters)) {
        return new Response(
          JSON.stringify({ error: 'Invalid radius query parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.info('[jobs-location-query] Radius query:', { latitude, longitude, radiusMeters });

      const { data, error } = await ctx.supaAdmin.rpc('jobs_within_radius', {
        p_business_id: ctx.businessId,
        p_user_id: ctx.userId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_meters: radiusMeters,
      });

      if (error) {
        console.error('[jobs-location-query] Database error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.info('[jobs-location-query] Found jobs:', data?.length || 0);
      return new Response(
        JSON.stringify({ jobs: data || [], count: data?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (queryType === 'polygon') {
      // Polygon-based query
      const polygonParam = url.searchParams.get('polygon');
      if (!polygonParam) {
        return new Response(
          JSON.stringify({ error: 'Missing polygon parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let polygon: Array<{ lat: number; lng: number }>;
      try {
        polygon = JSON.parse(polygonParam);
        if (!Array.isArray(polygon) || polygon.length < 3) {
          throw new Error('Polygon must have at least 3 points');
        }
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid polygon format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.info('[jobs-location-query] Polygon query:', { points: polygon.length });

      const { data, error } = await ctx.supaAdmin.rpc('jobs_within_polygon', {
        p_business_id: ctx.businessId,
        p_user_id: ctx.userId,
        p_polygon: polygon,
      });

      if (error) {
        console.error('[jobs-location-query] Database error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.info('[jobs-location-query] Found jobs:', data?.length || 0);
      return new Response(
        JSON.stringify({ jobs: data || [], count: data?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid query type. Use "radius" or "polygon"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[jobs-location-query] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
