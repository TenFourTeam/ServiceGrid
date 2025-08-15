/**
 * Validation utilities for consistent data formatting
 */

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Only format if we have 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if not 10 digits
  return phone;
}

/**
 * Formats phone for display while user types
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Normalizes phone to E.164 format for storage
 */
export function normalizePhoneToE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return phone.startsWith('+') ? phone : (digits.length === 10 ? `+1${digits}` : phone);
}

/**
 * Validates and formats a phone number input
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; formatted: string } {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) {
    return { isValid: true, formatted: '' }; // Empty is valid (optional field)
  }
  
  if (digits.length === 10) {
    return { 
      isValid: true, 
      formatted: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    };
  }
  
  return { isValid: false, formatted: phone };
}

/**
 * Formats an address string by trimming and ensuring proper capitalization
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  
  return address
    .trim()
    .split(' ')
    .map(word => {
      // Don't capitalize common abbreviations or directionals
      const lowerWord = word.toLowerCase();
      if (['st', 'ave', 'blvd', 'rd', 'dr', 'ln', 'ct', 'pl', 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].includes(lowerWord)) {
        return word.toUpperCase();
      }
      // Capitalize first letter of other words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Validates an address string
 */
export function validateAddress(address: string): { isValid: boolean; formatted: string } {
  if (!address || address.trim().length === 0) {
    return { isValid: true, formatted: '' }; // Empty is valid (optional field)
  }
  
  const formatted = formatAddress(address);
  
  // Basic validation - should have at least a number and street name
  const hasNumber = /\d/.test(formatted);
  const hasMinLength = formatted.length >= 5;
  
  return {
    isValid: hasNumber && hasMinLength,
    formatted
  };
}

/**
 * Sanitizes phone number input during typing
 */
export function sanitizePhoneInput(value: string): string {
  // Allow only digits, spaces, parentheses, and dashes during typing
  return value.replace(/[^0-9\s\(\)\-]/g, '');
}

/**
 * Sanitizes address input during typing
 */
export function sanitizeAddressInput(value: string): string {
  // Allow letters, numbers, spaces, and common punctuation
  return value.replace(/[^a-zA-Z0-9\s\.\,\-\#]/g, '');
}
