// Supabase Edge Function: invoices
// - Verifies Clerk token
// - Resolves/creates a Supabase user mapping via profiles (owner_id)
// - GET: list invoices
// - POST: create an invoice from a job (using quote items and tax)

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

async function nextInvoiceNumber(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const { data: biz, error: selErr } = await supabase
      .from("businesses")
      .select("inv_seq, inv_prefix")
      .eq("id", businessId)
      .single();
    if (selErr) throw selErr;
    const current = (biz as any).inv_seq as number;
    const prefix = (biz as any).inv_prefix as string;
    const next = current + 1;
    const { data: upd, error: updErr } = await supabase
      .from("businesses")
      .update({ inv_seq: next })
      .eq("id", businessId)
      .eq("inv_seq", current)
      .select("inv_seq, inv_prefix")
      .single();
    if (updErr) {
      continue;
    }
    const seq = (upd as any).inv_seq as number;
    const pfx = (upd as any).inv_prefix as string;
    const num = pfx + String(seq).padStart(3, "0");
    return num;
  }
  throw new Error("Failed to generate invoice number after retries");
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
        .from("invoices")
        .select("id, number, customer_id, job_id, subtotal, total, tax_rate, discount, status, due_at, created_at, updated_at, public_token")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({
        id: r.id,
        number: r.number,
        customerId: r.customer_id,
        jobId: r.job_id,
        subtotal: r.subtotal,
        total: r.total,
        taxRate: r.tax_rate,
        discount: r.discount,
        status: r.status,
        dueAt: r.due_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        publicToken: r.public_token,
      }));
      return json({ rows });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as Partial<{
        jobId: string;
        dueAt?: string | null;
      }>;
      const jobId = (body.jobId || "").toString();
      if (!jobId) return badRequest("jobId is required");

      // Load job and validate ownership
      const { data: job, error: jErr } = await supabase
        .from("jobs")
        .select("id, owner_id, business_id, customer_id, quote_id")
        .eq("id", jobId)
        .eq("owner_id", ownerId)
        .single();
      if (jErr) return badRequest("Job not found", 404);

      const businessId = (job as any).business_id as string;
      const customerId = (job as any).customer_id as string;
      const quoteId = (job as any).quote_id as string | null;

      // Load items from quote
      if (!quoteId) return badRequest("Job has no linked quote; cannot create invoice");
      const { data: quote, error: qErr } = await supabase
        .from("quotes")
        .select("tax_rate")
        .eq("id", quoteId)
        .eq("owner_id", ownerId)
        .single();
      if (qErr) throw qErr;
      const taxRate = Number((quote as any).tax_rate ?? 0) || 0;

      const { data: items, error: itemsErr } = await supabase
        .from("quote_line_items")
        .select("position, name, unit, qty, unit_price")
        .eq("quote_id", quoteId)
        .eq("owner_id", ownerId)
        .order("position", { ascending: true });
      if (itemsErr) throw itemsErr;
      if (!items || !items.length) return badRequest("No quote line items found");

      const subtotal = items.reduce((sum: number, i: any) => sum + Math.round(i.unit_price) * Math.max(1, Math.round(i.qty)), 0);
      const taxAmount = Math.round(subtotal * taxRate);
      const discount = 0;
      const total = subtotal + taxAmount - discount;

      const number = await nextInvoiceNumber(supabase, businessId);

      const insertPayload: any = {
        owner_id: ownerId,
        business_id: businessId,
        customer_id: customerId,
        job_id: jobId,
        number,
        subtotal,
        tax_rate: taxRate,
        discount,
        total,
        status: "Draft",
        due_at: body.dueAt ?? new Date(Date.now() + 7*24*3600*1000).toISOString(),
      };

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert(insertPayload)
        .select("id, number, customer_id, job_id, subtotal, total, tax_rate, discount, status, due_at, created_at, updated_at, public_token")
        .single();
      if (invErr) throw invErr;

      const invoiceId = (inv as any).id as string;
      const invItems = (items || []).map((i: any, idx: number) => ({
        owner_id: ownerId,
        invoice_id: invoiceId,
        position: idx,
        name: i.name,
        unit: i.unit,
        qty: Math.max(1, Math.round(i.qty)),
        unit_price: Math.round(i.unit_price),
        line_total: Math.round(i.unit_price) * Math.max(1, Math.round(i.qty)),
      }));
      const { error: liErr } = await supabase.from("invoice_line_items").insert(invItems);
      if (liErr) throw liErr;

      const r = inv as any;
      console.log("[invoices][POST] created", { ownerId, invoiceId: r.id, jobId });
      return json({ ok: true, invoice: {
        id: r.id,
        number: r.number,
        customerId: r.customer_id,
        jobId: r.job_id,
        subtotal: r.subtotal,
        total: r.total,
        taxRate: r.tax_rate,
        discount: r.discount,
        status: r.status,
        dueAt: r.due_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        publicToken: r.public_token,
      } }, { status: 201 });
    }

    return badRequest("Method not allowed", 405);
  } catch (e) {
    console.error("[invoices] error", e);
    return badRequest((e as any)?.message || String(e), 500);
  }
});
