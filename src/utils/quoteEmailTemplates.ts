import type { Quote } from "@/types";
import { generateQuoteEmail as buildQuoteEmailFromEngine, combineMessageWithEmail } from "./emailTemplateEngine";
import { buildEdgeFunctionUrl, getAppUrl } from "./env";

interface QuoteEmailConfig {
  businessName: string;
  businessLogoUrl?: string;
  customerName?: string;
  quote: Quote;
}

/**
 * Generate quote email HTML and URLs for sending
 */
export function generateQuoteEmail({
  businessName,
  businessLogoUrl,
  customerName,
  quote
}: QuoteEmailConfig) {
  const baseUrl = getAppUrl();
  
  // Generate action URLs - use /quote-action route for branded confirmation pages
  const approveUrl = `${baseUrl}/quote-action?type=approve&quote_id=${quote.id}&token=${quote.publicToken}`;
  const editUrl = `${baseUrl}/quote-edit/${quote.id}/${quote.publicToken}`;
  const viewUrl = `${baseUrl}/quote/${encodeURIComponent(quote.publicToken)}`;
  
  // Generate tracking pixel URL - goes directly to edge function
  const pixelUrl = `${baseUrl}/quote-action?type=open&quote_id=${quote.id}&token=${quote.publicToken}`;
  
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
