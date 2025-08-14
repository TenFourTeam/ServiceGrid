/**
 * Transform functions to normalize DB shapes to UI shapes at the query boundary
 * Single source of truth for data shape transformations
 */

export function toBusinessUI(db: { name_customized?: boolean; id?: string; name?: string; [k: string]: any }) {
  // Remove snake_case property and ensure UI uses only camelCase
  const { name_customized, ...rest } = db;
  return {
    ...rest,
    nameCustomized: !!name_customized,
    id: db.id || '',
    name: db.name || '',
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