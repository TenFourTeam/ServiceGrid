import type { Quote } from "@/types";
import { formatMoney } from "@/utils/format";

interface Params {
  businessName: string;
  customerName?: string;
  quote: Quote;
  approveUrl: string;
  editUrl: string;
  viewUrl: string;
  pixelUrl: string;
}

export function buildQuoteEmail({ businessName, customerName, quote, approveUrl, editUrl, viewUrl, pixelUrl }: Params) {
  const subject = `${businessName} • Quote ${quote.number}`;
  const items = quote.lineItems.map(li => `
    <tr>
      <td style="padding:8px 4px;">${escapeHtml(li.name)}</td>
      <td style="padding:8px 4px; text-align:right;">${formatMoney(li.lineTotal)}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; color:#111;">
      <h2 style="margin:0 0 8px;">Quote ${quote.number}</h2>
      <p style="margin:0 0 16px;">${customerName ? `Hi ${escapeHtml(customerName)},` : 'Hello,'} here is your quote from ${escapeHtml(businessName)}.</p>
      <table style="width:100%; border-collapse:collapse; margin: 8px 0;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 4px; border-bottom:1px solid #eee;">Description</th>
            <th style="text-align:right; padding:8px 4px; border-bottom:1px solid #eee;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items}
          <tr>
            <td style="padding:8px 4px; text-align:right; font-weight:600;">Total</td>
            <td style="padding:8px 4px; text-align:right; font-weight:600;">${formatMoney(quote.total)}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin:16px 0; display:flex; gap:12px;">
        <a href="${approveUrl}" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 14px; border-radius:8px; text-decoration:none;">Approve</a>
        <a href="${editUrl}" style="display:inline-block; background:#eab308; color:#111; padding:10px 14px; border-radius:8px; text-decoration:none;">Request Edits</a>
        <a href="${viewUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 14px; border-radius:8px; text-decoration:none;">View Online</a>
      </div>
      <p style="font-size:12px; color:#666">If the buttons don't work, you can copy and paste these links into your browser.</p>
      <img src="${pixelUrl}" width="1" height="1" style="display:block; opacity:0;" alt="" />
    </div>
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
