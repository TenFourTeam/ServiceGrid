import type { Invoice } from '@/types';

/**
 * Generate default HTML template for invoice emails
 */
export function invoiceDefaultHTML(
  invoice: Invoice,
  businessName: string,
  businessLogoUrl?: string
): string {
  const logoSection = businessLogoUrl 
    ? `<img src="${businessLogoUrl}" alt="${businessName}" style="max-height: 60px; margin-bottom: 20px;" />`
    : `<h2 style="margin: 0 0 20px 0; color: #111827;">${businessName}</h2>`;

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      ${logoSection}
      
      <div style="border-bottom: 2px solid #e5e7eb; margin-bottom: 30px; padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #111827;">Invoice ${invoice.number}</h1>
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 16px;">Status: ${invoice.status}</p>
        ${invoice.dueAt ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 16px;">Due: ${new Date(invoice.dueAt).toLocaleDateString()}</p>` : ''}
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 16px; color: #374151;">Total Amount</span>
          <span style="font-size: 24px; font-weight: 700; color: #111827;">$${(invoice.total / 100).toFixed(2)}</span>
        </div>
        
        ${invoice.subtotal !== invoice.total ? `
          <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Subtotal</span>
              <span>$${(invoice.subtotal / 100).toFixed(2)}</span>
            </div>
            ${invoice.taxRate > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Tax (${invoice.taxRate}%)</span>
                <span>$${(invoice.subtotal * invoice.taxRate / 10000).toFixed(2)}</span>
              </div>
            ` : ''}
            ${invoice.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Discount</span>
                <span>-$${(invoice.discount / 100).toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Thank you for your business!
        </p>
      </div>
    </div>
  `;
}