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
  // Generate action URLs - email buttons go directly to the edge function
  const approveUrl = buildEdgeFunctionUrl('quote-events', {
    type: 'approve',
    quote_id: quote.id,
    token: quote.publicToken
  });
  const editUrl = buildEdgeFunctionUrl('quote-events', {
    type: 'edit',
    quote_id: quote.id,
    token: quote.publicToken
  });
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
