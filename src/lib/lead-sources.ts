// Standard lead source options used across the application
export const LEAD_SOURCES = [
  { value: 'website_form', label: 'Website Form' },
  { value: 'referral', label: 'Referral' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'email', label: 'Email' },
  { value: 'repeat_customer', label: 'Repeat Customer' },
  { value: 'other', label: 'Other' },
] as const;

export type LeadSourceValue = typeof LEAD_SOURCES[number]['value'];

export function getLeadSourceLabel(value: string | undefined | null): string {
  if (!value) return 'Unknown';
  const source = LEAD_SOURCES.find(s => s.value === value);
  return source?.label || value;
}

export function getLeadSourceColor(value: string | undefined | null): string {
  if (!value) return 'bg-muted text-muted-foreground';
  
  switch (value) {
    case 'website_form':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'referral':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'phone_call':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'social_media':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
    case 'advertisement':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'walk_in':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    case 'email':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'repeat_customer':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
  }
}
