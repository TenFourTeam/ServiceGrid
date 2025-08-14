/**
 * Transform functions to normalize DB shapes to UI shapes at the query boundary
 */

export function toBusinessUI(db: { name_customized?: boolean; id?: string; name?: string; [k: string]: any }) {
  return {
    ...db,
    nameCustomized: !!db.name_customized,
    id: db.id || '',
    name: db.name || '',
  };
}

export function toProfileUI(db: { full_name?: string; phone_e164?: string; [k: string]: any }) {
  return {
    ...db,
    fullName: db.full_name || '',
    phoneE164: db.phone_e164 || '',
  };
}