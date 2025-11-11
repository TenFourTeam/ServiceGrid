import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get("lat") || "");
    const lng = parseFloat(url.searchParams.get("lng") || "");

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(
        JSON.stringify({ error: "Invalid lat/lng parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Round to 4 decimals (~11m precision) for cache key
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    const cacheKey = `${roundedLat},${roundedLng}`;

    console.log(`[geo-reverse] Reverse geocoding: ${cacheKey}`);

    // Check cache first
    const { data: cached } = await supabase
      .from("travel_time_cache")
      .select("origin_address")
      .eq("origin_lat", roundedLat)
      .eq("origin_lng", roundedLng)
      .single();

    if (cached?.origin_address) {
      console.log(`[geo-reverse] ✓ Cache hit: ${cached.origin_address}`);
      return new Response(
        JSON.stringify({ 
          address: cached.origin_address,
          lat: roundedLat,
          lng: roundedLng,
          cached: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Maps Geocoding API
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== "OK" || !data.results[0]) {
      console.warn(`[geo-reverse] ✗ Geocoding failed: ${data.status}`);
      return new Response(
        JSON.stringify({ error: `Geocoding failed: ${data.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const address = data.results[0].formatted_address;
    console.log(`[geo-reverse] ✓ Geocoded: ${address}`);

    // Cache result
    await supabase.from("travel_time_cache").upsert(
      {
        origin_address: address,
        origin_lat: roundedLat,
        origin_lng: roundedLng,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "origin_address" }
    );

    return new Response(
      JSON.stringify({ 
        address,
        lat: roundedLat,
        lng: roundedLng,
        cached: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[geo-reverse] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
