import type { Invoice } from '@/types';
import { generateInvoiceEmail } from './emailTemplateEngine';

/**
 * Generate default HTML template for invoice emails
 * @deprecated Use generateInvoiceEmail from emailTemplateEngine instead
 */
export function invoiceDefaultHTML(
  invoice: Invoice,
  businessName: string,
  businessLogoUrl?: string
): string {
  const { html } = generateInvoiceEmail({
    businessName,
    businessLogoUrl,
    invoice
  });
  return html;
}