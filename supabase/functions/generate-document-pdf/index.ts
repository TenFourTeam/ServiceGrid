import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type'); // 'quote' or 'invoice'
    const id = url.searchParams.get('id');

    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: 'Type and ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate customer
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from('customer_sessions')
      .select('*, customer_accounts(*, customers(id, name, business_id))')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = session.customer_accounts.customers.id;
    const businessId = session.customer_accounts.customers.business_id;

    // Fetch business info
    const { data: business } = await supabase
      .from('businesses')
      .select('name, phone, reply_to_email')
      .eq('id', businessId)
      .single();

    let documentData: any;
    let lineItems: any[] = [];
    let documentNumber: string;

    if (type === 'quote') {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select(`
          id, number, status, total, subtotal, tax_rate, discount,
          address, terms, deposit_required, deposit_percent, created_at,
          quote_line_items(name, qty, unit, unit_price, line_total, position)
        `)
        .eq('id', id)
        .eq('customer_id', customerId)
        .single();

      if (error || !quote) {
        return new Response(
          JSON.stringify({ error: 'Quote not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      documentData = quote;
      lineItems = quote.quote_line_items.sort((a: any, b: any) => a.position - b.position);
      documentNumber = quote.number;
    } else if (type === 'invoice') {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          id, number, status, total, subtotal, tax_rate, discount,
          address, terms, deposit_required, deposit_percent, created_at, due_at, paid_at,
          invoice_line_items(name, qty, unit, unit_price, line_total, position)
        `)
        .eq('id', id)
        .eq('customer_id', customerId)
        .single();

      if (error || !invoice) {
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      documentData = invoice;
      lineItems = invoice.invoice_line_items.sort((a: any, b: any) => a.position - b.position);
      documentNumber = invoice.number;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid document type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerName = session.customer_accounts.customers.name;
    const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Generate simple HTML PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .title { font-size: 28px; font-weight: bold; color: #1a1a1a; }
    .business-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
    .meta { color: #666; font-size: 14px; }
    .section { margin: 20px 0; }
    .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9f9f9; font-weight: 600; }
    .amount { text-align: right; }
    .totals { margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row.grand { font-size: 20px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 15px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-sent { background: #dbeafe; color: #1e40af; }
    .terms { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="business-name">${business?.name || 'Business'}</div>
      ${business?.phone ? `<div class="meta">${business.phone}</div>` : ''}
      ${business?.reply_to_email ? `<div class="meta">${business.reply_to_email}</div>` : ''}
    </div>
    <div style="text-align: right;">
      <div class="title">${type === 'quote' ? 'QUOTE' : 'INVOICE'}</div>
      <div class="meta">#${documentNumber}</div>
      <div class="meta">${formatDate(documentData.created_at)}</div>
      ${type === 'invoice' && documentData.due_at ? `<div class="meta">Due: ${formatDate(documentData.due_at)}</div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bill To</div>
    <div>${customerName}</div>
    ${documentData.address ? `<div class="meta">${documentData.address}</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th class="amount">Unit Price</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>${item.qty} ${item.unit || ''}</td>
            <td class="amount">${formatMoney(item.unit_price)}</td>
            <td class="amount">${formatMoney(item.line_total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="totals" style="max-width: 300px; margin-left: auto;">
    <div class="total-row">
      <span>Subtotal</span>
      <span>${formatMoney(documentData.subtotal)}</span>
    </div>
    ${documentData.discount > 0 ? `
      <div class="total-row" style="color: #16a34a;">
        <span>Discount</span>
        <span>-${formatMoney(documentData.discount)}</span>
      </div>
    ` : ''}
    ${documentData.tax_rate > 0 ? `
      <div class="total-row">
        <span>Tax (${(documentData.tax_rate * 100).toFixed(1)}%)</span>
        <span>${formatMoney(Math.round((documentData.subtotal - documentData.discount) * documentData.tax_rate))}</span>
      </div>
    ` : ''}
    <div class="total-row grand">
      <span>Total</span>
      <span>${formatMoney(documentData.total)}</span>
    </div>
    ${documentData.deposit_required && documentData.deposit_percent ? `
      <div class="total-row" style="font-size: 14px; color: #666;">
        <span>Deposit (${documentData.deposit_percent}%)</span>
        <span>${formatMoney(Math.round(documentData.total * (documentData.deposit_percent / 100)))}</span>
      </div>
    ` : ''}
  </div>

  ${documentData.terms ? `
    <div class="terms">
      <strong>Terms & Conditions</strong>
      <p style="margin: 10px 0 0;">${documentData.terms}</p>
    </div>
  ` : ''}
</body>
</html>
    `;

    // Return HTML with PDF content-type hint (frontend will handle print-to-PDF)
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${type}-${documentNumber}.html"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
