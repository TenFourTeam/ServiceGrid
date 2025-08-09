// Supabase Edge Function: customers
// - Verifies Clerk token
// - Resolves/creates a Supabase user mapping via profiles
// - Ensures default business
// - GET: list customers for owner
// - POST: create customer for owner

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

async function getClerkPayload(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing Bearer token" } as const;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) return { error: "Missing CLERK_SECRET_KEY" } as const;
  try {
    const payload = await verifyToken(token, { secretKey });
    return { payload } as const;
  } catch (e) {
    return { error: `Invalid token: ${e}` } as const;
  }
}

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey);
}

async function resolveOwnerId(supabase: ReturnType<typeof createClient>, payload: any): Promise<string> {
  const clerkSub = payload.sub as string;
  const claimEmail = (payload.email || payload["email"] || payload["primary_email"] || "") as string;
  const email = claimEmail?.toLowerCase?.() || null;

  // 1) Lookup by clerk_user_id
  let { data: profByClerk, error: profByClerkErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkSub)
    .limit(1)
    .maybeSingle();
  if (profByClerkErr) throw profByClerkErr;
  if (profByClerk?.id) return profByClerk.id as string;

  // 2) Lookup by email, attach clerk_user_id
  if (email) {
    const { data: profByEmail, error: profByEmailErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (profByEmailErr) throw profByEmailErr;
    if (profByEmail?.id) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ clerk_user_id: clerkSub })
        .eq("id", profByEmail.id);
      if (updErr) throw updErr;
      return profByEmail.id as string;
    }
  }

  // 3) Create Supabase auth user if email is present, else create profile with random id
  if (email) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    const supaUserId = created.user?.id;
    if (!supaUserId) throw new Error("Failed to create supabase user");
    const { error: insErr } = await supabase.from("profiles").insert({
      id: supaUserId,
      email,
      clerk_user_id: clerkSub,
    });
    if (insErr) throw insErr;
    return supaUserId;
  }

  // Fallback: create a profile-only id
  const fallbackId = crypto.randomUUID();
  const { error: fallbackErr } = await supabase.from("profiles").insert({
    id: fallbackId,
    email: "",
    clerk_user_id: clerkSub,
  });
  if (fallbackErr) throw fallbackErr;
  return fallbackId;
}

async function ensureDefaultBusiness(supabase: ReturnType<typeof createClient>, ownerId: string) {
  const { data: existing, error: selErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return existing.id as string;

  const { data: inserted, error: insErr } = await supabase
    .from("businesses")
    .insert({ name: "My Business", owner_id: ownerId })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return inserted.id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await getClerkPayload(req);
    if ("error" in auth) return badRequest(auth.error, 401);
    const { payload } = auth;

    const supabase = createAdminClient();
    const ownerId = await resolveOwnerId(supabase, payload);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,email,address")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return json({ rows: data || [] });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const name = (body.name || "").toString().trim();
      const email = (body.email ?? null) ? String(body.email).trim() : null;
      const address = (body.address ?? null) ? String(body.address).trim() : null;
      if (!name) return badRequest("Name is required");

      const businessId = await ensureDefaultBusiness(supabase, ownerId);

      const { data, error } = await supabase
        .from("customers")
        .insert({ name, email, address, owner_id: ownerId, business_id: businessId })
        .select("id")
        .single();
      if (error) throw error;
      return json({ ok: true, id: data?.id }, { status: 201 });
    }

    return badRequest("Method not allowed", 405);
  } catch (e) {
    console.error("[customers]", e);
    return badRequest(String(e), 500);
  }
});
