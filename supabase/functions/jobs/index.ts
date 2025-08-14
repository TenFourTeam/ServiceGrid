// Supabase Edge Function: jobs
// - GET: list jobs with optional date filtering
// - POST: create a job from a quote or ad-hoc
// - PATCH: update a job (status/times/notes)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

const JOBS_NOTIFY_INTERNAL = (Deno.env.get("JOBS_NOTIFY_INTERNAL") || "").toLowerCase() === "true";

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

function defaultSchedule(): { startsAt: string; endsAt: string } {
  const s = new Date(Date.now() + 24 * 3600 * 1000);
  s.setHours(9, 0, 0, 0);
  const e = new Date(s.getTime() + 60 * 60 * 1000);
  return { startsAt: s.toISOString(), endsAt: e.toISOString() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");

    if (req.method === "GET") {
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      const countOnly = url.searchParams.get("count") === "true";

      if (countOnly) {
        let q = ctx.supaAdmin
          .from("jobs")
          .select("id", { count: 'exact', head: true })
          .eq("business_id", ctx.businessId);

        // Optional range filtering for count too
        if (start && end) {
          q = q.lt("starts_at", end).gt("ends_at", start);
        }

        const { count, error } = await q;
        if (error) throw error;
        return json({ count: count || 0 });
      }

      let q = ctx.supaAdmin
        .from("jobs")
        .select(
          "id, customer_id, quote_id, address, title, starts_at, ends_at, status, total, notes, photos, created_at, updated_at",
        )
        .eq("business_id", ctx.businessId);

      // Optional range filtering: return jobs that INTERSECT [start, end)
      if (start && end) {
        // starts_at < end AND ends_at > start
        q = q.lt("starts_at", end).gt("ends_at", start);
      }

      // Keep existing default ordering behavior for clients relying on it
      q = start && end
        ? q.order("starts_at", { ascending: true })
        : q.order("updated_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        quoteId: r.quote_id,
        address: r.address,
        title: r.title,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        status: r.status,
        total: r.total,
        notes: r.notes,
        photos: r.photos ?? [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      return json({ rows });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as Partial<{
        quoteId: string;
        customerId: string;
        address?: string | null;
        title?: string | null;
        startsAt?: string;
        endsAt?: string;
        status?: string;
        total?: number | null;
        notes?: string | null;
        photos?: string[];
        recurrence?: string | null;
      }>;

      // Branch 1: Create from quote
      if (body.quoteId) {
        const quoteId = (body.quoteId || "").toString();
        if (!quoteId) return badRequest("quoteId is required");

        const { data: quote, error: qErr } = await ctx.supaAdmin
          .from("quotes")
          .select("id, owner_id, business_id, customer_id, address, total")
          .eq("id", quoteId)
          .eq("business_id", ctx.businessId)
          .single();
        if (qErr) return badRequest("Quote not found", 404);

        const { startsAt, endsAt } = body.startsAt && body.endsAt
          ? { startsAt: body.startsAt, endsAt: body.endsAt }
          : defaultSchedule();

        const insertPayload: any = {
          owner_id: ctx.userId,
          business_id: ctx.businessId,
          quote_id: quoteId,
          customer_id: (quote as any).customer_id,
          address: (quote as any).address ?? null,
          title: body.title ?? null,
          starts_at: startsAt,
          ends_at: endsAt,
          status: body.status ?? "Scheduled",
          total: (quote as any).total,
          recurrence: body.recurrence ?? null,
          notes: body.notes ?? null,
          photos: body.photos ?? [],
        };

        const { data: ins, error: insErr } = await ctx.supaAdmin
          .from("jobs")
          .insert(insertPayload)
          .select("id, customer_id, quote_id, address, title, starts_at, ends_at, status, total, notes, photos, created_at, updated_at")
          .single();
        if (insErr) throw insErr;

        const j = ins as any;
        console.log("[jobs][POST] created from quote", { ownerId: ctx.userId, jobId: j.id, quoteId });

        if (JOBS_NOTIFY_INTERNAL) {
          try {
            const { data: biz } = await ctx.supaAdmin
              .from('businesses')
              .select('name, reply_to_email')
              .eq('id', ctx.businessId)
              .maybeSingle();
            const fromName = (biz as any)?.name || undefined;
            const replyTo = (biz as any)?.reply_to_email || null;
            let to: string | null = replyTo || null;
            if (!to) {
              const { data: prof } = await ctx.supaAdmin
                .from('profiles')
                .select('email')
                .eq('id', ctx.userId)
                .maybeSingle();
              to = (prof as any)?.email || null;
            }
            if (to) {
              const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
              const subject = `${fromName || 'Job'} • Job Created`;
              const html = `
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica Neue,Arial; color:#111827;">
                  <h2 style="margin:0 0 8px; font-size:18px;">Job Created</h2>
                  <div style="font-size:14px; line-height:1.6;">
                    <div><strong>Title:</strong> ${j.title ? String(j.title).replace(/</g,'&lt;') : 'Untitled'}</div>
                    <div><strong>Window:</strong> ${fmt(j.starts_at)} – ${fmt(j.ends_at)}</div>
                    ${j.address ? `<div><strong>Address:</strong> ${String(j.address).replace(/</g,'&lt;')}</div>` : ''}
                    <div style="margin-top:8px; color:#6b7280;">Job ID: ${j.id}</div>
                  </div>
                </div>`;
              await (ctx.supaAdmin as any).functions.invoke('resend-send-email', {
                body: { to, subject, html, job_id: j.id, from_name: fromName, reply_to: replyTo || undefined },
              });
            }
          } catch (e) {
            console.warn('[jobs][POST] notify failed', e);
          }
        }

        return json({ ok: true, job: {
          id: j.id,
          customerId: j.customer_id,
          quoteId: j.quote_id,
          address: j.address,
          title: j.title,
          startsAt: j.starts_at,
          endsAt: j.ends_at,
          status: j.status,
          total: j.total,
          notes: j.notes,
          photos: j.photos ?? [],
          createdAt: j.created_at,
          updatedAt: j.updated_at,
        } }, { status: 201 });
      }

      // Branch 2: Ad-hoc job creation (no quote)
      if (!body.customerId) return badRequest("customerId is required");

      const { data: customer, error: custErr } = await ctx.supaAdmin
        .from("customers")
        .select("id, owner_id, business_id, address")
        .eq("id", body.customerId)
        .eq("business_id", ctx.businessId)
        .single();
      if (custErr) return badRequest("Customer not found", 404);

      const sched = body.startsAt && body.endsAt ? { startsAt: body.startsAt, endsAt: body.endsAt } : defaultSchedule();

      const insertPayload2: any = {
        owner_id: ctx.userId,
        business_id: ctx.businessId,
        quote_id: null,
        customer_id: (customer as any).id,
        address: body.address ?? (customer as any).address ?? null,
        title: body.title ?? null,
        starts_at: sched.startsAt,
        ends_at: sched.endsAt,
        status: body.status ?? "Scheduled",
        total: body.total ?? null,
        recurrence: body.recurrence ?? null,
        notes: body.notes ?? null,
        photos: body.photos ?? [],
      };

      const { data: ins2, error: insErr2 } = await ctx.supaAdmin
        .from("jobs")
        .insert(insertPayload2)
        .select("id, customer_id, quote_id, address, title, starts_at, ends_at, status, total, notes, photos, created_at, updated_at")
        .single();
      if (insErr2) throw insErr2;

      const j2 = ins2 as any;
      console.log("[jobs][POST] created ad-hoc", { ownerId: ctx.userId, jobId: j2.id });

      if (JOBS_NOTIFY_INTERNAL) {
        try {
          const { data: biz } = await ctx.supaAdmin
            .from('businesses')
            .select('name, reply_to_email')
            .eq('id', ctx.businessId)
            .maybeSingle();
          const fromName = (biz as any)?.name || undefined;
          const replyTo = (biz as any)?.reply_to_email || null;
          let to: string | null = replyTo || null;
          if (!to) {
            const { data: prof } = await ctx.supaAdmin
              .from('profiles')
              .select('email')
              .eq('id', ctx.userId)
              .maybeSingle();
            to = (prof as any)?.email || null;
          }
          if (to) {
            const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
            const subject = `${fromName || 'Job'} • Job Created`;
            const html = `
            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica Neue,Arial; color:#111827;">
              <h2 style="margin:0 0 8px; font-size:18px;">Job Created</h2>
              <div style="font-size:14px; line-height:1.6;">
                <div><strong>Title:</strong> ${j2.title ? String(j2.title).replace(/</g,'&lt;') : 'Untitled'}</div>
                <div><strong>Window:</strong> ${fmt(j2.starts_at)} – ${fmt(j2.ends_at)}</div>
                ${j2.address ? `<div><strong>Address:</strong> ${String(j2.address).replace(/</g,'&lt;')}</div>` : ''}
                <div style="margin-top:8px; color:#6b7280;">Job ID: ${j2.id}</div>
              </div>
            </div>`;
            await (ctx.supaAdmin as any).functions.invoke('resend-send-email', {
              body: { to, subject, html, job_id: j2.id, from_name: fromName, reply_to: replyTo || undefined },
            });
          }
        } catch (e) {
          console.warn('[jobs][POST] notify failed', e);
        }
      }

      return json({ ok: true, job: {
        id: j2.id,
        customerId: j2.customer_id,
        quoteId: j2.quote_id,
        address: j2.address,
        title: j2.title,
        startsAt: j2.starts_at,
        endsAt: j2.ends_at,
        status: j2.status,
        total: j2.total,
        notes: j2.notes,
        photos: j2.photos ?? [],
        createdAt: j2.created_at,
        updatedAt: j2.updated_at,
      } }, { status: 201 });
    }

    if (req.method === "PATCH") {
      const possibleId = pathParts[pathParts.length - 1];
      const id = url.searchParams.get("id") || (possibleId && possibleId !== "jobs" ? possibleId : null);
      if (!id) return badRequest("id is required in path or query");

      const body = (await req.json().catch(() => ({}))) as Partial<{
        status: string;
        startsAt: string | null;
        endsAt: string | null;
        notes: string | null;
        photos: string[] | null;
        title: string | null;
        quoteId: string | null;
      }>;

      // Ensure job exists and belongs to business
      const { data: existing, error: exErr } = await ctx.supaAdmin
        .from("jobs")
        .select("id, customer_id, business_id, title, address, starts_at, ends_at")
        .eq("id", id)
        .eq("business_id", ctx.businessId)
        .single();
      if (exErr) return badRequest("Job not found", 404);

      const prevStarts = (existing as any).starts_at || null;
      const prevEnds = (existing as any).ends_at || null;
      const prevTitle = (existing as any).title || null;
      const prevAddress = (existing as any).address || null;
      const prevBusinessId = (existing as any).business_id;

      const upd: any = {};
      if (body.status) upd.status = body.status;

      const hasStartsAt = Object.prototype.hasOwnProperty.call(body, 'startsAt');
      const hasEndsAt = Object.prototype.hasOwnProperty.call(body, 'endsAt');

      if (hasStartsAt) upd.starts_at = (body as any).startsAt ?? null;
      if (hasEndsAt) upd.ends_at = (body as any).endsAt ?? null;

      if (body.status === 'Completed' && !hasEndsAt) {
        upd.ends_at = new Date().toISOString();
      }

      if (body.notes !== undefined) upd.notes = body.notes;
      if (body.photos !== undefined) upd.photos = body.photos ?? [];
      if (body.title !== undefined) upd.title = body.title;

      // Link or unlink a quote
      if (Object.prototype.hasOwnProperty.call(body, 'quoteId')) {
        const qid = (body as any).quoteId;
        if (qid === null) {
          upd.quote_id = null;
        } else if (qid) {
          const { data: quote, error: qErr } = await ctx.supaAdmin
            .from('quotes')
            .select('id, customer_id')
            .eq('id', qid)
            .eq('business_id', ctx.businessId)
            .single();
          if (qErr) return badRequest('Quote not found', 404);
          if ((quote as any).customer_id !== (existing as any).customer_id) {
            return badRequest('Quote and job must belong to the same customer', 400);
          }
          upd.quote_id = qid;
        }
      }

      if (Object.keys(upd).length) {
        const { error: updErr } = await ctx.supaAdmin.from("jobs").update(upd).eq("id", id).eq("business_id", ctx.businessId);
        if (updErr) throw updErr;
      }

      const { data: j2, error: selErr } = await ctx.supaAdmin
        .from("jobs")
        .select("id, customer_id, quote_id, address, title, starts_at, ends_at, status, total, notes, photos, created_at, updated_at")
        .eq("id", id)
        .eq("business_id", ctx.businessId)
        .single();
      if (selErr) throw selErr;

      const j = j2 as any;

      // Notify on reschedule if time window changed
      if (JOBS_NOTIFY_INTERNAL) {
        try {
          const changed = (hasStartsAt ? (((body as any).startsAt ?? null) !== prevStarts) : false) || (hasEndsAt ? (((body as any).endsAt ?? null) !== prevEnds) : false);
          if (changed) {
            const { data: biz } = await ctx.supaAdmin
              .from('businesses')
              .select('name, reply_to_email')
              .eq('id', ctx.businessId)
              .maybeSingle();
            const fromName = (biz as any)?.name || undefined;
            const replyTo = (biz as any)?.reply_to_email || null;
            let to: string | null = replyTo || null;
            if (!to) {
              const { data: prof } = await ctx.supaAdmin
                .from('profiles')
                .select('email')
                .eq('id', ctx.userId)
                .maybeSingle();
              to = (prof as any)?.email || null;
            }
            if (to) {
              const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
              const subject = `${fromName || 'Job'} • Job Rescheduled`;
              const html = `
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica Neue,Arial; color:#111827;">
                  <h2 style="margin:0 0 8px; font-size:18px;">Job Rescheduled</h2>
                  <div style="font-size:14px; line-height:1.6;">
                    <div><strong>Title:</strong> ${j.title ? String(j.title).replace(/</g,'&lt;') : (prevTitle ? String(prevTitle).replace(/</g,'&lt;') : 'Untitled')}</div>
                    <div><strong>Old Window:</strong> ${fmt(prevStarts)} – ${fmt(prevEnds)}</div>
                    <div><strong>New Window:</strong> ${fmt(j.starts_at)} – ${fmt(j.ends_at)}</div>
                    ${j.address ? `<div><strong>Address:</strong> ${String(j.address).replace(/</g,'&lt;')}</div>` : (prevAddress ? `<div><strong>Address:</strong> ${String(prevAddress).replace(/</g,'&lt;') }</div>` : '')}
                    <div style="margin-top:8px; color:#6b7280;">Job ID: ${j.id}</div>
                  </div>
                </div>`;
              await (ctx.supaAdmin as any).functions.invoke('resend-send-email', {
                body: { to, subject, html, job_id: j.id, from_name: fromName, reply_to: replyTo || undefined },
              });
            }
          }
        } catch (e) {
          console.warn('[jobs][PATCH] reschedule notify failed', e);
        }
      }

      return json({ ok: true, job: {
        id: j.id,
        customerId: j.customer_id,
        quoteId: j.quote_id,
        address: j.address,
        title: j.title,
        startsAt: j.starts_at,
        endsAt: j.ends_at,
        status: j.status,
        total: j.total,
        notes: j.notes,
        photos: j.photos ?? [],
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
