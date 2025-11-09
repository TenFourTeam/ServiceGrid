/**
 * Map frontend frequency values to database enum values
 */
export function frontendToDbFrequency(frontendValue: string): string {
  const mapping: Record<string, string> = {
    'one-off': 'one_time',
    'weekly': 'weekly',
    'bi-monthly': 'bi_weekly',
    'monthly': 'monthly',
    'quarterly': 'quarterly',
    'bi-yearly': 'semi_annual',
    'yearly': 'annual',
  };
  return mapping[frontendValue] || 'monthly';
}

/**
 * Map database frequency enum values to frontend values
 */
export function dbToFrontendFrequency(dbValue: string): string {
  const mapping: Record<string, string> = {
    'one_time': 'one-off',
    'weekly': 'weekly',
    'bi_weekly': 'bi-monthly',
    'monthly': 'monthly',
    'quarterly': 'quarterly',
    'semi_annual': 'bi-yearly',
    'annual': 'yearly',
  };
  return mapping[dbValue] || 'monthly';
}
