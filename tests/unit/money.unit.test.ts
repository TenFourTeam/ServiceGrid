import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  formatCurrency,
  calculateQuoteTotal,
  convertDollarsToStripeAmount,
  convertStripeAmountToDollars
} from '@/utils/money';

describe('Money Calculations', () => {
  describe('Currency formatting', () => {
    it('formats currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$10.00');
      expect(formatCurrency(99)).toBe('$0.99');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(123456)).toBe('$1,234.56');
    });

    it('handles edge cases', () => {
      expect(formatCurrency(1)).toBe('$0.01');
      expect(formatCurrency(9999999)).toBe('$99,999.99');
    });
  });

  describe('Quote total calculations', () => {
    it('calculates simple totals correctly', () => {
      const lineItems = [
        { quantity: 2, unit_price: 500 }, // $10.00
        { quantity: 1, unit_price: 1500 }, // $15.00
      ];
      expect(calculateQuoteTotal(lineItems)).toBe(2500); // $25.00
    });

    it('includes tax calculations', () => {
      const lineItems = [
        { quantity: 1, unit_price: 1000, tax_rate: 0.08 }, // $10.00 + 8% tax = $10.80
      ];
      expect(calculateQuoteTotal(lineItems)).toBe(1080);
    });

    it('property-based testing for quote calculations', () => {
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
    it('converts dollars to stripe amounts correctly', () => {
      expect(convertDollarsToStripeAmount(10.99)).toBe(1099);
      expect(convertDollarsToStripeAmount(0.01)).toBe(1);
      expect(convertDollarsToStripeAmount(999.99)).toBe(99999);
    });

    it('converts stripe amounts to dollars correctly', () => {
      expect(convertStripeAmountToDollars(1099)).toBe(10.99);
      expect(convertStripeAmountToDollars(1)).toBe(0.01);
      expect(convertStripeAmountToDollars(99999)).toBe(999.99);
    });

    it('round-trip conversions are accurate', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(9999.99) }),
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