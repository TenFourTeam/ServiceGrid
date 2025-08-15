import { useMemo } from 'react';
import type { LineItem } from '@/types';

export function calculateLineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice);
}

export function calculateQuoteTotals(lineItems: LineItem[], taxRate: number, discount: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount - discount;
  return { subtotal, taxAmount, total };
}

export function useQuoteCalculations(lineItems: LineItem[], taxRate: number, discount: number) {
  return useMemo(() => 
    calculateQuoteTotals(lineItems, taxRate, discount), 
    [lineItems, taxRate, discount]
  );
}