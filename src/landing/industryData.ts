import { 
  Sprout, 
  Sparkles, 
  Droplets, 
  Waves, 
  SwatchBook, 
  Hammer, 
  Home, 
  Trash2, 
  Wind 
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Challenge {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface Feature {
  title: string;
  description: string;
  benefit: string;
}

export interface Industry {
  icon: LucideIcon;
  label: string;
  slug: string;
  description: string;
  hero: {
    title: string;
    subtitle: string;
  };
  challenges: Challenge[];
  features: Feature[];
  cta: {
    title: string;
    subtitle: string;
  };
}

// Map slugs to their translation keys
const industryKeys = {
  'lawn-care': 'lawnCare',
  'house-cleaning': 'houseCleaning',
  'pressure-washing': 'pressureWashing',
  'irrigation': 'irrigation',
  'pool-service': 'poolService',
  'handyman': 'handyman',
  'gutter-cleaning': 'gutterCleaning',
  'junk-removal': 'junkRemoval',
  'carpet-cleaning': 'carpetCleaning'
} as const;

// Icon mapping remains static
const industryIcons = {
  'lawn-care': Sprout,
  'house-cleaning': Sparkles,
  'pressure-washing': Droplets,
  'irrigation': Waves,
  'pool-service': SwatchBook,
  'handyman': Hammer,
  'gutter-cleaning': Home,
  'junk-removal': Trash2,
  'carpet-cleaning': Wind
} as const;

// Challenge icon mapping (icons used in challenges section)
const challengeIconsByIndustry = {
  'lawn-care': [Sprout, Home, SwatchBook, Waves],
  'house-cleaning': [Sparkles, Home, SwatchBook, Waves],
  'pressure-washing': [Droplets, Hammer, Sprout, SwatchBook],
  'irrigation': [Waves, Home, Droplets, Sprout],
  'pool-service': [SwatchBook, Droplets, Hammer, Sprout],
  'handyman': [Hammer, Home, SwatchBook, Sprout],
  'gutter-cleaning': [Home, Hammer, Trash2, Sprout],
  'junk-removal': [Trash2, Home, Waves, Sprout],
  'carpet-cleaning': [Wind, Sparkles, Waves, Hammer]
} as const;

export function getIndustries(t: (key: string) => string): Industry[] {
  return Object.entries(industryKeys).map(([slug, key]) => ({
    icon: industryIcons[slug as keyof typeof industryIcons],
    label: t(`industries.${key}.label`),
    slug,
    description: t(`industries.${key}.description`),
    hero: {
      title: t(`industries.${key}.hero.title`),
      subtitle: t(`industries.${key}.hero.subtitle`)
    },
    challenges: [0, 1, 2, 3].map((i) => ({
      title: t(`industries.${key}.challenges.${i}.title`),
      description: t(`industries.${key}.challenges.${i}.description`),
      icon: challengeIconsByIndustry[slug as keyof typeof challengeIconsByIndustry][i]
    })),
    features: [0, 1, 2, 3].map((i) => ({
      title: t(`industries.${key}.features.${i}.title`),
      description: t(`industries.${key}.features.${i}.description`),
      benefit: t(`industries.${key}.features.${i}.benefit`)
    })),
    cta: {
      title: t(`industries.${key}.cta.title`),
      subtitle: t(`industries.${key}.cta.subtitle`)
    }
  }));
}

// For backwards compatibility and getting list of slugs
export function getIndustrySlugs() {
  return Object.keys(industryKeys);
}

// Legacy export for components that haven't been updated yet
export const industries: Industry[] = [];
