/**
 * Quote Email Template Generator for Edge Functions
 * Single source of truth for quote email generation
 */

// ============= TYPE DEFINITIONS =============

export interface LineItem {
  id: string;
  name: string;
  qty: number;
  unit?: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface Quote {
  id: string;
  number: string;
  total?: number;
  subtotal?: number;
  taxRate?: number;
  discount?: number;
  status: string;
  address?: string | null;
  terms?: string | null;
  paymentTerms?: string | null;
  frequency?: string | null;
  depositRequired?: boolean;
  depositPercent?: number | null;
  publicToken: string;
  createdAt: string;
  lineItems: LineItem[];
}

export interface QuoteEmailProps {
  businessName: string;
  businessLogoUrl?: string;
  customerName?: string;
  quote: Quote;
  approveUrl: string;
  editUrl: string;
  pixelUrl?: string;
}

export interface EmailStyles {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontFamily: string;
}

// ============= DEFAULT STYLES =============

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
export function escapeHtml(text: string): string {
  if (!text) return '';
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
 * Format money from cents to dollars
 */
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '$0.00';
  const dollars = cents / 100;
  return '$' + dollars.toFixed(2);
}

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

/**
 * Create line items table for quotes
 */
export function createLineItemsTable(lineItems: LineItem[]): string {
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
 * Create totals table for quotes
 */
export function createTotalsTable(config: {
  subtotal?: number;
  discount?: number;
  taxAmount?: number;
  taxRate?: number;
  total?: number;
}): string {
  const { subtotal, discount, taxAmount, taxRate, total } = config;
  
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
    </table>
  `;
}

// ============= MAIN EMAIL GENERATION =============

/**
 * Generate complete quote email HTML and subject
 */
export function generateQuoteEmail(props: QuoteEmailProps): { subject: string; html: string } {
  const { businessName, businessLogoUrl, customerName, quote, approveUrl, editUrl, pixelUrl } = props;
  
  const subject = `${businessName} • Quote ${quote.number}`;
  
  const header = createEmailHeader(businessName, businessLogoUrl, `Quote ${quote.number}`);
  
  // Quote Details Section
  const quoteDetails = `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Quote Details</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#6b7280;">Quote Number:</td>
            <td style="padding:4px 0; font-size:14px; font-weight:600; color:#111827;">${escapeHtml(quote.number)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#6b7280;">Quote Date:</td>
            <td style="padding:4px 0; font-size:13px; color:#374151;">${new Date(quote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding:4px 0; font-size:13px; color:#6b7280;">Status:</td>
            <td style="padding:4px 0; font-size:13px; color:#374151;">${escapeHtml(quote.status)}</td>
          </tr>
        </table>
      </div>
    </div>
  `;
  
  const serviceAddressHtml = quote.address ? `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Service Address</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
        <div style="font-size:14px; line-height:1.6; color:#374151;">${escapeHtml(quote.address).replace(/\n/g, '<br />')}</div>
      </div>
    </div>
  ` : '';

  // Line Items Section
  const lineItemsSection = `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Services & Materials</div>
      <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
        ${createLineItemsTable(quote.lineItems)}
      </div>
    </div>
  `;

  // Payment & Billing Section
  const paymentBillingHtml = (quote.paymentTerms || quote.frequency || quote.depositRequired) ? `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Payment & Billing</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px;">
        <table style="width:100%; border-collapse:collapse;">
          ${quote.paymentTerms ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Payment Terms:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">${quote.paymentTerms.replace(/_/g, ' ')}</td>
            </tr>
          ` : ''}
          ${quote.frequency ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Billing Frequency:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">${quote.frequency.replace(/_/g, ' ')}</td>
            </tr>
          ` : `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Billing Frequency:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">One-time</td>
            </tr>
          `}
          ${quote.depositRequired && quote.depositPercent ? `
            <tr>
              <td style="padding:4px 0; font-size:13px; color:#6b7280;">Deposit Required:</td>
              <td style="padding:4px 0; font-size:13px; color:#374151;">${quote.depositPercent}% (${formatMoney(Math.round((quote.total || 0) * quote.depositPercent / 100))})</td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>
  ` : '';

  // Totals Section
  const totalsSection = `
    <div style="margin-bottom:24px;">
      <div style="font-weight:600; color:#6b7280; text-transform:uppercase; font-size:11px; letter-spacing:0.5px; margin-bottom:12px;">Pricing Summary</div>
      ${createTotalsTable({
        subtotal: quote.subtotal,
        discount: quote.discount,
        taxAmount: Math.max(0, (quote.total ?? 0) - ((quote.subtotal ?? 0) - (quote.discount ?? 0))),
        taxRate: quote.taxRate,
        total: quote.total
      })}
    </div>
  `;

  // Terms & Conditions Section
  const termsSection = quote.terms ? `
    <div style="margin-bottom:24px; padding:16px; background:#f9fafb; border:1px solid #e2e8f0; border-radius:8px; border-left:3px solid #3b82f6;">
      <div style="font-weight:600; color:#111827; margin-bottom:8px;">Terms & Conditions</div>
      <div style="font-size:13px; color:#6b7280; line-height:1.5;">
        ${escapeHtml(quote.terms).replace(/\n/g, '<br>')}
      </div>
    </div>
  ` : '';

  const actions = createActionButtons([
    { label: 'Approve Quote', url: approveUrl, primary: true },
    { label: 'Request Changes', url: editUrl }
  ]);

  const content = `
    ${header}
    <tr>
      <td style="padding:32px 24px;">
        ${quoteDetails}
        ${serviceAddressHtml}
        ${lineItemsSection}
        ${paymentBillingHtml}
        ${totalsSection}
        ${termsSection}
        ${actions}
      </td>
    </tr>
  `;

  const html = createEmailWrapper(content, DEFAULT_STYLES, pixelUrl);
  
  return { subject, html };
}

/**
 * Combine user message with email content
 */
export function combineMessageWithEmail(message: string, emailHtml: string): string {
  if (!message?.trim()) return emailHtml;
  
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  
  // Insert message at the beginning of the content section (after header, inside padding)
  // Find the opening <td style="padding:32px 24px;"> and insert after it
  const contentStart = emailHtml.indexOf('<td style="padding:32px 24px;">');
  if (contentStart === -1) return emailHtml;
  
  const insertPoint = contentStart + '<td style="padding:32px 24px;">'.length;
  const messageBlock = `
    <div style="margin-bottom:24px; padding:16px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; border-left:3px solid #3b82f6;">
      <div style="font-weight:600; color:#1e40af; margin-bottom:8px;">Message from ${''}</div>
      <div style="font-size:14px; color:#1e3a8a; line-height:1.6;">
        ${safeMessage}
      </div>
    </div>
  `;
  
  return emailHtml.slice(0, insertPoint) + messageBlock + emailHtml.slice(insertPoint);
}
