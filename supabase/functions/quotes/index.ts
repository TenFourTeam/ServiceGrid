// Supabase Edge Function: quotes
// - Verifies Clerk token
// - Resolves/creates a Supabase user mapping via profiles (owner_id)
// - Ensures default business
// - GET: list quotes with customer info
// - POST: create a draft quote with line items and computed totals

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

  // 3) Create Supabase auth user, then insert profile
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

async function nextEstimateNumber(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
): Promise<string> {
  // Optimistic concurrency loop
  for (let i = 0; i < 10; i++) {
    const { data: biz, error: selErr } = await supabase
      .from("businesses")
      .select("est_seq, est_prefix")
      .eq("id", businessId)
      .single();
    if (selErr) throw selErr;
    const current = (biz as any).est_seq as number;
    const prefix = (biz as any).est_prefix as string;
    const next = current + 1;
    const { data: upd, error: updErr } = await supabase
      .from("businesses")
      .update({ est_seq: next })
      .eq("id", businessId)
      .eq("est_seq", current)
      .select("est_seq, est_prefix")
      .single();
    if (updErr) {
      // retry on conflict
      continue;
    }
    const seq = (upd as any).est_seq as number;
    const pfx = (upd as any).est_prefix as string;
    const num = pfx + String(seq).padStart(3, "0");
    return num;
  }
  throw new Error("Failed to generate estimate number after retries");
}

interface CreateQuotePayload {
  customerId: string;
  address?: string | null;
  lineItems: Array<{
    name: string;
    qty?: number;
    unit?: string | null;
    unitPrice?: number; // cents
    lineTotal?: number; // cents
  }>;
  taxRate: number; // 0..1
  discount: number; // cents
  paymentTerms?: string | null;
  frequency?: string | null;
  depositRequired?: boolean;
  depositPercent?: number | null;
  notesInternal?: string | null;
  terms?: string | null;
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
        .from("quotes")
        .select("id, number, total, status, updated_at, public_token, view_count, customer_id, customers(name,email)")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({
        id: r.id,
        number: r.number,
        total: r.total,
        status: r.status,
        updatedAt: r.updated_at,
        publicToken: r.public_token,
        viewCount: r.view_count ?? 0,
        customerId: r.customer_id,
        customerName: r.customers?.name || null,
        customerEmail: r.customers?.email || null,
      }));
      return json({ rows });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as Partial<CreateQuotePayload>;
      const customerId = (body.customerId || "").toString();
      if (!customerId) return badRequest("customerId is required");
      const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
      if (!lineItems.length) return badRequest("At least one line item is required");

      const businessId = await ensureDefaultBusiness(supabase, ownerId);
      const number = await nextEstimateNumber(supabase, businessId);

      // Sanitize items and compute totals
      const items = lineItems
        .map((i) => ({
          name: String(i.name || "").trim(),
          qty: Math.max(1, Math.round(Number(i.qty || 1))),
          unit: i.unit ? String(i.unit) : null,
          unit_price: typeof i.unitPrice === "number" ? Math.max(0, Math.round(i.unitPrice))
            : typeof i.lineTotal === "number" ? Math.max(0, Math.round(i.lineTotal)) : 0,
        }))
        .filter((i) => i.name && i.unit_price >= 0);

      if (!items.length) return badRequest("Line items are invalid");

      const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);
      const taxRate = Math.max(0, Number(body.taxRate ?? 0));
      const discount = Math.max(0, Math.round(Number(body.discount ?? 0)));
      const taxAmount = Math.round(subtotal * taxRate);
      const total = subtotal + taxAmount - discount;

      const insertPayload: any = {
        owner_id: ownerId,
        business_id: businessId,
        customer_id: customerId,
        address: body.address ?? null,
        number,
        tax_rate: taxRate,
        discount,
        subtotal,
        total,
        status: "Draft",
        notes_internal: body.notesInternal ?? null,
        terms: body.terms ?? null,
        payment_terms: body.paymentTerms ?? null,
        frequency: body.frequency ?? null,
        deposit_required: Boolean(body.depositRequired),
        deposit_percent: body.depositPercent ?? null,
      };

      const { data: q, error: insErr } = await supabase
        .from("quotes")
        .insert(insertPayload)
        .select("id, number, total, status, created_at, updated_at, public_token, view_count, customer_id, tax_rate, discount, subtotal")
        .single();
      if (insErr) throw insErr;

      const quoteId = (q as any).id as string;
      const itemsRows = items.map((i, idx) => ({
        owner_id: ownerId,
        quote_id: quoteId,
        position: idx,
        name: i.name,
        unit: i.unit,
        qty: i.qty,
        unit_price: i.unit_price,
        line_total: i.unit_price * i.qty,
      }));

      const { error: itemsErr } = await supabase.from("quote_line_items").insert(itemsRows);
      if (itemsErr) throw itemsErr;

      return json({
        ok: true,
        quote: {
          id: q.id,
          number: q.number,
          total: q.total,
          status: q.status,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
          publicToken: q.public_token,
          viewCount: q.view_count ?? 0,
          customerId: q.customer_id,
          taxRate: q.tax_rate,
          discount: q.discount,
          subtotal: q.subtotal,
        },
      }, { status: 201 });
    }

    return badRequest("Method not allowed", 405);
  } catch (e) {
    console.error("[quotes]", e);
    return json({ error: (e as any)?.message || "Unexpected error" }, { status: 500 });
  }
});
