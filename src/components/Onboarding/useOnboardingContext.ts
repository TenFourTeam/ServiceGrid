import { useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { useCustomersCount } from '@/hooks/useCustomersCount';
import { useJobsCount } from '@/hooks/useJobsCount';
import { useQuotesCount } from '@/hooks/useQuotesCount';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useProfile } from '@/queries/useProfile';

export interface OnboardingContext {
  // Data counts
  jobsCount: number;
  quotesCount: number;
  customersCount: number;
  
  // Status flags
  bankLinked: boolean;
  subscribed: boolean;
  hasNameAndBusiness: boolean;
  
  // Advanced flags for context-dependent steps
  hasSentQuotes: boolean;
  hasScheduledJobs: boolean;
  
  // Data readiness
  dataReady: boolean;
  
  // Version for stable dependencies
  version: number;
}

export function useOnboardingContext(): OnboardingContext {
  const { data: customersCount } = useCustomersCount();
  const { data: jobsCount } = useJobsCount();
  const { data: quotesCount } = useQuotesCount();
  const { data: jobsData } = useSupabaseJobs();
  const { data: quotesData } = useSupabaseQuotes();
  const { data: stripeStatus } = useStripeConnectStatus();
  const { data: subscription } = useSubscriptionStatus();
  const { data: profile } = useProfile();
  const { user } = useUser();
  const { business } = useStore();

  return useMemo(() => {
    // Check if all required data is loaded
    const dataReady = !!(
      customersCount !== undefined && 
      jobsCount !== undefined && 
      quotesCount !== undefined &&
      profile !== undefined &&
      business !== undefined
    );
    
    if (!dataReady) {
      return {
        jobsCount: 0,
        quotesCount: 0,
        customersCount: 0,
        bankLinked: false,
        subscribed: false,
        hasNameAndBusiness: false,
        hasSentQuotes: false,
        hasScheduledJobs: false,
        dataReady: false,
        version: 0
      };
    }

    // Extract counts
    const finalJobsCount = jobsCount ?? 0;
    const finalQuotesCount = quotesCount ?? 0;
    const finalCustomersCount = customersCount ?? 0;

    // Check user and business setup from DATABASE (not Clerk)
    const hasUserName = !!(profile?.full_name);
    const hasBusinessName = business?.name_customized === true; // Use intent flag instead of string comparison
    const hasPhoneNumber = !!(profile?.phone_e164);
    const hasNameAndBusiness = hasUserName && hasBusinessName && hasPhoneNumber;

    // Check status flags
    const bankLinked = stripeStatus?.chargesEnabled ?? false;
    const subscribed = subscription?.subscribed ?? false;

    // Advanced flags for context-dependent steps
    const hasSentQuotes = quotesData?.rows?.some(quote => quote.status === 'Sent' || quote.status === 'Approved') ?? false;
    const hasScheduledJobs = jobsData?.rows?.some(job => job.status === 'Scheduled' || job.status === 'In Progress' || job.status === 'Completed') ?? false;

    // Create version number from data for stable dependencies
    const version = JSON.stringify({
      jobsCount: finalJobsCount,
      quotesCount: finalQuotesCount,
      customersCount: finalCustomersCount,
      bankLinked,
      subscribed,
      hasNameAndBusiness
    }).length; // Simple hash alternative

    return {
      jobsCount: finalJobsCount,
      quotesCount: finalQuotesCount,
      customersCount: finalCustomersCount,
      bankLinked,
      subscribed,
      hasNameAndBusiness,
      hasSentQuotes,
      hasScheduledJobs,
      dataReady: true,
      version
    };
  }, [customersCount, jobsCount, quotesCount, jobsData, quotesData, stripeStatus, subscription, profile, user, business]);
}