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

export function toCustomerUI(db: { 
  id?: string; 
  business_id?: string; 
  owner_id?: string; 
  name?: string; 
  email?: string; 
  phone?: string; 
  address?: string; 
  notes?: string; 
  created_at?: string; 
  updated_at?: string; 
  [k: string]: any 
}) {
  // Remove snake_case properties and ensure UI uses only camelCase
  const { business_id, owner_id, created_at, updated_at, ...rest } = db;
  return {
    ...rest,
    id: db.id || '',
    name: db.name || '',
    email: db.email || '',
    phone: db.phone || '',
    address: db.address || '',
    notes: db.notes || '',
    businessId: business_id || '',
    ownerId: owner_id || '',
    createdAt: created_at || '',
    updatedAt: updated_at || '',
  };
}