// Note: This file is deprecated for frontend use. 
// Lifecycle emails should be managed server-side through edge functions.

export interface LifecycleEmailData {
  userFullName?: string;
  userEmail?: string;
  businessName?: string;
  businessId?: string;
  userId?: string;
  signupDate?: string;
  lastLoginDate?: string;
}

/**
 * Send lifecycle email via edge function
 * Note: This function requires an authApi instance for authentication
 */
export async function sendLifecycleEmail(
  type: string,
  data: LifecycleEmailData,
  authApi: any,
  extraParams?: Record<string, any>
) {
  try {
    const { data: response, error } = await authApi.invoke('send-lifecycle-email', {
      body: {
        type,
        data,
        ...extraParams
      }
    });

    if (error) {
      console.error('[sendLifecycleEmail] Error:', error);
      return { success: false, error };
    }

    console.info('[sendLifecycleEmail] Sent:', type, data.userEmail);
    return { success: true, data: response };
  } catch (error) {
    console.error('[sendLifecycleEmail] Exception:', error);
    return { success: false, error };
  }
}

/**
 * Check if user should receive a lifecycle email
 */
export function shouldSendLifecycleEmail(
  data: LifecycleEmailData,
  emailType: string
): boolean {
  // Basic validation
  if (!data.userEmail || !data.userId) {
    return false;
  }

  // Add more sophisticated logic here if needed
  // For now, allow all emails
  return true;
}

/**
 * Get user engagement metrics
 * Note: This function is deprecated for frontend use.
 * Engagement data should be fetched through edge functions with proper authentication.
 */
export async function getUserEngagementData(
  userId: string,
  authApi: any
): Promise<{
  lastLoginDate?: string;
  signupDate?: string;
  hasCustomers: boolean;
  hasQuotes: boolean;
  hasJobs: boolean;
  hasStripeConnected: boolean;
}> {
  try {
    // This should be replaced with edge function calls for proper authentication
    console.warn('[getUserEngagementData] This function should use edge functions for authentication');
    
    return {
      hasCustomers: false,
      hasQuotes: false,
      hasJobs: false,
      hasStripeConnected: false
    };
  } catch (error) {
    console.error('[getUserEngagementData] Error:', error);
    return {
      hasCustomers: false,
      hasQuotes: false,
      hasJobs: false,
      hasStripeConnected: false
    };
  }
}

/**
 * Calculate days since signup
 */
export function daysSinceSignup(signupDate: string): number {
  const signup = new Date(signupDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - signup.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days since last login
 */
export function daysSinceLastLogin(lastLoginDate?: string): number {
  if (!lastLoginDate) return 0;
  
  const lastLogin = new Date(lastLoginDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastLogin.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Lifecycle email trigger functions
// Note: These functions are deprecated for frontend use and should be handled server-side
export const lifecycleEmailTriggers = {
  // Welcome email on first login
  async sendWelcomeEmail(data: LifecycleEmailData, authApi: any) {
    if (!shouldSendLifecycleEmail(data, 'welcome')) return;
    
    return sendLifecycleEmail('welcome', data, authApi);
  },

  // Feature discovery emails
  async sendFeatureDiscoveryEmail(
    data: LifecycleEmailData, 
    authApi: any,
    params: { feature: string; featureDescription: string; ctaUrl: string; ctaText: string; daysFromSignup?: number }
  ) {
    return sendLifecycleEmail('feature-discovery', data, authApi, {
      featureName: params.feature,
      featureDescription: params.featureDescription,
      featureUrl: params.ctaUrl,
      ctaText: params.ctaText,
      daysFromSignup: params.daysFromSignup || 3
    });
  },

  async sendCustomerManagementEmail(data: LifecycleEmailData, authApi: any) {
    const engagement = await getUserEngagementData(data.userId!, authApi);
    
    // Only send if user signed up 3+ days ago and has no customers
    if (data.signupDate && daysSinceSignup(data.signupDate) >= 3 && !engagement.hasCustomers) {
      return sendLifecycleEmail('feature-discovery', data, authApi, {
        featureName: 'Customer Management',
        featureDescription: 'Keep all your customer information organized in one place. Add contacts, track history, and never lose important details.',
        featureUrl: '/customers',
        daysFromSignup: 3
      });
    }
  },

  async sendCalendarIntegrationEmail(data: LifecycleEmailData, authApi: any) {
    const engagement = await getUserEngagementData(data.userId!, authApi);
    
    // Only send if user signed up 5+ days ago and has no jobs
    if (data.signupDate && daysSinceSignup(data.signupDate) >= 5 && !engagement.hasJobs) {
      return sendLifecycleEmail('feature-discovery', data, authApi, {
        featureName: 'Calendar Integration',
        featureDescription: 'Never miss an appointment again! Schedule jobs, set reminders, and keep your team synchronized.',
        featureUrl: '/calendar',
        daysFromSignup: 5
      });
    }
  },

  // Milestone celebration emails
  async sendFirstQuoteCreatedEmail(data: LifecycleEmailData, authApi: any) {
    return sendLifecycleEmail('milestone', data, authApi, {
      milestoneType: 'quote',
      nextSteps: 'Now you can send this quote to your customer and start converting leads into jobs.',
      ctaText: 'Send Your Quote',
      ctaUrl: '/quotes'
    });
  },

  async sendFirstJobScheduledEmail(data: LifecycleEmailData, authApi: any) {
    return sendLifecycleEmail('milestone', data, authApi, {
      milestoneType: 'job',
      nextSteps: 'Great job! You\'re building a systematic approach to managing your service business.',
      ctaText: 'View Your Jobs',
      ctaUrl: '/calendar'
    });
  },

  async sendFirstInvoiceSentEmail(data: LifecycleEmailData, authApi: any) {
    return sendLifecycleEmail('milestone', data, authApi, {
      milestoneType: 'invoice',
      nextSteps: 'You\'re on track to get paid! Consider connecting Stripe to accept online payments.',
      ctaText: 'View Invoices',
      ctaUrl: '/invoices'
    });
  },

  async sendStripeConnectedEmail(data: LifecycleEmailData, authApi: any) {
    return sendLifecycleEmail('milestone', data, authApi, {
      milestoneType: 'stripe',
      nextSteps: 'You can now accept credit card payments directly through your invoices. Your customers will love the convenience!',
      ctaText: 'Create Invoice',
      ctaUrl: '/invoices'
    });
  },

  // Engagement recovery emails
  async sendEngagementRecoveryEmail(
    data: LifecycleEmailData, 
    authApi: any,
    params: { type: string; lastActivity?: string }
  ) {
    const daysInactive = params.type === '7-day' ? 7 : 14;
    const isLongInactive = daysInactive >= 14;
    
    return sendLifecycleEmail('engagement', data, authApi, {
      daysInactive,
      ctaText: isLongInactive ? 'Get Help Getting Started' : 'Continue Building',
      ctaUrl: isLongInactive ? '/settings' : '/calendar'
    });
  },

  async sendInactiveUserEmail(
    data: LifecycleEmailData, 
    authApi: any,
    daysInactive: number
  ) {
    const isLongInactive = daysInactive >= 14;
    
    return sendLifecycleEmail('engagement', data, authApi, {
      daysInactive,
      ctaText: isLongInactive ? 'Get Help Getting Started' : 'Continue Building',
      ctaUrl: isLongInactive ? '/settings' : '/calendar'
    });
  }
};