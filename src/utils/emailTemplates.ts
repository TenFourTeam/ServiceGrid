import type { Quote } from "@/types";
import { formatMoney } from "@/utils/format";

interface Params {
  businessName: string;
  businessLogoUrl?: string;
  customerName?: string;
  quote: Quote;
  approveUrl: string;
  editUrl: string;
  viewUrl: string;
  pixelUrl: string;
}

export function buildQuoteEmail({ businessName, businessLogoUrl, customerName, quote, approveUrl, editUrl, viewUrl, pixelUrl }: Params) {
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

  const termsParts: string[] = [];
  if (quote.paymentTerms) {
    const pt = quote.paymentTerms === 'due_on_receipt' ? 'Due on receipt' : quote.paymentTerms.replace('net_', 'Net ');
    termsParts.push(`Payment terms: ${pt}`);
  }
  if (quote.depositRequired && typeof quote.depositPercent === 'number') {
    termsParts.push(`Deposit: ${quote.depositPercent}% due on approval`);
  }
  if (quote.frequency) {
    const freq = quote.frequency.replace('-', ' ');
    termsParts.push(`Service frequency: ${escapeHtml(freq)}`);
  }

  const extraTerms = quote.terms ? escapeHtml(quote.terms).replace(/\n/g, '<br />') : '';
  const combinedTerms = [termsParts.join(' • '), extraTerms].filter(Boolean).join('<br />');

  const headerLeft = businessLogoUrl ? `<img src="${businessLogoUrl}" alt="${escapeHtml(businessName)} logo" style="height:32px; max-height:32px; border-radius:4px; display:block;" />` : `<span style="font-weight:600; font-size:16px; color:#f8fafc;">${escapeHtml(businessName)}</span>`;

  // New: Service address block
  const serviceAddressHtml = quote.address ? `
    <div style="margin:8px 0 0;">
      <div style="font-weight:600; margin-bottom:4px; color:#111827;">Service address</div>
      <div style="font-size:14px; line-height:1.6; color:#374151;">${escapeHtml(quote.address).replace(/\n/g, '<br />')}</div>
    </div>
  ` : '';

  // New: Quote details (payment terms, frequency, deposit)
  const paymentTermsLabel = quote.paymentTerms ? (quote.paymentTerms === 'due_on_receipt' ? 'Due on receipt' : quote.paymentTerms.replace('net_', 'Net ')) : '';
  const frequencyLabel = quote.frequency ? escapeHtml(quote.frequency.replace('-', ' ')) : '';
  const depositLabel = quote.depositRequired && typeof quote.depositPercent === 'number' ? `${quote.depositPercent}%` : '';

  const detailsHtml = (paymentTermsLabel || frequencyLabel || depositLabel) ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px;">
      <tr>
        <td style="padding:10px 12px; font-weight:600; color:#111827;">Quote details</td>
      </tr>
      <tr>
        <td style="padding:0 12px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="color:#374151;">
            ${paymentTermsLabel ? `<tr><td style="padding:6px 0; width:160px; color:#6b7280;">Payment terms</td><td style="padding:6px 0;">${paymentTermsLabel}</td></tr>` : ''}
            ${frequencyLabel ? `<tr><td style="padding:6px 0; width:160px; color:#6b7280;">Frequency</td><td style="padding:6px 0;">${frequencyLabel}</td></tr>` : ''}
            ${depositLabel ? `<tr><td style="padding:6px 0; width:160px; color:#6b7280;">Deposit</td><td style="padding:6px 0;">${depositLabel} due on approval</td></tr>` : ''}
          </table>
        </td>
      </tr>
    </table>
  ` : '';

  // New: Optional deposit row under totals (display only)
  const depositRow = (quote.depositRequired && typeof quote.depositPercent === 'number') ? (() => {
    const amt = Math.round((quote.total ?? 0) * ((quote.depositPercent ?? 0) / 100));
    return `
      <tr>
        <td style="padding:8px; text-align:right; color:#374151;">Deposit due on approval</td>
        <td style="padding:8px; text-align:right; font-weight:600;">${formatMoney(amt)}</td>
      </tr>
    `;
  })() : '';

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
              ${detailsHtml}

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
                ${depositRow}
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

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
