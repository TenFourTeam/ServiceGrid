import type { Quote } from "@/types";
import { generateQuoteEmail as buildQuoteEmailFromEngine, combineMessageWithEmail } from "./emailTemplateEngine";
import { buildEdgeFunctionUrl } from "./env";

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
  
  // Generate tracking pixel URL
  const pixelUrl = buildEdgeFunctionUrl('quote-events', {
    type: 'open',
    quote_id: quote.id,
    token: quote.publicToken
  });
  
  // Build email content
  const emailContent = buildQuoteEmailFromEngine({
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

// Legacy function - use generateQuoteEmail from emailTemplateEngine instead
export function buildQuoteEmailTemplate(props: any) {
  return buildQuoteEmailFromEngine(props);
}

/**
 * Combine user message with quote email HTML
 * @deprecated Use combineMessageWithEmail from emailTemplateEngine instead
 */
export function combineMessageWithQuote(message: string, quoteHtml: string): string {
  return combineMessageWithEmail(message, quoteHtml);
}