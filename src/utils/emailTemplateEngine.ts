import type { Quote, Invoice } from "@/types";
import { formatMoney } from "@/utils/format";
import { escapeHtml } from "@/utils/sanitize";

// ============= SHARED EMAIL COMPONENTS =============

export interface EmailBaseProps {
  businessName: string;
  businessLogoUrl?: string;
}

export interface EmailStyles {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontFamily: string;
}

const DEFAULT_STYLES: EmailStyles = {
  primaryColor: '#111827',
  backgroundColor: '#f1f5f9',
  textColor: '#111827',
  borderColor: '#e5e7eb',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
};

/**
 * Generate common email header with business branding
 */
export function createEmailHeader(
  businessName: string, 
  businessLogoUrl?: string, 
  title?: string,
  styles: EmailStyles = DEFAULT_STYLES
): string {
  const headerLeft = businessLogoUrl 
    ? `<img src="${businessLogoUrl}" alt="${escapeHtml(businessName)} logo" style="height:32px; max-height:32px; border-radius:4px; display:block;" />`
    : `<span style="font-weight:600; font-size:16px; color:#f8fafc;">${escapeHtml(businessName)}</span>`;

  return `
    <tr>
      <td style="background:${styles.primaryColor}; padding:16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left">${headerLeft}</td>
            ${title ? `<td align="right" style="color:#f8fafc; font-weight:600;">${escapeHtml(title)}</td>` : ''}
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Generate email wrapper with consistent styling
 */
export function createEmailWrapper(
  content: string, 
  styles: EmailStyles = DEFAULT_STYLES,
  trackingPixel?: string
): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${styles.backgroundColor}; padding:24px 0; font-family: ${styles.fontFamily}; color:${styles.textColor};">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border:1px solid ${styles.borderColor}; border-radius:8px; overflow:hidden;">
            ${content}
          </table>
          ${trackingPixel ? `<img src="${trackingPixel}" width="1" height="1" style="display:block; opacity:0;" alt="" />` : ''}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate action buttons for emails
 */
export function createActionButtons(actions: Array<{ label: string; url: string; primary?: boolean }>): string {
  const buttons = actions.map(action => {
    const style = action.primary 
      ? 'display:inline-block; background:#111827; color:#f8fafc; padding:12px 16px; border-radius:8px; text-decoration:none; font-weight:600;'
      : 'display:inline-block; background:#f1f5f9; color:#111827; padding:12px 16px; border-radius:8px; text-decoration:none; font-weight:600; border:1px solid #e5e7eb;';
    
    return `<a href="${action.url}" style="${style}">${escapeHtml(action.label)}</a>`;
  }).join('<span style="display:inline-block; width:8px;">&nbsp;</span>');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
      <tr>
        <td align="left">${buttons}</td>
      </tr>
    </table>
  `;
}

// ============= QUOTE EMAIL TEMPLATES =============

export interface QuoteEmailProps extends EmailBaseProps {
  customerName?: string;
  quote: Quote;
  approveUrl: string;
  editUrl: string;
  pixelUrl?: string;
}

export function generateQuoteEmail(props: QuoteEmailProps) {
  const { businessName, businessLogoUrl, customerName, quote, approveUrl, editUrl, pixelUrl } = props;
  
  const subject = `${businessName} • Quote ${quote.number}`;
  
  const header = createEmailHeader(businessName, businessLogoUrl, `Quote ${quote.number}`);
  
  const serviceAddressHtml = quote.address ? `
    <div style="margin:8px 0 0;">
      <div style="font-weight:600; margin-bottom:4px; color:#111827;">Service address</div>
      <div style="font-size:14px; line-height:1.6; color:#374151;">${escapeHtml(quote.address).replace(/\n/g, '<br />')}</div>
    </div>
  ` : '';

  const itemsTable = createLineItemsTable(quote.lineItems);
  const totalsTable = createTotalsTable({
    subtotal: quote.subtotal,
    discount: quote.discount,
    taxAmount: Math.max(0, (quote.total ?? 0) - ((quote.subtotal ?? 0) - (quote.discount ?? 0))),
    taxRate: quote.taxRate,
    total: quote.total
  });

  const actions = createActionButtons([
    { label: 'Approve', url: approveUrl, primary: true },
    { label: 'Request Edits', url: editUrl }
  ]);

  const content = `
    ${header}
    <tr>
      <td style="padding:20px;">
        ${serviceAddressHtml}
        ${itemsTable}
        ${totalsTable}
        ${actions}
      </td>
    </tr>
  `;

  const html = createEmailWrapper(content, DEFAULT_STYLES, pixelUrl);
  
  return { subject, html };
}

