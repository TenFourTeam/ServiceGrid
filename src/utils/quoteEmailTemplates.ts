import type { Quote } from "@/types";
import { buildQuoteEmail } from "./emailTemplates";

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
  
  // Generate tracking pixel URL - use environment-agnostic approach
  const supabaseUrl = "https://ijudkzqfriazabiosnvb.supabase.co";
  const pixelUrl = `${supabaseUrl}/functions/v1/quote-events?type=open&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
  
  // Build email content
  const emailContent = buildQuoteEmail({
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

/**
 * Combine user message with quote email HTML
 */
export function combineMessageWithQuote(message: string, quoteHtml: string): string {
  if (!message?.trim()) return quoteHtml;
  
  // Escape HTML and convert newlines to breaks
  const safeMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
  
  const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safeMessage}</div>`;
  const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
  
  return `${introBlock}${hr}${quoteHtml}`;
}