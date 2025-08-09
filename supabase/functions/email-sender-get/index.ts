import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("email-sender-get: Missing Supabase env");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    async function resolveUser(): Promise<{ userId: string; email?: string } | null> {
      // Try Supabase JWT first
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        return { userId: data.user.id, email: data.user.email ?? undefined };
      }
      // Try Clerk token
      if (!CLERK_SECRET_KEY) return null;
      try {
        const payload: any = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
        const clerkId: string = payload.sub;
        const email: string | undefined = payload.email || payload.email_address || payload.primary_email || undefined;

        // Map to profiles.id (UUID)
        // 1) by clerk_user_id
        let { data: prof } = await supabase.from("profiles").select("id").eq("clerk_user_id", clerkId).maybeSingle();
        if (!prof && email) {
          // 2) by email (then link)
          const { data: byEmail } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
          if (byEmail) {
            await supabase.from("profiles").update({ clerk_user_id: clerkId }).eq("id", byEmail.id);
            prof = byEmail as any;
          }
        }
        if (!prof) {
          // 3) create new profile
          const newId = crypto.randomUUID();
          await supabase.from("profiles").insert({ id: newId, email: email || "", clerk_user_id: clerkId, updated_at: new Date().toISOString(), created_at: new Date().toISOString() });
          prof = { id: newId } as any;
        }
        return { userId: prof.id as string, email };
      } catch (e) {
        console.error("email-sender-get: Clerk verify failed", e);
        return null;
      }
    }

    const who = await resolveUser();
    if (!who) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: sender, error: selErr } = await supabase
      .from("email_senders")
      .select("*")
      .eq("user_id", who.userId)
      .maybeSingle();

    if (selErr) {
      console.error("email-sender-get: select error", selErr);
      return new Response(JSON.stringify({ error: "Failed to load sender" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ sender }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("email-sender-get error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});