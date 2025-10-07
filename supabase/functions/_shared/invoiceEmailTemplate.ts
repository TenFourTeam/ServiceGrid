// ============= INVOICE EMAIL TEMPLATE =============
// Shared email template utilities for invoice emails
// This file is a copy of the invoice email generation logic from src/utils/emailTemplateEngine.ts
// It exists separately because edge functions cannot import from src/

// Type definitions
export interface LineItem {
  name: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: string;
  total?: number;
  subtotal?: number;
  taxRate?: number;
  discount?: number;
  dueAt?: string;
  createdAt?: string;
  address?: string;
  paymentTerms?: string;
  frequency?: string;
  depositRequired?: boolean;
  depositPercent?: number;
  terms?: string;
  lineItems?: LineItem[];
}

export interface InvoiceEmailProps {
  businessName: string;
  businessLogoUrl?: string;
  customerName?: string;
  invoice: Invoice;
  payUrl?: string;
  pixelUrl?: string;
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

// ============= UTILITY FUNCTIONS =============

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Format cents to dollar string
 */
function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '$0.00';
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
}

/**
 * Generate common email header with business branding
 */
function createEmailHeader(
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
function createEmailWrapper(
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
function createActionButtons(actions: Array<{ label: string; url: string; primary?: boolean }>): string {
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

/**
 * Create line items table
 */
function createLineItemsTable(lineItems: LineItem[]): string {
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
 * Combine user message with generated email HTML
 */
export function combineMessageWithEmail(message: string, emailHtml: string): string {
  if (!message?.trim()) return emailHtml;
  
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safeMessage}</div>`;
  const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
  
  return `${introBlock}${hr}${emailHtml}`;
}

// ============= MAIN EMAIL GENERATION =============

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
