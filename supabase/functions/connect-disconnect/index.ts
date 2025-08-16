
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userId: ownerId, supaAdmin: supabase } = await requireCtx(req);

    // Find the user's business (oldest)
    const { data: biz, error: selErr } = await supabase
      .from("businesses")
      .select("id, stripe_account_id")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;

    if (!biz?.id) {
      return json({ success: true, message: "No business found" });
    }

    // Soft disconnect: clear Stripe fields so the app treats the account as disconnected
    const { error: upErr } = await supabase
      .from("businesses")
      .update({
        stripe_account_id: null,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
      })
      .eq("id", biz.id);
    if (upErr) throw upErr;

    return json({ success: true });
  } catch (e: any) {
    console.error("[connect-disconnect] error:", e);
    const msg = e?.message || String(e);
    return json({ error: msg }, { status: /missing bearer|unauthorized/i.test(msg) ? 401 : 500 });
  }
});
