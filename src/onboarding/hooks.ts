/**
 * Simple onboarding actions hook - replaces the complex OnboardingProvider
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

export function useOnboardingActions() {
  const navigate = useNavigate();
  const { track } = useAnalytics();

  const openSetupProfile = useCallback(() => {
    track('customer_created', { source: 'onboarding', method: 'setup_profile_initiated' });
    navigate('/settings', { state: { focus: 'profile' } });
  }, [navigate, track]);

  const openNewJobSheet = useCallback(() => {
    track('job_created', { fromQuote: false, source: 'onboarding' });
    navigate('/calendar');
  }, [navigate, track]);

  const openCreateQuote = useCallback(() => {
    track('quote_created', { hasCustomer: false, lineItemCount: 0, source: 'onboarding' });
    navigate('/quotes?new=1');
  }, [navigate, track]);

  const openAddCustomer = useCallback(() => {
    track('customer_created', { source: 'onboarding', method: 'manual' });
    navigate('/customers?new=1');
  }, [navigate, track]);

  const openImportCustomers = useCallback(() => {
    track('customer_created', { source: 'csv_import' });
    navigate('/customers?import=1');
  }, [navigate, track]);

  const openBankLink = useCallback(() => {
    track('bank_linked', { timeFromSignup: 0, source: 'onboarding' });
    navigate('/settings');
  }, [navigate, track]);

  const openSubscription = useCallback(() => {
    track('subscription_started', { plan: 'pro', trialDaysUsed: 0 });
    navigate('/settings');
  }, [navigate, track]);

  return {
    openSetupProfile,
    openNewJobSheet,
    openCreateQuote,
    openAddCustomer,
    openImportCustomers,
    openBankLink,
    openSubscription,
  };
}