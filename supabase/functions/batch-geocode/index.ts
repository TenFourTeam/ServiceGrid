import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeResult {
  address: string;
  lat: number | null;
  lng: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { addresses } = await req.json();
    
    if (!addresses || !Array.isArray(addresses)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: addresses array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[batch-geocode] Processing ${addresses.length} addresses`);

    // Check cache first
    const { data: cached } = await supabase
      .from("travel_time_cache")
      .select("origin_address, origin_lat, origin_lng")
      .in("origin_address", addresses)
      .not("origin_lat", "is", null);

    const cachedMap = new Map<string, { lat: number; lng: number }>();
    if (cached) {
      cached.forEach((c) => {
        if (c.origin_lat && c.origin_lng) {
          cachedMap.set(c.origin_address, {
            lat: c.origin_lat,
            lng: c.origin_lng,
          });
        }
      });
    }

    console.log(`[batch-geocode] Found ${cachedMap.size} cached results`);

    // Geocode uncached addresses
    const uncached = addresses.filter((a) => !cachedMap.has(a));
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[batch-geocode] Geocoding ${uncached.length} new addresses`);

    const results: GeocodeResult[] = await Promise.all(
      uncached.map(async (address) => {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
          )}&key=${googleApiKey}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.status === "OK" && data.results[0]) {
            const location = data.results[0].geometry.location;
            console.log(`[batch-geocode] ✓ Geocoded: ${address.substring(0, 30)}...`);
            return { address, lat: location.lat, lng: location.lng };
          } else {
            console.warn(`[batch-geocode] ✗ Failed to geocode: ${address} (${data.status})`);
            return { address, lat: null, lng: null };
          }
        } catch (error) {
          console.error(`[batch-geocode] Error geocoding ${address}:`, error);
          return { address, lat: null, lng: null };
        }
      })
    );

    // Cache new geocoding results
    for (const result of results) {
      if (result.lat && result.lng) {
        await supabase.from("travel_time_cache").upsert(
          {
            origin_address: result.address,
            origin_lat: result.lat,
            origin_lng: result.lng,
            cached_at: new Date().toISOString(),
          },
          { onConflict: "origin_address" }
        );

        cachedMap.set(result.address, { lat: result.lat, lng: result.lng });
      }
    }

    // Return all results (cached + new)
    const coordinates: Record<string, { lat: number; lng: number } | null> = {};
    addresses.forEach((addr) => {
      coordinates[addr] = cachedMap.get(addr) || null;
    });

    console.log(`[batch-geocode] Returning ${Object.keys(coordinates).length} total results`);

    return new Response(JSON.stringify({ coordinates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[batch-geocode] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
