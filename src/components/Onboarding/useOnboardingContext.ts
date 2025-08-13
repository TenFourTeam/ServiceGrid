import { useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';

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
  const { data: dashboardData } = useDashboardData();
  const { data: customersData } = useSupabaseCustomers();
  const { data: jobsData } = useSupabaseJobs();
  const { data: quotesData } = useSupabaseQuotes();
  const { user } = useUser();
  const { business } = useStore();

  return useMemo(() => {
    // Check if all required data is loaded
    const dataReady = !!(dashboardData && customersData && jobsData && quotesData);
    
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
    const jobsCount = jobsData?.rows?.length ?? 0;
    const quotesCount = quotesData?.rows?.length ?? 0;
    const customersCount = customersData?.rows?.length ?? 0;

    // Check user and business setup
    const hasUserName = !!(user?.firstName || user?.fullName);
    const hasBusinessName = business?.name && business.name !== 'My Business';
    const hasNameAndBusiness = hasUserName && hasBusinessName;

    // Check status flags
    const bankLinked = dashboardData.stripeStatus?.chargesEnabled ?? false;
    const subscribed = dashboardData.subscription?.subscribed ?? false;

    // Advanced flags for context-dependent steps
    const hasSentQuotes = quotesData?.rows?.some(quote => quote.status === 'Sent' || quote.status === 'Approved') ?? false;
    const hasScheduledJobs = jobsData?.rows?.some(job => job.status === 'Scheduled' || job.status === 'In Progress' || job.status === 'Completed') ?? false;

    // Create version number from data for stable dependencies
    const version = JSON.stringify({
      jobsCount,
      quotesCount,
      customersCount,
      bankLinked,
      subscribed,
      hasNameAndBusiness
    }).length; // Simple hash alternative

    return {
      jobsCount,
      quotesCount,
      customersCount,
      bankLinked,
      subscribed,
      hasNameAndBusiness,
      hasSentQuotes,
      hasScheduledJobs,
      dataReady: true,
      version
    };
  }, [dashboardData, customersData, jobsData, quotesData, user, business]);
}