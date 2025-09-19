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
      ${customerName ? `<div style="margin-bottom:6px; color:#111827; font-weight:600;">Hello ${escapeHtml(customerName)},</div>` : ''}
      <div>Thank you for your business. Please find your invoice details below.</div>
    </div>
  `;

  // Customer Information Section
  const customerInfo = `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Customer Information</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#6b7280; width:80px;">Name:</td>
            <td style="padding:4px 0; font-size:14px; font-weight:500; color:#111827;">${customerName ? escapeHtml(customerName) : 'N/A'}</td>
          </tr>
          ${invoice.address ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280; vertical-align:top;">Address:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">${escapeHtml(invoice.address).replace(/\n/g, '<br>')}</td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>
  `;

  // Invoice Details Section
  const invoiceDetails = `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Invoice Details</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#6b7280;">Invoice Number:</td>
            <td style="padding:4px 0; font-size:14px; font-weight:600; color:#111827;">${escapeHtml(invoice.number)}</td>
          </tr>
          ${invoice.createdAt ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Issued Date:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">${new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#6b7280;">Due Date:</td>
            <td style="padding:4px 0; font-size:13px; color:#374151;">${invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Due on receipt'}</td>
          </tr>
          ${invoice.paymentTerms ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Payment Terms:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">${invoice.paymentTerms.replace(/_/g, ' ')}</td>
            </tr>
          ` : ''}
          ${invoice.frequency ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Frequency:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">${invoice.frequency.replace(/_/g, ' ')}</td>
            </tr>
          ` : ''}
          ${invoice.depositRequired ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Deposit Required:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">Yes (${invoice.depositPercent || 0}%)</td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>
  `;

  // Line items section
  const lineItemsSection = invoice.lineItems && invoice.lineItems.length > 0 ? `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Line Items</div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
        ${createLineItemsTable(invoice.lineItems)}
      </div>
    </div>
  ` : '';

  // Pricing section
  const pricingSection = `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Pricing Summary</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#6b7280;">Subtotal:</td>
            <td style="padding:4px 0; font-size:13px; color:#374151; text-align:right;">${formatMoney(invoice.subtotal || 0)}</td>
          </tr>
          ${invoice.taxRate && invoice.taxRate > 0 ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Tax (${(invoice.taxRate * 100).toFixed(1)}%):</td>
              <td style="padding:4px 0; font-size:13px; color:#374151; text-align:right;">${formatMoney(Math.round((invoice.subtotal || 0) * invoice.taxRate))}</td>
            </tr>
          ` : ''}
          ${invoice.discount && invoice.discount > 0 ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Discount:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151; text-align:right;">-${formatMoney(invoice.discount)}</td>
            </tr>
          ` : ''}
          ${invoice.depositRequired && invoice.depositPercent ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Deposit (${invoice.depositPercent}%):</td>
              <td style="padding:4px 0; font-size:13px; color:#374151; text-align:right;">${formatMoney(Math.round((invoice.total || 0) * invoice.depositPercent / 100))}</td>
            </tr>
          ` : ''}
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:8px 0 4px; font-size:16px; font-weight:600; color:#111827;">Total:</td>
            <td style="padding:8px 0 4px; font-size:16px; font-weight:600; color:#111827; text-align:right;">${formatMoney(invoice.total || 0)}</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  const actions = payUrl ? createActionButtons([
    { label: 'Pay Invoice Online', url: payUrl, primary: true }
  ]) : '';

  // Terms and conditions
  const termsSection = invoice.terms ? `
    <div style="margin-top:24px; padding:16px; background:#f9fafb; border:1px solid #e2e8f0; border-radius:8px; border-left:3px solid #3b82f6;">
      <div style="font-weight:600; color:#111827; margin-bottom:8px;">Terms & Conditions</div>
      <div style="font-size:13px; color:#6b7280; line-height:1.5;">
        ${escapeHtml(invoice.terms).replace(/\n/g, '<br>')}
      </div>
    </div>
  ` : '';

  const footer = `
    <div style="margin-top:24px; font-size:13px; color:#6b7280; text-align:center; padding-top:16px; border-top:1px solid #e2e8f0;">
      Reply to this email if you have any questions about this invoice.
    </div>
  `;

  const content = `
    ${header}
    <tr>
      <td style="padding:32px 24px;">
        ${greeting}
        ${customerInfo}
        ${invoiceDetails}
        ${lineItemsSection}
        ${pricingSection}
        ${actions}
        ${termsSection}
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
// ============= LIFECYCLE EMAIL TEMPLATES =============

export interface LifecycleEmailProps extends EmailBaseProps {
  userFullName?: string;
  userEmail?: string;
  appUrl?: string;
}

export interface WelcomeEmailProps extends LifecycleEmailProps {}

export function generateWelcomeEmail(props: WelcomeEmailProps) {
  const { businessName, userFullName, appUrl = 'https://your-app.com' } = props;
  
  const subject = `Welcome to ServiceGrid, ${userFullName || 'there'}!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ServiceGrid</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:32px; text-align:center;">
                    <h1 style="margin:0; color:#f8fafc; font-size:32px; font-weight:700;">
                      Welcome to ServiceGrid! 🎉
                    </h1>
                    <p style="margin:12px 0 0; color:#cbd5e1; font-size:16px;">
                      Your business management journey starts here
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding:40px 32px;">
                    
                    <div style="margin-bottom:32px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Congratulations on setting up your ${businessName ? escapeHtml(businessName) : 'business'} account! You're now equipped with powerful tools to streamline your service business operations.
                      </p>
                    </div>

                    <!-- Next Steps -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:24px; margin-bottom:32px;">
                      <h2 style="margin:0 0 16px; font-size:18px; font-weight:600; color:#111827;">Here's what you can do next:</h2>
                      <ul style="margin:0; padding-left:20px; color:#374151; line-height:1.7;">
                        <li style="margin-bottom:8px;">Add your first customer and create a quote</li>
                        <li style="margin-bottom:8px;">Set up your calendar for job scheduling</li>
                        <li style="margin-bottom:8px;">Configure your business profile and branding</li>
                        <li style="margin-bottom:8px;">Connect Stripe to start accepting payments</li>
                      </ul>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align:center; margin-bottom:32px;">
                      <a href="${appUrl}/customers" 
                         style="display:inline-block; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:#ffffff; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
                        Get Started →
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Need help? Just reply to this email - we're here to support your success!
                    </div>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc; padding:24px 32px; border-top:1px solid #e5e7eb; text-align:center;">
                    <p style="margin:0; font-size:12px; color:#6b7280;">
                      © ServiceGrid - Professional service management made simple
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

export interface FeatureDiscoveryEmailProps extends LifecycleEmailProps {
  featureName: string;
  featureDescription: string;
  featureUrl: string;
  daysFromSignup: number;
}

export function generateFeatureDiscoveryEmail(props: FeatureDiscoveryEmailProps) {
  const { userFullName, featureName, featureDescription, featureUrl, daysFromSignup, appUrl = 'https://your-app.com' } = props;
  
  const subject = `Day ${daysFromSignup}: Discover ${featureName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${featureName} - ServiceGrid Feature</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:24px 32px;">
                    <h1 style="margin:0; color:#f8fafc; font-size:24px; font-weight:600;">
                      ${escapeHtml(featureName)}
                    </h1>
                    <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">
                      Day ${daysFromSignup} Feature Discovery
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    
                    <div style="margin-bottom:24px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#374151;">
                        ${escapeHtml(featureDescription)}
                      </p>
                    </div>

                    <div style="text-align:center; margin-bottom:24px;">
                      <a href="${featureUrl}" 
                         style="display:inline-block; background:#1e293b; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
                        Try ${escapeHtml(featureName)} →
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Questions? Just reply to this email!
                    </div>

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

export interface MilestoneEmailProps extends LifecycleEmailProps {
  milestoneType: 'quote' | 'job' | 'invoice' | 'stripe';
  nextSteps: string;
  ctaText: string;
  ctaUrl: string;
}

export function generateMilestoneEmail(props: MilestoneEmailProps) {
  const { userFullName, milestoneType, nextSteps, ctaText, ctaUrl } = props;
  
  const milestoneConfig = {
    quote: { emoji: '📋', title: 'First Quote Created!', message: 'Great start! You\'ve created your first quote.' },
    job: { emoji: '📅', title: 'First Job Scheduled!', message: 'Excellent! You\'re getting organized with job scheduling.' },
    invoice: { emoji: '💰', title: 'First Invoice Sent!', message: 'Awesome! You\'re on your way to getting paid.' },
    stripe: { emoji: '🔗', title: 'Stripe Connected!', message: 'Perfect! You\'re now ready to accept payments.' }
  };
  
  const config = milestoneConfig[milestoneType];
  const subject = `${config.emoji} ${config.title}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${config.title}</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding:32px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:16px;">${config.emoji}</div>
                    <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700;">
                      ${config.title}
                    </h1>
                    <p style="margin:12px 0 0; color:#d1fae5; font-size:16px;">
                      ${config.message}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    
                    <div style="margin-bottom:24px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#374151;">
                        ${escapeHtml(nextSteps)}
                      </p>
                    </div>

                    <div style="text-align:center; margin-bottom:24px;">
                      <a href="${ctaUrl}" 
                         style="display:inline-block; background:#059669; color:#ffffff; padding:16px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
                        ${escapeHtml(ctaText)}
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Keep up the great work! 🚀
                    </div>

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

export interface EngagementEmailProps extends LifecycleEmailProps {
  daysInactive: number;
  ctaText: string;
  ctaUrl: string;
}

export function generateEngagementEmail(props: EngagementEmailProps) {
  const { userFullName, businessName, daysInactive, ctaText, ctaUrl } = props;
  
  const subject = daysInactive >= 14 ? 'Need a hand getting started?' : 'Missing you!';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>We Miss You!</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding:32px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:16px;">👋</div>
                    <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:600;">
                      We miss you!
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    
                    <div style="margin-bottom:24px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        We noticed you haven't been active with${businessName ? ` ${escapeHtml(businessName)}` : ' your business'} in ServiceGrid for ${daysInactive} days. 
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#374151;">
                        ${daysInactive >= 14 ? 'Need help getting started? We\'re here to support you!' : 'Ready to get back to growing your business?'}
                      </p>
                    </div>

                    <div style="text-align:center; margin-bottom:24px;">
                      <a href="${ctaUrl}" 
                         style="display:inline-block; background:#7c3aed; color:#ffffff; padding:16px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
                        ${escapeHtml(ctaText)}
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Questions? Just reply to this email - we're here to help! 💜
                    </div>

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

export function combineMessageWithEmail(message: string, emailHtml: string): string {
  if (!message?.trim()) return emailHtml;
  
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safeMessage}</div>`;
  const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
  
  return `${introBlock}${hr}${emailHtml}`;
}