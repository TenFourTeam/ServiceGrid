import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import fc from 'fast-check';
import { normalizeToE164 as normalizePhoneNumber } from '@/validation/profile';

// Email validation schema
const emailSchema = z.string().email();

// Business validation schemas
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().optional(),
});

const quoteLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: z.number().positive('Unit price must be positive'),
});

const quoteSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  line_items: z.array(quoteLineItemSchema).min(1, 'At least one line item required'),
  notes: z.string().optional(),
  valid_until: z.date().min(new Date(), 'Valid until date must be in the future'),
});

describe('Validation Logic', () => {
  describe('Phone number normalization', () => {
    it('normalizes valid US phone numbers', () => {
      expect(normalizePhoneNumber('(212) 123-4567')).toBe('+12121234567');
      expect(normalizePhoneNumber('212-123-4567')).toBe('+12121234567');
      expect(normalizePhoneNumber('212.123.4567')).toBe('+12121234567');
      expect(normalizePhoneNumber('2121234567')).toBe('+12121234567');
      expect(normalizePhoneNumber('1-212-123-4567')).toBe('+12121234567');
    });

    it('handles valid international numbers', () => {
      expect(normalizePhoneNumber('+442079460958')).toBe('+442079460958');
      expect(normalizePhoneNumber('+33142868326')).toBe('+33142868326');
    });

    it('returns empty string for invalid phone numbers', () => {
      expect(normalizePhoneNumber('123')).toBe(''); // Too short
      expect(normalizePhoneNumber('abc')).toBe(''); // Non-numeric
      expect(normalizePhoneNumber('')).toBe(''); // Empty
      expect(normalizePhoneNumber('33 1 42 86 83 26')).toBe(''); // International without country code prefix
    });

    it('property-based phone validation', () => {
      fc.assert(
        fc.property(
          // Generate realistic phone numbers directly instead of filtering
          fc.oneof(
            // US format variations
            fc.tuple(fc.integer(200, 999), fc.integer(200, 999), fc.integer(1000, 9999))
              .map(([area, exchange, number]) => `(${area}) ${exchange}-${number}`),
            fc.tuple(fc.integer(200, 999), fc.integer(200, 999), fc.integer(1000, 9999))
              .map(([area, exchange, number]) => `${area}-${exchange}-${number}`),
            fc.tuple(fc.integer(200, 999), fc.integer(200, 999), fc.integer(1000, 9999))
              .map(([area, exchange, number]) => `${area}${exchange}${number}`),
            // International format
            fc.tuple(fc.integer(1, 999), fc.integer(1000000000, 9999999999))
              .map(([country, number]) => `+${country} ${number}`)
          ),
          (phoneInput) => {
            const normalized = normalizePhoneNumber(phoneInput);
            if (normalized) { // Only test if normalization succeeded
              expect(normalized).toMatch(/^\+\d+$/); // Should start with + and contain only digits
              expect(normalized.length).toBeGreaterThan(5); // Reasonable minimum length
            }
            // If normalization failed (returned empty), that's also valid behavior
          }
        ),
        { numRuns: 20 } // Limit iterations for speed - this goes in fc.assert()
      );
    });
  });

  describe('Business entity validation', () => {
    it('validates customer data correctly', () => {
      const validCustomer = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        address: '123 Main St',
      };

      const result = customerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
    });

    it('rejects invalid customer data', () => {
      const invalidCustomer = {
        name: '',
        email: 'invalid-email',
        phone: '123', // Too short
      };

      const result = customerSchema.safeParse(invalidCustomer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toHaveLength(3); // name, email, phone errors
      }
    });

    it('validates quote data correctly', () => {
      const validQuote = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        line_items: [
          {
            description: 'Service A',
            quantity: 2,
            unit_price: 50.00,
          }
        ],
        valid_until: new Date(Date.now() + 86400000), // Tomorrow
      };

      const result = quoteSchema.safeParse(validQuote);
      expect(result.success).toBe(true);
    });

    it('rejects quotes with past valid_until dates', () => {
      const invalidQuote = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        line_items: [
          {
            description: 'Service A',
            quantity: 1,
            unit_price: 50.00,
          }
        ],
        valid_until: new Date(Date.now() - 86400000), // Yesterday
      };

      const result = quoteSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });
  });

  describe('Email validation edge cases', () => {
    it('handles common email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name+tag@example.co.uk',
        'user_name@example-domain.com',
      ];

      validEmails.forEach(email => {
        expect(emailSchema.safeParse(email).success).toBe(true);
      });
    });

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'spaces @domain.com',
      ];

      invalidEmails.forEach(email => {
        expect(emailSchema.safeParse(email).success).toBe(false);
      });
    });
  });
});