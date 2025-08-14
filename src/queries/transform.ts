/**
 * Transform functions to normalize DB shapes to UI shapes at the query boundary
 * Single source of truth for data shape transformations
 */

export function toBusinessUI(db: { name_customized?: boolean; id?: string; name?: string; logo_url?: string; light_logo_url?: string; tax_rate_default?: number; phone?: string; [k: string]: any }) {
  // Remove snake_case property and ensure UI uses only camelCase
  const { name_customized, logo_url, light_logo_url, tax_rate_default, ...rest } = db;
  return {
    ...rest,
    nameCustomized: !!name_customized,
    id: db.id || '',
    name: db.name || '',
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