import { test, expect, describe } from 'vitest';
import fc from 'fast-check';

// Money calculation utilities (these would be imported from your utils)
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function calculateQuoteTotal(lineItems: Array<{ quantity: number; unit_price: number; tax_rate?: number }>): number {
  return lineItems.reduce((total, item) => {
    const subtotal = item.quantity * item.unit_price;
    const tax = subtotal * (item.tax_rate || 0);
    return total + subtotal + tax;
  }, 0);
}

function convertDollarsToStripeAmount(dollars: number): number {
  return Math.round(dollars * 100);
}

function convertStripeAmountToDollars(cents: number): number {
  return cents / 100;
}

describe('Money Calculations', () => {
  describe('Currency formatting', () => {
    test('formats currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$10.00');
      expect(formatCurrency(99)).toBe('$0.99');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(123456)).toBe('$1,234.56');
    });

    test('handles edge cases', () => {
      expect(formatCurrency(1)).toBe('$0.01');
      expect(formatCurrency(9999999)).toBe('$99,999.99');
    });
  });

  describe('Quote total calculations', () => {
    test('calculates simple totals correctly', () => {
      const lineItems = [
        { quantity: 2, unit_price: 500 }, // $10.00
        { quantity: 1, unit_price: 1500 }, // $15.00
      ];
      expect(calculateQuoteTotal(lineItems)).toBe(2500); // $25.00
    });

    test('includes tax calculations', () => {
      const lineItems = [
        { quantity: 1, unit_price: 1000, tax_rate: 0.08 }, // $10.00 + 8% tax = $10.80
      ];
      expect(calculateQuoteTotal(lineItems)).toBe(1080);
    });

    test('property-based testing for quote calculations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              quantity: fc.integer({ min: 1, max: 100 }),
              unit_price: fc.integer({ min: 1, max: 100000 }),
              tax_rate: fc.float({ min: 0, max: 0.5 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (items) => {
            const total = calculateQuoteTotal(items);
            expect(total).toBeGreaterThan(0);
            
            // Total should be sum of all line items with tax
            const expectedTotal = items.reduce((sum, item) => {
              const subtotal = item.quantity * item.unit_price;
              return sum + subtotal + (subtotal * item.tax_rate);
            }, 0);
            
            expect(Math.abs(total - expectedTotal)).toBeLessThan(0.01);
          }
        )
      );
    });
  });

  describe('Stripe amount conversions', () => {
    test('converts dollars to stripe amounts correctly', () => {
      expect(convertDollarsToStripeAmount(10.99)).toBe(1099);
      expect(convertDollarsToStripeAmount(0.01)).toBe(1);
      expect(convertDollarsToStripeAmount(999.99)).toBe(99999);
    });

    test('converts stripe amounts to dollars correctly', () => {
      expect(convertStripeAmountToDollars(1099)).toBe(10.99);
      expect(convertStripeAmountToDollars(1)).toBe(0.01);
      expect(convertStripeAmountToDollars(99999)).toBe(999.99);
    });

    test('round-trip conversions are accurate', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 9999.99 }),
          (dollars) => {
            const roundedDollars = Math.round(dollars * 100) / 100; // Round to cents
            const stripeAmount = convertDollarsToStripeAmount(roundedDollars);
            const backToDollars = convertStripeAmountToDollars(stripeAmount);
            expect(Math.abs(backToDollars - roundedDollars)).toBeLessThan(0.001);
          }
        )
      );
    });
  });
});