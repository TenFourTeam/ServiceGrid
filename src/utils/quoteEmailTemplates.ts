import type { Quote } from "@/types";
import { buildQuoteEmail } from "./emailTemplates";

interface QuoteEmailConfig {
  businessName: string;
  businessLogoUrl?: string;
  customerName?: string;
  quote: Quote;
  baseUrl?: string;
}

/**
 * Generate quote email HTML and URLs for sending
 */
export function generateQuoteEmail({
  businessName,
  businessLogoUrl,
  customerName,
  quote,
  baseUrl = window.location.origin
}: QuoteEmailConfig) {
  // Generate action URLs
  const approveUrl = `${baseUrl}/quote-action?type=approve&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
  const editUrl = `${baseUrl}/quote-action?type=edit&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
  const viewUrl = `${baseUrl}/quote/${encodeURIComponent(quote.publicToken)}`;
  
  // Generate tracking pixel URL - use environment-agnostic approach
  const supabaseUrl = typeof window !== 'undefined' 
    ? (window as any).VITE_SUPABASE_URL || "https://ijudkzqfriazabiosnvb.supabase.co"
    : "https://ijudkzqfriazabiosnvb.supabase.co";
  const pixelUrl = `${supabaseUrl}/functions/v1/quote-events?type=open&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
  
  // Build email content
  const emailContent = buildQuoteEmailTemplate({
    businessName,
    businessLogoUrl,
    customerName,
    quote,
    approveUrl,
    editUrl,
    pixelUrl
  });

  return {
    ...emailContent,
    urls: {
      approve: approveUrl,
      edit: editUrl,
      view: viewUrl,
      pixel: pixelUrl
    }
  };
}

/**
 * Generate default subject line for quote emails
 */
export function generateQuoteSubject(businessName: string, quoteNumber: string): string {
  return `${businessName} • Quote ${quoteNumber}`;
}

/**
 * Build quote email HTML template
 */
export function buildQuoteEmailTemplate({
  businessName,
  businessLogoUrl,
  customerName,
  quote,
  approveUrl,
  editUrl,
  pixelUrl
}: {
  businessName: string;
  businessLogoUrl?: string;
  customerName?: string;
  quote: Quote;
  approveUrl: string;
  editUrl: string;
  pixelUrl: string;
}) {
  const subject = `${businessName} • Quote ${quote.number}`;

  const taxAmount = Math.max(0, (quote.total ?? 0) - ((quote.subtotal ?? 0) - (quote.discount ?? 0)));
  const taxPctLabel = isFinite(quote.taxRate) ? `${Math.round((quote.taxRate ?? 0) * 100)}%` : '';

  const itemsRows = quote.lineItems.map(li => {
    const qtyLabel = `${li.qty}${li.unit ? ' ' + escapeHtml(li.unit) : ''}`;
    return `
      <tr>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb;">${escapeHtml(li.name)}</td>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:center; color:#374151;">${qtyLabel}</td>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:right; color:#374151;">${formatMoney(li.unitPrice)}</td>
        <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">${formatMoney(li.lineTotal)}</td>
      </tr>
    `;
  }).join("");

  const discountRow = (quote.discount ?? 0) > 0 ? `
    <tr>
      <td colspan="3" style="padding:8px; text-align:right; color:#374151;">Discount</td>
      <td style="padding:8px; text-align:right; font-weight:600;">- ${formatMoney(quote.discount)}</td>
    </tr>
  ` : '';

  const headerLeft = businessLogoUrl 
    ? `<img src="${businessLogoUrl}" alt="${escapeHtml(businessName)} logo" style="height:32px; max-height:32px; border-radius:4px; display:block;" />`
    : `<span style="font-weight:600; font-size:16px; color:#f8fafc;">${escapeHtml(businessName)}</span>`;

  const serviceAddressHtml = quote.address ? `
    <div style="margin:8px 0 0;">
      <div style="font-weight:600; margin-bottom:4px; color:#111827;">Service address</div>
      <div style="font-size:14px; line-height:1.6; color:#374151;">${escapeHtml(quote.address).replace(/\n/g, '<br />')}</div>
    </div>
  ` : '';

  const html = `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:24px 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; color:#111827;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
          <tr>
            <td style="background:#111827; padding:16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">${headerLeft}</td>
                  <td align="right" style="color:#f8fafc; font-weight:600;">Quote ${escapeHtml(quote.number)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;">
              ${serviceAddressHtml}
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:8px;">
                <thead>
                  <tr>
                    <th align="left" style="padding:8px; border-bottom:1px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:.02em; color:#6b7280;">Description</th>
                    <th align="center" style="padding:8px; border-bottom:1px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:.02em; color:#6b7280;">Qty</th>
                    <th align="right" style="padding:8px; border-bottom:1px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:.02em; color:#6b7280;">Price</th>
                    <th align="right" style="padding:8px; border-bottom:1px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:.02em; color:#6b7280;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr>
                  <td style="padding:8px; text-align:right; color:#374151;">Subtotal</td>
                  <td style="padding:8px; text-align:right; font-weight:600;" width="160">${formatMoney(quote.subtotal)}</td>
                </tr>
                ${discountRow}
                <tr>
                  <td style="padding:8px; text-align:right; color:#374151;">Tax ${taxPctLabel ? `(${taxPctLabel})` : ''}</td>
                  <td style="padding:8px; text-align:right; font-weight:600;">${formatMoney(taxAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 8px; text-align:right; font-weight:700; border-top:1px solid #e5e7eb;">Total</td>
                  <td style="padding:12px 8px; text-align:right; font-weight:700; border-top:1px solid #e5e7eb;">${formatMoney(quote.total)}</td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
                <tr>
                  <td align="left">
                    <a href="${approveUrl}" style="display:inline-block; background:#111827; color:#f8fafc; padding:12px 16px; border-radius:8px; text-decoration:none; font-weight:600;">Approve</a>
                    <span style="display:inline-block; width:8px;">&nbsp;</span>
                    <a href="${editUrl}" style="display:inline-block; background:#f1f5f9; color:#111827; padding:12px 16px; border-radius:8px; text-decoration:none; font-weight:600; border:1px solid #e5e7eb;">Request Edits</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <img src="${pixelUrl}" width="1" height="1" style="display:block; opacity:0;" alt="" />
      </td>
    </tr>
  </table>
  `;
  return { subject, html };
}

/**
 * Combine user message with quote email HTML
 */
export function combineMessageWithQuote(message: string, quoteHtml: string): string {
  if (!message?.trim()) return quoteHtml;
  
  // Escape HTML and convert newlines to breaks
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
  
  const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safeMessage}</div>`;
  const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
  
  return `${introBlock}${hr}${quoteHtml}`;
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(cents: number | undefined): string {
  if (typeof cents !== 'number') return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}