// ============= INVOICE EMAIL TEMPLATES =============

export interface InvoiceEmailProps extends EmailBaseProps {
  customerName?: string;
  invoice: Invoice;
  payUrl?: string;
  pixelUrl?: string;
}

export function generateInvoiceEmail(props: InvoiceEmailProps) {
  const { businessName, businessLogoUrl, customerName, invoice, payUrl, pixelUrl } = props;
  
  const subject = `${businessName} • Invoice ${invoice.number}`;
  
  const header = createEmailHeader(businessName, businessLogoUrl, `Invoice ${invoice.number}`);
  
  const greeting = `
    <div style="font-size:14px; line-height:1.6; color:#374151; margin-bottom:20px;">
      ${customerName ? `<div style="margin-bottom:6px; color:#111827;">Hello ${escapeHtml(customerName)},</div>` : ''}
      <div>Thank you for your business. Please find your invoice details below.</div>
    </div>
  `;

  const totalsTable = createTotalsTable({
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxAmount: Math.max(0, (invoice.total ?? 0) - ((invoice.subtotal ?? 0) - (invoice.discount ?? 0))),
    total: invoice.total,
    showDueDate: invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined
  });

  const actions = payUrl ? createActionButtons([
    { label: 'Pay Invoice', url: payUrl, primary: true }
  ]) : '';

  const footer = `
    <div style="margin-top:16px; font-size:13px; color:#6b7280;">
      Reply to this email if you have any questions.
    </div>
  `;

  const content = `
    ${header}
    <tr>
      <td style="padding:20px;">
        ${greeting}
        ${totalsTable}
        ${actions}
        ${footer}
      </td>
    </tr>
  `;

  const html = createEmailWrapper(content, DEFAULT_STYLES, pixelUrl);
  
  return { subject, html };
}

// ============= INVITE EMAIL TEMPLATES =============

export interface InviteEmailProps extends EmailBaseProps {
  inviterName: string;
  inviteeEmail: string;
  inviteUrl: string;
  role: string;
  expiresAt: string;
}

export function generateInviteEmail(props: InviteEmailProps) {
  const { businessName, businessLogoUrl, inviterName, inviteeEmail, inviteUrl, role, expiresAt } = props;
  
  const subject = `You've been invited to join ${businessName} on ServiceGrid`;
  
  const headerLeft = businessLogoUrl 
    ? `<img src="${businessLogoUrl}" alt="${escapeHtml(businessName)} logo" style="height:32px; max-height:32px; border-radius:4px; display:block;" />`
    : `<span style="font-weight:600; font-size:16px; color:#f8fafc;">${escapeHtml(businessName)}</span>`;

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${escapeHtml(businessName)}</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:24px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="left">${headerLeft}</td>
                        <td align="right" style="color:#f8fafc; font-weight:600; font-size:14px; opacity:0.9;">Team Invitation</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding:40px 32px;">
                    
                    <!-- Greeting -->
                    <div style="margin-bottom:32px;">
                      <h1 style="margin:0 0 16px; font-size:28px; font-weight:700; color:#111827; line-height:1.2;">
                        You're invited to join<br>${escapeHtml(businessName)}
                      </h1>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#6b7280;">
                        ${escapeHtml(inviterName)} has invited you to collaborate as a <strong style="color:#111827;">${escapeHtml(role)}</strong> on ServiceGrid.
                      </p>
                    </div>

                    <!-- Benefits -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:24px; margin-bottom:32px;">
                      <h2 style="margin:0 0 16px; font-size:18px; font-weight:600; color:#111827;">What you'll get access to:</h2>
                      <ul style="margin:0; padding-left:20px; color:#374151; line-height:1.7;">
                        <li style="margin-bottom:8px;">Shared calendar and scheduling</li>
                        <li style="margin-bottom:8px;">Work order management</li>
                        <li style="margin-bottom:8px;">Customer information and quotes</li>
                        <li style="margin-bottom:8px;">Team collaboration tools</li>
                      </ul>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align:center; margin-bottom:32px;">
                      <a href="${inviteUrl}" 
                         style="display:inline-block; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:#ffffff; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        Accept Invitation
                      </a>
                    </div>

                    <!-- Alternative Link -->
                    <div style="text-align:center; margin-bottom:24px;">
                      <p style="margin:0 0 8px; font-size:14px; color:#6b7280;">
                        Or copy and paste this link in your browser:
                      </p>
                      <div style="background:#f3f4f6; border-radius:6px; padding:12px; word-break:break-all; font-family:monospace; font-size:13px; color:#374151;">
                        ${inviteUrl}
                      </div>
                    </div>

                    <!-- Expiry Notice -->
                    <div style="background:#fef3c7; border:1px solid #fbbf24; border-radius:6px; padding:12px; margin-bottom:24px;">
                      <p style="margin:0; font-size:14px; color:#92400e; text-align:center;">
                        ⏰ This invitation expires on <strong>${expiryDate}</strong>
                      </p>
                    </div>

                    <!-- Security Notice -->
                    <div style="border-top:1px solid #e5e7eb; padding-top:24px;">
                      <p style="margin:0; font-size:13px; color:#6b7280; text-align:center; line-height:1.5;">
                        If you didn't expect this invitation, you can safely ignore this email. 
                        This invitation was sent to <strong>${escapeHtml(inviteeEmail)}</strong>.
                      </p>
                    </div>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc; padding:24px 32px; border-top:1px solid #e5e7eb; text-align:center;">
                    <p style="margin:0 0 8px; font-size:14px; color:#374151; font-weight:600;">
                      Powered by ServiceGrid
                    </p>
                    <p style="margin:0; font-size:12px; color:#6b7280;">
                      Professional service management made simple
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}

