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

async function fetchClerkEmail(userId: string): Promise<string | null> {
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) return null;
  try {
    const r = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
    if (!r.ok) return null;
    const u: any = await r.json();
    const primaryId = u?.primary_email_address_id;
    const emails = Array.isArray(u?.email_addresses) ? u.email_addresses : [];
    const primary = emails.find((e: any) => e.id === primaryId) || emails[0];
    const email = primary?.email_address || u?.email || u?.primary_email_address?.email_address || null;
    return email?.toLowerCase?.() || null;
  } catch {
    return null;
  }
}

function serializeError(e: unknown) {
  if (e instanceof Error) {
    return { message: e.message, name: e.name };
  }
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { message: String(e) };
  }
}

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = (data as any)?.users || [];
    const match = users.find((u: any) =>
      (u.email && u.email.toLowerCase() === target) ||
      (Array.isArray(u?.email_addresses) && u.email_addresses.some((e: any) => (e.email_address || e.email)?.toLowerCase?.() === target))
    );
    if (match) return match.id as string;
    if (!users.length || users.length < perPage) break;
    page++;
  }
  return null;
}

async function resolveOwnerId(supabase: ReturnType<typeof createClient>, payload: any): Promise<string> {
  const clerkSub = payload.sub as string;
  const claimEmail = (payload.email || payload["email"] || payload["primary_email"] || "") as string;
  let email: string | null = claimEmail?.toLowerCase?.() || null;

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

  // Ensure we have an email (fetch from Clerk if missing)
  if (!email) {
    email = await fetchClerkEmail(clerkSub);
  }
  if (!email) {
    throw new Error("Unable to determine user email from Clerk; cannot create Supabase user");
  }

  // 3) Create Supabase auth user (required for profiles.id FK), then insert profile
  try {
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
  } catch (err) {
    const msg = (err as any)?.message || String(err);
    const code = (err as any)?.code || (err as any)?.status;
    const isEmailExists = code === "email_exists" || code === 422 || /already been registered/i.test(msg);
    if (!isEmailExists) throw err;

    // 3a) Try linking an existing profile by email
    if (email) {
      const { data: profByEmail2, error: profErr2 } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      if (profErr2) throw profErr2;
      if (profByEmail2?.id) {
        const { error: updErr2 } = await supabase
          .from("profiles")
          .update({ clerk_user_id: clerkSub })
          .eq("id", profByEmail2.id);
        if (updErr2) throw updErr2;
        return profByEmail2.id as string;
      }
    }

    // 3b) Fallback: search auth users via Admin API and upsert profile
    const existingUserId = await findAuthUserIdByEmail(supabase, email);
    if (!existingUserId) {
      throw new Error("Email exists in auth, but no matching user id could be found via Admin API");
    }

    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ id: existingUserId, email, clerk_user_id: clerkSub }, { onConflict: "id" });
    if (upsertErr) throw upsertErr;

    return existingUserId;
  }
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
        .select("id,name,email,phone,address")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return json({ rows: data || [] });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const name = (body.name || "").toString().trim();
      const email = (body.email ?? null) ? String(body.email).trim() : null;
      const phone = (body.phone ?? null) ? String(body.phone).trim() : null;
      const address = (body.address ?? null) ? String(body.address).trim() : null;
      if (!name) return badRequest("Name is required");

      const businessId = await ensureDefaultBusiness(supabase, ownerId);

      const { data, error } = await supabase
        .from("customers")
        .insert({ name, email, phone, address, owner_id: ownerId, business_id: businessId })
        .select("id")
        .single();
      if (error) throw error;
      return json({ ok: true, id: data?.id }, { status: 201 });
    }

    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const id = (body.id || "").toString().trim();
      if (!id) return badRequest("id is required");

      const update: Record<string, string | null> = {};
      if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        const name = (body.name || "").toString().trim();
        if (!name) return badRequest("Name is required");
        update.name = name;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'email')) {
        const email = (body.email ?? null) ? String(body.email).trim() : null;
        update.email = email;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
        const phone = (body.phone ?? null) ? String(body.phone).trim() : null;
        update.phone = phone;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'address')) {
        const address = (body.address ?? null) ? String(body.address).trim() : null;
        update.address = address;
      }
      if (Object.keys(update).length === 0) return badRequest("No fields to update");

      const { data, error } = await supabase
        .from("customers")
        .update(update)
        .eq("id", id)
        .eq("owner_id", ownerId)
        .select("id")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return badRequest("Customer not found", 404);
      return json({ ok: true, id: data.id });
    }

    return badRequest("Method not allowed", 405);
  } catch (e) {
    console.error("[customers]", e);
    return json({ error: serializeError(e) }, { status: 500 });
  }
});
