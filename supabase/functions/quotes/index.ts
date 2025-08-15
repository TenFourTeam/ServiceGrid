// Supabase Edge Function: quotes
// - GET: list quotes with customer info
// - POST: create a draft quote with line items and computed totals
// - PATCH: update quotes

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

async function nextEstimateNumber(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.54.0").createClient>,
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const countOnly = url.searchParams.get("count") === "true";
      const quoteId = url.searchParams.get("id");
      
      if (countOnly) {
        const { count, error } = await ctx.supaAdmin
          .from("quotes")
          .select("id", { count: 'exact', head: true })
          .eq("business_id", ctx.businessId);
        if (error) throw error;
        return json({ count: count || 0 });
      }

      // Single quote fetch by ID
      if (quoteId) {
        const { data: quote, error } = await ctx.supaAdmin
          .from("quotes")
          .select(`
            id, number, total, status, created_at, updated_at, public_token, view_count, 
            customer_id, business_id, address, tax_rate, discount, subtotal, 
            notes_internal, terms, payment_terms, frequency, deposit_required, deposit_percent,
            customers(name, email)
          `)
          .eq("id", quoteId)
          .eq("business_id", ctx.businessId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            return badRequest("Quote not found", 404);
          }
          throw error;
        }

        // Fetch line items
        const { data: lineItems, error: lineItemsError } = await ctx.supaAdmin
          .from("quote_line_items")
          .select("id, name, unit, qty, unit_price, line_total, position")
          .eq("quote_id", quoteId)
          .eq("owner_id", ctx.userId)
          .order("position");
        
        if (lineItemsError) throw lineItemsError;

        // Transform to UI format
        const fullQuote = {
          id: quote.id,
          number: quote.number,
          businessId: quote.business_id,
          customerId: quote.customer_id,
          customerName: quote.customers?.name || null,
          customerEmail: quote.customers?.email || null,
          address: quote.address,
          lineItems: (lineItems || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
            qty: item.qty,
            unitPrice: item.unit_price,
            lineTotal: item.line_total,
          })),
          taxRate: quote.tax_rate,
          discount: quote.discount,
          subtotal: quote.subtotal,
          total: quote.total,
          status: quote.status,
          createdAt: quote.created_at,
          updatedAt: quote.updated_at,
          publicToken: quote.public_token,
          viewCount: quote.view_count ?? 0,
          notesInternal: quote.notes_internal,
          terms: quote.terms,
          paymentTerms: quote.payment_terms,
          frequency: quote.frequency,
          depositRequired: quote.deposit_required,
          depositPercent: quote.deposit_percent,
        };

        return json(fullQuote);
      }
      
      // List all quotes (existing behavior)
      const { data, error } = await ctx.supaAdmin
        .from("quotes")
        .select("id, number, total, status, updated_at, public_token, view_count, customer_id, customers(name,email)")
        .eq("business_id", ctx.businessId)
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

      const number = await nextEstimateNumber(ctx.supaAdmin, ctx.businessId);

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
        owner_id: ctx.userId,
        business_id: ctx.businessId,
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

      const { data: q, error: insErr } = await ctx.supaAdmin
        .from("quotes")
        .insert(insertPayload)
        .select("id, number, total, status, created_at, updated_at, public_token, view_count, customer_id, tax_rate, discount, subtotal")
        .single();
      if (insErr) throw insErr;

      const quoteId = (q as any).id as string;
      const itemsRows = items.map((i, idx) => ({
        owner_id: ctx.userId,
        quote_id: quoteId,
        position: idx,
        name: i.name,
        unit: i.unit,
        qty: i.qty,
        unit_price: i.unit_price,
        line_total: i.unit_price * i.qty,
      }));

      const { error: itemsErr } = await ctx.supaAdmin.from("quote_line_items").insert(itemsRows);
      if (itemsErr) throw itemsErr;

      console.log("[quotes][POST] created", { ownerId: ctx.userId, quoteId, items: items.length, total });

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

    if (req.method === "PATCH") {
      // URL can be /functions/v1/quotes/:id or have ?id=
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const possibleId = pathParts[pathParts.length - 1];
      const id = url.searchParams.get("id") || (possibleId && possibleId !== "quotes" ? possibleId : null);
      if (!id) return badRequest("id is required in path or query");

      const body = (await req.json().catch(() => ({}))) as Partial<CreateQuotePayload>;

      // Ensure quote exists and belongs to business
      const { data: existing, error: exErr } = await ctx.supaAdmin
        .from("quotes")
        .select("id, owner_id, customer_id")
        .eq("id", id)
        .eq("business_id", ctx.businessId)
        .single();
      if (exErr) return badRequest("Quote not found", 404);

      const lineItems = Array.isArray(body.lineItems) ? body.lineItems : [];
      // Sanitize items and compute totals (allow empty to keep existing? We'll recompute from provided list)
      const items = lineItems
        .map((i) => ({
          name: String(i.name || "").trim(),
          qty: Math.max(1, Math.round(Number(i.qty || 1))),
          unit: i.unit ? String(i.unit) : null,
          unit_price: typeof i.unitPrice === "number" ? Math.max(0, Math.round(i.unitPrice))
            : typeof i.lineTotal === "number" ? Math.max(0, Math.round(i.lineTotal)) : 0,
        }))
        .filter((i) => i.name && i.unit_price >= 0);

      let subtotal: number | undefined;
      let taxRate: number | undefined;
      let discount: number | undefined;
      let total: number | undefined;

      if (items.length) {
        subtotal = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);
      }
      if (typeof body.taxRate === "number") taxRate = Math.max(0, Number(body.taxRate));
      if (typeof body.discount === "number") discount = Math.max(0, Math.round(Number(body.discount)));

      const taxBase = typeof subtotal === "number" ? subtotal : undefined;
      if (typeof taxRate === "number" && typeof taxBase === "number") {
        const taxAmount = Math.round(taxBase * taxRate);
        total = (taxBase + taxAmount) - (typeof discount === "number" ? discount : 0);
      }

      const upd: any = {};
      if (body.address !== undefined) upd.address = body.address;
      if (typeof taxRate === "number") upd.tax_rate = taxRate;
      if (typeof discount === "number") upd.discount = discount;
      if (typeof subtotal === "number") upd.subtotal = subtotal;
      if (typeof total === "number") upd.total = total;
      if (body.notesInternal !== undefined) upd.notes_internal = body.notesInternal;
      if (body.terms !== undefined) upd.terms = body.terms;
      if (body.paymentTerms !== undefined) upd.payment_terms = body.paymentTerms;
      if (body.frequency !== undefined) upd.frequency = body.frequency;
      if (body.depositRequired !== undefined) upd.deposit_required = Boolean(body.depositRequired);
      if (body.depositPercent !== undefined) upd.deposit_percent = body.depositPercent;

      if (Object.keys(upd).length) {
        const { error: updErr } = await ctx.supaAdmin.from("quotes").update(upd).eq("id", id).eq("business_id", ctx.businessId);
        if (updErr) throw updErr;
      }

      if (items.length) {
        // Replace line items
        const { error: delErr } = await ctx.supaAdmin.from("quote_line_items").delete().eq("quote_id", id).eq("owner_id", ctx.userId);
        if (delErr) throw delErr;
        const itemsRows = items.map((i, idx) => ({
          owner_id: ctx.userId,
          quote_id: id,
          position: idx,
          name: i.name,
          unit: i.unit,
          qty: i.qty,
          unit_price: i.unit_price,
          line_total: i.unit_price * i.qty,
        }));
        const { error: itemsErr } = await ctx.supaAdmin.from("quote_line_items").insert(itemsRows);
        if (itemsErr) throw itemsErr;
      }

      const { data: q2, error: selErr } = await ctx.supaAdmin
        .from("quotes")
        .select("id, number, total, status, created_at, updated_at, public_token, view_count, customer_id, tax_rate, discount, subtotal")
        .eq("id", id)
        .eq("business_id", ctx.businessId)
        .single();
      if (selErr) throw selErr;

      console.log("[quotes][PATCH] updated", { ownerId: ctx.userId, id, items: items.length, total: (q2 as any).total });

      return json({ ok: true, quote: {
        id: (q2 as any).id,
        number: (q2 as any).number,
        total: (q2 as any).total,
        status: (q2 as any).status,
        createdAt: (q2 as any).created_at,
        updatedAt: (q2 as any).updated_at,
        publicToken: (q2 as any).public_token,
        viewCount: (q2 as any).view_count ?? 0,
        customerId: (q2 as any).customer_id,
        taxRate: (q2 as any).tax_rate,
        discount: (q2 as any).discount,
        subtotal: (q2 as any).subtotal,
      }});
    }

    return badRequest("Method not allowed", 405);
  } catch (e) {
    console.error("[quotes]", e);
    return json({ error: (e as any)?.message || "Unexpected error" }, { status: 500 });
  }
});