// ============= SHARED UTILITY FUNCTIONS =============

/**
 * Create line items table for quotes
 */
function createLineItemsTable(lineItems: Quote['lineItems']): string {
  const itemsRows = lineItems.map(li => {
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

  return `
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
  `;
}

/**
 * Create totals table for quotes and invoices
 */
interface TotalsConfig {
  subtotal?: number;
  discount?: number;
  taxAmount?: number;
  taxRate?: number;
  total?: number;
  showDueDate?: string;
}

function createTotalsTable(config: TotalsConfig): string {
  const { subtotal, discount, taxAmount, taxRate, total, showDueDate } = config;
  
  const discountRow = (discount ?? 0) > 0 ? `
    <tr>
      <td style="padding:8px; text-align:right; color:#374151;">Discount</td>
      <td style="padding:8px; text-align:right; font-weight:600;" width="160">- ${formatMoney(discount)}</td>
    </tr>
  ` : '';

  const taxPctLabel = isFinite(taxRate || 0) ? `${Math.round((taxRate ?? 0) * 100)}%` : '';
  const taxRow = taxAmount !== undefined ? `
    <tr>
      <td style="padding:8px; text-align:right; color:#374151;">Tax ${taxPctLabel ? `(${taxPctLabel})` : ''}</td>
      <td style="padding:8px; text-align:right; font-weight:600;">${formatMoney(taxAmount)}</td>
    </tr>
  ` : '';

  const dueRow = showDueDate ? `
    <tr>
      <td style="padding:8px; text-align:right; color:#374151;">Due</td>
      <td style="padding:8px; text-align:right; font-weight:600;">${showDueDate}</td>
    </tr>
  ` : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
      ${subtotal !== undefined ? `
        <tr>
          <td style="padding:8px; text-align:right; color:#374151;">Subtotal</td>
          <td style="padding:8px; text-align:right; font-weight:600;" width="160">${formatMoney(subtotal)}</td>
        </tr>
      ` : ''}
      ${discountRow}
      ${taxRow}
      <tr>
        <td style="padding:12px 8px; text-align:right; font-weight:700; border-top:1px solid #e5e7eb;">Total</td>
        <td style="padding:12px 8px; text-align:right; font-weight:700; border-top:1px solid #e5e7eb;">${formatMoney(total)}</td>
      </tr>
      ${dueRow}
    </table>
  `;
}

/**
 * Combine user message with email content
 */
export function combineMessageWithEmail(message: string, emailHtml: string): string {
  if (!message?.trim()) return emailHtml;
  
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safeMessage}</div>`;
  const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
  
  return `${introBlock}${hr}${emailHtml}`;
}