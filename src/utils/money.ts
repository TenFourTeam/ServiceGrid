/**
 * Money calculation utilities for currency formatting and conversions
 */

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function calculateQuoteTotal(
  lineItems: Array<{ 
    quantity: number; 
    unit_price: number; 
    tax_rate?: number 
  }>
): number {
  return lineItems.reduce((total, item) => {
    const lineTotal = item.quantity * item.unit_price;
    const taxRate = (typeof item.tax_rate === 'number' && !Number.isNaN(item.tax_rate)) ? item.tax_rate : 0;
    const tax = lineTotal * taxRate;
    return total + lineTotal + tax;
  }, 0);
}

export function convertDollarsToStripeAmount(dollars: number): number {
  return Math.round(dollars * 100);
}

export function convertStripeAmountToDollars(cents: number): number {
  return cents / 100;
}