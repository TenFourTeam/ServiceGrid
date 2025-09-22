import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Normalize phone number to E.164 format
 * Returns normalized phone or empty string if invalid
 */
export function normalizeToE164(phone: string, defaultCountry: string = 'US'): string {
  if (!phone?.trim()) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry as any);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
  } catch (e) {
    console.warn('[phoneNormalization] Failed to parse phone:', phone, e);
  }
  
  return '';
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string, defaultCountry: string = 'US'): boolean {
  if (!phone?.trim()) return false;
  
  try {
    return isValidPhoneNumber(phone, defaultCountry as any);
  } catch (e) {
    return false;
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string, defaultCountry: string = 'US'): string {
  if (!phone?.trim()) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry as any);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatNational();
    }
  } catch (e) {
    console.warn('[phoneNormalization] Failed to format phone:', phone, e);
  }
  
  return phone; // Return original if formatting fails
}