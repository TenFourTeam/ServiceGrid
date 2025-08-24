import { describe, it, expect } from 'vitest';
import { ProfileSchema, normalizeToE164, formatNameSuggestion } from '@/validation/profile';

describe('Profile Validation', () => {
  describe('ProfileSchema', () => {
    it('accepts valid profile data', () => {
      const validData = {
        fullName: 'Alex Rivera',
        businessName: 'ServiceGrid Co',
        phoneRaw: '(555) 123-4567'
      };
      
      const result = ProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const invalidData = {
        fullName: '',
        businessName: 'ServiceGrid Co',
        phoneRaw: '5551234567'
      };
      
      const result = ProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Enter your full name');
    });

    it('rejects "My Business" (case insensitive)', () => {
      const testCases = ['My Business', 'my business', 'MY BUSINESS', 'mY bUsInEsS'];
      
      testCases.forEach(businessName => {
        const result = ProfileSchema.safeParse({
          fullName: 'Alex Rivera',
          businessName,
          phoneRaw: '5551234567'
        });
        
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toContain('Please choose a real business name');
      });
    });

    it('rejects short phone numbers', () => {
      const invalidData = {
        fullName: 'Alex Rivera',
        businessName: 'ServiceGrid Co',
        phoneRaw: '123'
      };
      
      const result = ProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Enter a valid phone number');
    });

    it('allows empty phone', () => {
      const validData = {
        fullName: 'Alex Rivera',
        businessName: 'ServiceGrid Co',
        phoneRaw: ''
      };
      
      const result = ProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('normalizeToE164', () => {
    it('converts 10-digit US number to E.164', () => {
      expect(normalizeToE164('5551234567')).toBe('+15551234567');
      expect(normalizeToE164('(555) 123-4567')).toBe('+15551234567');
      expect(normalizeToE164('555-123-4567')).toBe('+15551234567');
    });

    it('converts 11-digit US number (with 1) to E.164', () => {
      expect(normalizeToE164('15551234567')).toBe('+15551234567');
      expect(normalizeToE164('1-555-123-4567')).toBe('+15551234567');
    });

    it('preserves existing E.164 format', () => {
      expect(normalizeToE164('+15551234567')).toBe('+15551234567');
      expect(normalizeToE164('+44123456789')).toBe('+44123456789');
    });

    it('handles empty input', () => {
      expect(normalizeToE164('')).toBe('');
      expect(normalizeToE164('   ')).toBe('');
    });
  });

  describe('formatNameSuggestion', () => {
    it('capitalizes first letter of each word', () => {
      expect(formatNameSuggestion('alex rivera')).toBe('Alex Rivera');
      expect(formatNameSuggestion('JOHN SMITH')).toBe('John Smith');
      expect(formatNameSuggestion('mary jane watson')).toBe('Mary Jane Watson');
    });

    it('handles hyphenated names', () => {
      expect(formatNameSuggestion('mary-jane')).toBe('Mary-Jane');
      expect(formatNameSuggestion('jean-claude van-damme')).toBe('Jean-Claude Van-Damme');
    });

    it('handles apostrophes', () => {
      expect(formatNameSuggestion("o'connor")).toBe("O'Connor");
      expect(formatNameSuggestion("d'angelo")).toBe("D'Angelo");
    });

    it('handles empty input', () => {
      expect(formatNameSuggestion('')).toBe('');
      expect(formatNameSuggestion('   ')).toBe('');
    });
  });
});