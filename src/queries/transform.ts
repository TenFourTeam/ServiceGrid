/**
 * Transform functions to normalize DB shapes to UI shapes at the query boundary
 * Single source of truth for data shape transformations
 */

export function toBusinessUI(db: { id?: string; name?: string; description?: string; logo_url?: string; light_logo_url?: string; tax_rate_default?: number; phone?: string; [k: string]: any }) {
  // Remove snake_case properties and ensure UI uses only camelCase
  const { logo_url, light_logo_url, tax_rate_default, ...rest } = db;
  return {
    ...rest,
    id: db.id || '',
    name: db.name || '',
    description: db.description || '',
    logoUrl: logo_url || '',
    lightLogoUrl: light_logo_url || '',
    taxRateDefault: tax_rate_default || 0.1,
    phone: db.phone || '',
  };
}

export function toProfileUI(db: { full_name?: string; phone_e164?: string; [k: string]: any }) {
  // Remove snake_case properties and ensure UI uses only camelCase
  const { full_name, phone_e164, ...rest } = db;
  return {
    ...rest,
    fullName: full_name || '',
    phoneE164: phone_e164 || '',
  };
}