import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origins, destinations } = await req.json();
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('[calculate-travel-times] Google Maps API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.info('[calculate-travel-times] Processing request', { 
      originsCount: origins.length, 
      destinationsCount: destinations.length 
    });

    const results = [];

    // Check cache first
    for (const origin of origins) {
      for (const destination of destinations) {
        // Check cache
        const { data: cached, error: cacheError } = await supabaseClient
          .from('travel_time_cache')
          .select('*')
          .eq('origin_address', origin)
          .eq('destination_address', destination)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cacheError) {
          console.warn('[calculate-travel-times] Cache lookup error:', cacheError);
        }

        if (cached) {
          console.info('[calculate-travel-times] Cache hit', { origin, destination });
          results.push({
            origin,
            destination,
            travelTimeMinutes: cached.travel_time_minutes,
            distanceMiles: cached.distance_miles,
            cached: true
          });
          continue;
        }

        // Fetch from Google Maps API
        console.info('[calculate-travel-times] Fetching from Google Maps', { origin, destination });
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
          const element = data.rows[0].elements[0];
          const travelTimeMinutes = Math.ceil(element.duration.value / 60);
          const distanceMiles = parseFloat((element.distance.value / 1609.34).toFixed(2));

          // Cache the result
          const { error: insertError } = await supabaseClient
            .from('travel_time_cache')
            .insert({
              origin_address: origin,
              destination_address: destination,
              travel_time_minutes: travelTimeMinutes,
              distance_miles: distanceMiles
            });

          if (insertError) {
            console.warn('[calculate-travel-times] Failed to cache result:', insertError);
          } else {
            console.info('[calculate-travel-times] Cached result', { origin, destination, travelTimeMinutes });
          }

          results.push({
            origin,
            destination,
            travelTimeMinutes,
            distanceMiles,
            cached: false
          });
        } else {
          console.warn('[calculate-travel-times] Google Maps API error', { 
            status: data.status, 
            elementStatus: data.rows[0]?.elements[0]?.status 
          });
          // Return a default estimate
          results.push({
            origin,
            destination,
            travelTimeMinutes: 15, // default 15 minute estimate
            distanceMiles: 5, // default 5 miles
            cached: false,
            error: 'Unable to calculate travel time'
          });
        }
      }
    }

    console.info('[calculate-travel-times] Completed', { resultsCount: results.length });
    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calculate-travel-times] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
