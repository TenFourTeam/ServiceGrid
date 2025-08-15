/**
 * Simple onboarding navigation actions
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useOnboardingActions() {
  const navigate = useNavigate();

  const openSetupProfile = useCallback(() => {
    navigate('/settings', { state: { focus: 'profile' } });
  }, [navigate]);

  const openNewJobSheet = useCallback(() => {
    navigate('/calendar');
  }, [navigate]);

  const openCreateQuote = useCallback(() => {
    navigate('/quotes?new=1');
  }, [navigate]);

  const openAddCustomer = useCallback(() => {
    navigate('/customers?new=1');
  }, [navigate]);

  const openImportCustomers = useCallback(() => {
    navigate('/customers?import=1');
  }, [navigate]);

  const openBankLink = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const openSubscription = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

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