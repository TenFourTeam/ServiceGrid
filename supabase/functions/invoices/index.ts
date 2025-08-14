// Supabase Edge Function: invoices
// - GET: list invoices
// - POST: create an invoice from a job (using quote items and tax)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

async function nextInvoiceNumber(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.54.0").createClient>,
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const countOnly = url.searchParams.get("count") === "true";
      
      if (countOnly) {
        const { count, error } = await ctx.supaAdmin
          .from("invoices")
          .select("id", { count: 'exact', head: true })
          .eq("business_id", ctx.businessId);
        if (error) throw error;
        return json({ count: count || 0 });
      }
      
      const { data, error } = await ctx.supaAdmin
        .from("invoices")
        .select("id, number, customer_id, job_id, subtotal, total, tax_rate, discount, status, due_at, created_at, updated_at, public_token")
        .eq("business_id", ctx.businessId)
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
      const { data: job, error: jErr } = await ctx.supaAdmin
        .from("jobs")
        .select("id, owner_id, business_id, customer_id, quote_id")
        .eq("id", jobId)
        .eq("business_id", ctx.businessId)
        .single();
      if (jErr) return badRequest("Job not found", 404);

      const customerId = (job as any).customer_id as string | null;
      if (!customerId) return badRequest("Job has no linked customer; cannot create invoice");
      const quoteId = (job as any).quote_id as string | null;

      // Load items from quote
      if (!quoteId) return badRequest("Job has no linked quote; cannot create invoice");
      const { data: quote, error: qErr } = await ctx.supaAdmin
        .from("quotes")
        .select("tax_rate")
        .eq("id", quoteId)
        .eq("business_id", ctx.businessId)
        .single();
      if (qErr) throw qErr;
      const taxRate = Number((quote as any).tax_rate ?? 0) || 0;

      const { data: items, error: itemsErr } = await ctx.supaAdmin
        .from("quote_line_items")
        .select("position, name, unit, qty, unit_price")
        .eq("quote_id", quoteId)
        .eq("owner_id", ctx.userId)
        .order("position", { ascending: true });
      if (itemsErr) throw itemsErr;
      if (!items || !items.length) return badRequest("No quote line items found");

      const subtotal = items.reduce((sum: number, i: any) => sum + Math.round(i.unit_price) * Math.max(1, Math.round(i.qty)), 0);
      const taxAmount = Math.round(subtotal * taxRate);
      const discount = 0;
      const total = subtotal + taxAmount - discount;

      const number = await nextInvoiceNumber(ctx.supaAdmin, ctx.businessId);

      const insertPayload: any = {
        owner_id: ctx.userId,
        business_id: ctx.businessId,
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

      const { data: inv, error: invErr } = await ctx.supaAdmin
        .from("invoices")
        .insert(insertPayload)
        .select("id, number, customer_id, job_id, subtotal, total, tax_rate, discount, status, due_at, created_at, updated_at, public_token")
        .single();
      if (invErr) throw invErr;

      const invoiceId = (inv as any).id as string;
      const invItems = (items || []).map((i: any, idx: number) => ({
        owner_id: ctx.userId,
        invoice_id: invoiceId,
        position: idx,
        name: i.name,
        unit: i.unit,
        qty: Math.max(1, Math.round(i.qty)),
        unit_price: Math.round(i.unit_price),
        line_total: Math.round(i.unit_price) * Math.max(1, Math.round(i.qty)),
      }));
      const { error: liErr } = await ctx.supaAdmin.from("invoice_line_items").insert(invItems);
      if (liErr) throw liErr;

      const r = inv as any;
      console.log("[invoices][POST] created", { ownerId: ctx.userId, invoiceId: r.id, jobId });
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