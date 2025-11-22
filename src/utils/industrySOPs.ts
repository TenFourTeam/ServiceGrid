import { getIndustrySlugs } from '@/landing/industryData';

export interface BestPractice {
  title: string;
  description: string;
}

// Map slugs to their translation keys
const SLUG_TO_KEY_MAP: Record<string, string> = {
  'lawn-care': 'lawnCare',
  'house-cleaning': 'houseCleaning',
  'pressure-washing': 'pressureWashing',
  'irrigation': 'irrigation',
  'pool-service': 'poolService',
  'handyman': 'handyman',
  'gutter-cleaning': 'gutterCleaning',
  'junk-removal': 'junkRemoval',
  'carpet-cleaning': 'carpetCleaning'
};

// Map of industry labels for display
export const INDUSTRY_LABELS: Record<string, string> = {
  'lawn-care': 'Lawn Care',
  'house-cleaning': 'House Cleaning',
  'pressure-washing': 'Pressure Washing',
  'irrigation': 'Irrigation',
  'pool-service': 'Pool Service',
  'handyman': 'Handyman',
  'gutter-cleaning': 'Gutter Cleaning',
  'junk-removal': 'Junk Removal',
  'carpet-cleaning': 'Carpet Cleaning'
};

/**
 * Get the translation key for an industry slug
 */
export function getIndustryKey(slug: string): string | null {
  return SLUG_TO_KEY_MAP[slug] || null;
}

/**
 * Get industry label for display
 */
export function getIndustryLabel(slug: string): string {
  return INDUSTRY_LABELS[slug] || slug;
}

/**
 * Validate if an industry slug is valid
 */
export function isValidIndustrySlug(slug: string): boolean {
  return getIndustrySlugs().includes(slug);
}

/**
 * Get all valid industry options for a dropdown
 */
export function getIndustryOptions(): Array<{ value: string; label: string }> {
  return getIndustrySlugs().map(slug => ({
    value: slug,
    label: getIndustryLabel(slug)
  }));
}
