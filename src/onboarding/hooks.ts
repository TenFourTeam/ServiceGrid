/**
 * Simple onboarding actions hook - replaces the complex OnboardingProvider
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useUI } from '@/store/ui';

export function useOnboardingActions() {
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const { setModal } = useUI();

  const openSetupProfile = useCallback(() => {
    track('onboarding_step_completed', { step: 'setup_profile_initiated' });
    navigate('/settings', { state: { focus: 'profile' } });
  }, [navigate, track]);

  const openNewJobSheet = useCallback(() => {
    track('onboarding_step_completed', { step: 'new_job_initiated' });
    navigate('/calendar');
  }, [navigate, track]);

  const openCreateQuote = useCallback(() => {
    track('onboarding_step_completed', { step: 'new_quote_initiated' });
    navigate('/quotes?new=1');
  }, [navigate, track]);

  const openAddCustomer = useCallback(() => {
    track('onboarding_step_completed', { step: 'add_customer_initiated' });
    navigate('/customers?new=1');
  }, [navigate, track]);

  const openImportCustomers = useCallback(() => {
    track('onboarding_step_completed', { step: 'csv_import_initiated' });
    navigate('/customers?import=1');
  }, [navigate, track]);

  const openBankLink = useCallback(() => {
    track('onboarding_step_completed', { step: 'bank_link_initiated' });
    navigate('/settings');
  }, [navigate, track]);

  const openSubscription = useCallback(() => {
    track('onboarding_step_completed', { step: 'subscription_initiated' });
    navigate('/settings');
  }, [navigate, track]);

  const showIntentPicker = useCallback(() => {
    setModal('intentPicker', true);
  }, [setModal]);

  return {
    openSetupProfile,
    openNewJobSheet,
    openCreateQuote,
    openAddCustomer,
    openImportCustomers,
    openBankLink,
    openSubscription,
    showIntentPicker,
  };
}