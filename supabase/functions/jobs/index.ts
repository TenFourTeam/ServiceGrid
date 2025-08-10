// Supabase Edge Function: jobs
// - Verifies Clerk token
// - Resolves/creates a Supabase user mapping via profiles (owner_id)
// - GET: list jobs
// - POST: create a job from a quote
// - PATCH: update a job (status/times/notes)

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

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey);
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

async function fetchClerkEmail(userId: string): Promise<string | null> {
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) return null;
  try {
    const r = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
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

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await (supabase as any).auth.admin.listUsers({ page, perPage });
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

  let { data: profByClerk, error: profByClerkErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkSub)
    .limit(1)
    .maybeSingle();
  if (profByClerkErr) throw profByClerkErr;
  if (profByClerk?.id) return profByClerk.id as string;

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

  if (!email) {
    email = await fetchClerkEmail(clerkSub);
  }
  if (!email) {
    throw new Error("Unable to determine user email from Clerk; cannot create Supabase user");
  }

  try {
    const { data: created, error: createErr } = await (supabase as any).auth.admin.createUser({
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

function defaultSchedule(): { startsAt: string; endsAt: string } {
  const s = new Date(Date.now() + 24 * 3600 * 1000);
  s.setHours(9, 0, 0, 0);
  const e = new Date(s.getTime() + 60 * 60 * 1000);
  return { startsAt: s.toISOString(), endsAt: e.toISOString() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await getClerkPayload(req);
    if ("error" in auth) return badRequest(auth.error, 401);
    const { payload } = auth;

    const supabase = createAdminClient();
    const ownerId = await resolveOwnerId(supabase, payload);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, customer_id, quote_id, address, starts_at, ends_at, status, total, created_at, updated_at")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        quoteId: r.quote_id,
        address: r.address,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        status: r.status,
        total: r.total,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return json({ rows });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as Partial<{
        quoteId: string;
        startsAt?: string;
        endsAt?: string;
        recurrence?: string | null;
      }>;
      const quoteId = (body.quoteId || "").toString();
      if (!quoteId) return badRequest("quoteId is required");

      const { data: quote, error: qErr } = await supabase
        .from("quotes")
        .select("id, owner_id, business_id, customer_id, address, total")
        .eq("id", quoteId)
        .eq("owner_id", ownerId)
        .single();
      if (qErr) return badRequest("Quote not found", 404);

      const { startsAt, endsAt } = body.startsAt && body.endsAt
        ? { startsAt: body.startsAt, endsAt: body.endsAt }
        : defaultSchedule();

      const insertPayload: any = {
        owner_id: ownerId,
        business_id: (quote as any).business_id,
        quote_id: quoteId,
        customer_id: (quote as any).customer_id,
        address: (quote as any).address ?? null,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "Scheduled",
        total: (quote as any).total,
        recurrence: body.recurrence ?? null,
      };

      const { data: ins, error: insErr } = await supabase
        .from("jobs")
        .insert(insertPayload)
        .select("id, customer_id, quote_id, address, starts_at, ends_at, status, total, created_at, updated_at")
        .single();
      if (insErr) throw insErr;

      const j = ins as any;
      console.log("[jobs][POST] created", { ownerId, jobId: j.id, quoteId });
      return json({ ok: true, job: {
        id: j.id,
        customerId: j.customer_id,
        quoteId: j.quote_id,
        address: j.address,
        startsAt: j.starts_at,
        endsAt: j.ends_at,
        status: j.status,
        total: j.total,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      } }, { status: 201 });
    }

    if (req.method === "PATCH") {
      const possibleId = pathParts[pathParts.length - 1];
      const id = url.searchParams.get("id") || (possibleId && possibleId !== "jobs" ? possibleId : null);
      if (!id) return badRequest("id is required in path or query");

      const body = (await req.json().catch(() => ({}))) as Partial<{
        status: string;
        startsAt: string;
        endsAt: string;
        notes: string | null;
      }>;

      // Ensure job exists and belongs to owner
      const { data: existing, error: exErr } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", id)
        .eq("owner_id", ownerId)
        .single();
      if (exErr) return badRequest("Job not found", 404);

      const upd: any = {};
      if (body.status) upd.status = body.status;
      if (body.startsAt) upd.starts_at = body.startsAt;
      if (body.endsAt) upd.ends_at = body.endsAt;
      if (body.notes !== undefined) upd.notes = body.notes;

      if (Object.keys(upd).length) {
        const { error: updErr } = await supabase.from("jobs").update(upd).eq("id", id).eq("owner_id", ownerId);
        if (updErr) throw updErr;
      }

      const { data: j2, error: selErr } = await supabase
        .from("jobs")
        .select("id, customer_id, quote_id, address, starts_at, ends_at, status, total, created_at, updated_at")
        .eq("id", id)
        .eq("owner_id", ownerId)
        .single();
      if (selErr) throw selErr;

      const j = j2 as any;
      return json({ ok: true, job: {
        id: j.id,
        customerId: j.customer_id,
        quoteId: j.quote_id,
        address: j.address,
        startsAt: j.starts_at,
        endsAt: j.ends_at,
        status: j.status,
        total: j.total,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      } });
    }

    return badRequest("Method not allowed", 405);
  } catch (e) {
    console.error("[jobs] error", e);
    return badRequest((e as any)?.message || String(e), 500);
  }
});
