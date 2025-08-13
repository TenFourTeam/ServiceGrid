import { OnboardingContext } from './useOnboardingContext';

/**
 * Pure guard functions that determine if an onboarding step should be shown.
 * These functions are synchronous and deterministic, taking context snapshots.
 */

export function hasJobs(context: OnboardingContext): boolean {
  return context.jobsCount > 0;
}

export function hasQuotes(context: OnboardingContext): boolean {
  return context.quotesCount > 0;
}

export function hasCustomers(context: OnboardingContext): boolean {
  return context.customersCount > 0;
}

export function isBankLinked(context: OnboardingContext): boolean {
  return context.bankLinked;
}

export function isSubscribed(context: OnboardingContext): boolean {
  return context.subscribed;
}

export function hasNameAndBusiness(context: OnboardingContext): boolean {
  return context.hasNameAndBusiness;
}

// Context-dependent guards that require additional logic
export function shouldShowSendQuote(context: OnboardingContext): boolean {
  // Show if we have quotes but haven't sent any yet
  return context.quotesCount > 0 && !context.hasSentQuotes;
}

export function shouldShowScheduleJob(context: OnboardingContext): boolean {
  // Show if we have jobs but haven't scheduled any yet
  return context.jobsCount > 0 && !context.hasScheduledJobs;
}

// Always show these steps
export function alwaysShow(_context: OnboardingContext): boolean {
  return false; // Return false means "should show this step"
}

export function neverShow(_context: OnboardingContext): boolean {
  return true; // Return true means "step is complete, don't show"
}