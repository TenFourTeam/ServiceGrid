import { z } from 'zod';

/**
 * Shared validation schema for profile data
 */
export const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  phoneRaw: z.string().trim().min(7, 'Enter a valid phone number').optional().or(z.literal(''))
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

/**
 * Normalizes phone number to E.164 format
 */
export function normalizeToE164(phone: string): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default to US format for 10 digits
  return digits.length === 10 ? `+1${digits}` : phone;
}

/**
 * Formats name or business name with proper capitalization
 */
export function formatNameSuggestion(name: string): string {
  if (!name) return '';
  
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      // Handle hyphenated names
      if (word.includes('-')) {
        return word.split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }
      // Handle apostrophes (O'Connor, D'Angelo)
      if (word.includes("'")) {
        return word.split("'")
          .map((part, index) => {
            if (index === 0) {
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("'");
      }
      // Regular capitalization
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}