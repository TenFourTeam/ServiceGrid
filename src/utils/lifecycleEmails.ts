import { supabase } from '@/integrations/supabase/client';
import { fn } from '@/utils/functionUrl';

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
 */
export async function sendLifecycleEmail(
  type: string,
  data: LifecycleEmailData,
  extraParams?: Record<string, any>
) {
  try {
    const response = await supabase.functions.invoke('send-lifecycle-email', {
      body: {
        type,
        data,
        ...extraParams
      }
    });

    if (response.error) {
      console.error('[sendLifecycleEmail] Error:', response.error);
      return { success: false, error: response.error };
    }

    console.info('[sendLifecycleEmail] Sent:', type, data.userEmail);
    return { success: true, data: response.data };
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
 */
export async function getUserEngagementData(userId: string): Promise<{
  lastLoginDate?: string;
  signupDate?: string;
  hasCustomers: boolean;
  hasQuotes: boolean;
  hasJobs: boolean;
  hasStripeConnected: boolean;
}> {
  try {
    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    // Get business data
    const { data: business } = await supabase
      .from('business_members')
      .select(`
        business_id,
        businesses!inner(
          stripe_account_id
        )
      `)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    const businessId = business?.business_id;

    // Get engagement metrics
    const [
      { count: customerCount },
      { count: quoteCount },
      { count: jobCount }
    ] = await Promise.all([
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId || ''),
      
      supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId || ''),
      
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId || '')
    ]);

    return {
      signupDate: profile?.created_at,
      hasCustomers: (customerCount || 0) > 0,
      hasQuotes: (quoteCount || 0) > 0,
      hasJobs: (jobCount || 0) > 0,
      hasStripeConnected: !!(business?.businesses as any)?.stripe_account_id
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
export const lifecycleEmailTriggers = {
  // Welcome email on first login
  async sendWelcomeEmail(data: LifecycleEmailData) {
    if (!shouldSendLifecycleEmail(data, 'welcome')) return;
    
    return sendLifecycleEmail('welcome', data);
  },

  // Feature discovery emails
  async sendFeatureDiscoveryEmail(data: LifecycleEmailData, params: { feature: string; featureDescription: string; ctaUrl: string; ctaText: string }) {
    return sendLifecycleEmail('feature-discovery', data, {
      featureName: params.feature,
      featureDescription: params.featureDescription,
      featureUrl: params.ctaUrl,
      ctaText: params.ctaText
    });
  },

  async sendCustomerManagementEmail(data: LifecycleEmailData) {
    const engagement = await getUserEngagementData(data.userId!);
    
    // Only send if user signed up 3+ days ago and has no customers
    if (data.signupDate && daysSinceSignup(data.signupDate) >= 3 && !engagement.hasCustomers) {
      return sendLifecycleEmail('feature-discovery', data, {
        featureName: 'Customer Management',
        featureDescription: 'Keep all your customer information organized in one place. Add contacts, track history, and never lose important details.',
        featureUrl: `${window.location.origin}/customers`,
        daysFromSignup: 3
      });
    }
  },

  async sendCalendarIntegrationEmail(data: LifecycleEmailData) {
    const engagement = await getUserEngagementData(data.userId!);
    
    // Only send if user signed up 5+ days ago and has no jobs
    if (data.signupDate && daysSinceSignup(data.signupDate) >= 5 && !engagement.hasJobs) {
      return sendLifecycleEmail('feature-discovery', data, {
        featureName: 'Calendar Integration',
        featureDescription: 'Never miss an appointment again! Schedule jobs, set reminders, and keep your team synchronized.',
        featureUrl: `${window.location.origin}/calendar`,
        daysFromSignup: 5
      });
    }
  },

  // Milestone celebration emails
  async sendFirstQuoteCreatedEmail(data: LifecycleEmailData) {
    return sendLifecycleEmail('milestone', data, {
      milestoneType: 'quote',
      nextSteps: 'Now you can send this quote to your customer and start converting leads into jobs.',
      ctaText: 'Send Your Quote',
      ctaUrl: `${window.location.origin}/quotes`
    });
  },

  async sendFirstJobScheduledEmail(data: LifecycleEmailData) {
    return sendLifecycleEmail('milestone', data, {
      milestoneType: 'job',
      nextSteps: 'Great job! You\'re building a systematic approach to managing your service business.',
      ctaText: 'View Your Jobs',
      ctaUrl: `${window.location.origin}/calendar`
    });
  },

  async sendFirstInvoiceSentEmail(data: LifecycleEmailData) {
    return sendLifecycleEmail('milestone', data, {
      milestoneType: 'invoice',
      nextSteps: 'You\'re on track to get paid! Consider connecting Stripe to accept online payments.',
      ctaText: 'View Invoices',
      ctaUrl: `${window.location.origin}/invoices`
    });
  },

  async sendStripeConnectedEmail(data: LifecycleEmailData) {
    return sendLifecycleEmail('milestone', data, {
      milestoneType: 'stripe',
      nextSteps: 'You can now accept credit card payments directly through your invoices. Your customers will love the convenience!',
      ctaText: 'Create Invoice',
      ctaUrl: `${window.location.origin}/invoices`
    });
  },

  // Engagement recovery emails
  async sendEngagementRecoveryEmail(data: LifecycleEmailData, params: { type: string; lastActivity?: string }) {
    const daysInactive = params.type === '7-day' ? 7 : 14;
    const isLongInactive = daysInactive >= 14;
    
    return sendLifecycleEmail('engagement', data, {
      daysInactive,
      ctaText: isLongInactive ? 'Get Help Getting Started' : 'Continue Building',
      ctaUrl: isLongInactive ? `${window.location.origin}/settings` : `${window.location.origin}/calendar`
    });
  },

  async sendInactiveUserEmail(data: LifecycleEmailData, daysInactive: number) {
    const isLongInactive = daysInactive >= 14;
    
    return sendLifecycleEmail('engagement', data, {
      daysInactive,
      ctaText: isLongInactive ? 'Get Help Getting Started' : 'Continue Building',
      ctaUrl: isLongInactive ? `${window.location.origin}/settings` : `${window.location.origin}/calendar`
    });
  }
};