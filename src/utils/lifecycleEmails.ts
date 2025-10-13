/**
 * Email type constants for lifecycle emails
 * Using specific types instead of generic ones ensures proper tracking
 */
export const LIFECYCLE_EMAIL_TYPES = {
  WELCOME: 'welcome',
  FEATURE_DISCOVERY_CUSTOMERS: 'feature-discovery-customers',
  FEATURE_DISCOVERY_CALENDAR: 'feature-discovery-calendar',
  FEATURE_DISCOVERY_SUCCESS: 'feature-discovery-success',
  MILESTONE_QUOTE: 'milestone-quote',
  MILESTONE_JOB: 'milestone-job',
  MILESTONE_INVOICE: 'milestone-invoice',
  MILESTONE_STRIPE: 'milestone-stripe',
  ENGAGEMENT_7DAY: 'engagement-7day',
  ENGAGEMENT_14DAY: 'engagement-14day'
} as const;

export type LifecycleEmailType = typeof LIFECYCLE_EMAIL_TYPES[keyof typeof LIFECYCLE_EMAIL_TYPES];

/**
 * Lifecycle email data structure
 */
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
  /**
   * Send welcome email when user first signs up
   */
  async sendWelcomeEmail(data: LifecycleEmailData, authApi: any) {
    try {
      await sendLifecycleEmail(LIFECYCLE_EMAIL_TYPES.WELCOME, data, authApi);
      console.info('[lifecycleEmails] Welcome email sent');
    } catch (error) {
      console.error('[lifecycleEmails] Failed to send welcome email:', error);
    }
  },

  /**
   * Generic feature discovery email with specific type
   */
  async sendFeatureDiscoveryEmail(data: LifecycleEmailData, authApi: any, params: {
    emailType: LifecycleEmailType;
    feature: string;
    featureDescription: string;
    ctaUrl: string;
    ctaText: string;
    daysFromSignup?: number;
  }) {
    try {
      await sendLifecycleEmail(params.emailType, data, authApi, {
        featureName: params.feature,
        featureDescription: params.featureDescription,
        featureUrl: params.ctaUrl,
        daysFromSignup: params.daysFromSignup || 3
      });
      console.info('[lifecycleEmails] Feature discovery email sent:', params.feature);
    } catch (error) {
      console.error('[lifecycleEmails] Failed to send feature discovery email:', error);
    }
  },

  /**
   * Day 3: Customer management feature
   */
  async sendCustomerManagementEmail(data: LifecycleEmailData, authApi: any) {
    return this.sendFeatureDiscoveryEmail(data, authApi, {
      emailType: LIFECYCLE_EMAIL_TYPES.FEATURE_DISCOVERY_CUSTOMERS,
      feature: 'Customer Management',
      featureDescription: 'Organize your customer information and communication',
      ctaUrl: '/customers',
      ctaText: 'Manage Customers',
      daysFromSignup: 3
    });
  },

  /**
   * Day 5: Calendar integration feature
   */
  async sendCalendarIntegrationEmail(data: LifecycleEmailData, authApi: any) {
    return this.sendFeatureDiscoveryEmail(data, authApi, {
      emailType: LIFECYCLE_EMAIL_TYPES.FEATURE_DISCOVERY_CALENDAR,
      feature: 'Calendar Integration',
      featureDescription: 'Schedule and track your jobs with our calendar',
      ctaUrl: '/calendar',
      ctaText: 'View Calendar',
      daysFromSignup: 5
    });
  },

  /**
   * Milestone: First quote created
   */
  async sendFirstQuoteCreatedEmail(data: LifecycleEmailData, authApi: any) {
    try {
      await sendLifecycleEmail(LIFECYCLE_EMAIL_TYPES.MILESTONE_QUOTE, data, authApi, {
        milestoneType: 'quote',
        nextSteps: 'Now send your quote to your customer and schedule a job when they approve it.',
        ctaText: 'View Your Quotes',
        ctaUrl: '/quotes'
      });
      console.info('[lifecycleEmails] First quote milestone email sent');
    } catch (error) {
      console.error('[lifecycleEmails] Failed to send first quote email:', error);
    }
  },

  /**
   * Milestone: First job scheduled
   */
  async sendFirstJobScheduledEmail(data: LifecycleEmailData, authApi: any) {
    try {
      await sendLifecycleEmail(LIFECYCLE_EMAIL_TYPES.MILESTONE_JOB, data, authApi, {
        milestoneType: 'job',
        nextSteps: 'Your calendar is taking shape! Now create an invoice to get paid after completing the job.',
        ctaText: 'View Your Calendar',
        ctaUrl: '/calendar'
      });
      console.info('[lifecycleEmails] First job milestone email sent');
    } catch (error) {
      console.error('[lifecycleEmails] Failed to send first job email:', error);
    }
  },

  /**
   * Milestone: First invoice sent
   */
  async sendFirstInvoiceSentEmail(data: LifecycleEmailData, authApi: any) {
    try {
      await sendLifecycleEmail(LIFECYCLE_EMAIL_TYPES.MILESTONE_INVOICE, data, authApi, {
        milestoneType: 'invoice',
        nextSteps: 'Great job! Connect Stripe to accept online payments and get paid faster.',
        ctaText: 'View Your Invoices',
        ctaUrl: '/invoices'
      });
      console.info('[lifecycleEmails] First invoice milestone email sent');
    } catch (error) {
      console.error('[lifecycleEmails] Failed to send first invoice email:', error);
    }
  },

  /**
   * Milestone: Stripe connected
   */
  async sendStripeConnectedEmail(data: LifecycleEmailData, authApi: any) {
    try {
      await sendLifecycleEmail(LIFECYCLE_EMAIL_TYPES.MILESTONE_STRIPE, data, authApi, {
        milestoneType: 'stripe',
        nextSteps: 'You\'re all set up to accept payments! Send an invoice with a payment link to get paid online.',
        ctaText: 'Create an Invoice',
        ctaUrl: '/invoices'
      });
      console.info('[lifecycleEmails] Stripe connected milestone email sent');
    } catch (error) {
      console.error('[lifecycleEmails] Failed to send Stripe connected email:', error);
    }
  },

  /**
   * Engagement recovery email
   */
  async sendEngagementRecoveryEmail(data: LifecycleEmailData, authApi: any, params: {
    type: '7-day' | '14-day';
    lastActivity: string;
  }) {
    try {
      const daysInactive = params.type === '7-day' ? 7 : 14;
      const emailType = params.type === '7-day' 
        ? LIFECYCLE_EMAIL_TYPES.ENGAGEMENT_7DAY 
        : LIFECYCLE_EMAIL_TYPES.ENGAGEMENT_14DAY;
      
      await sendLifecycleEmail(emailType, data, authApi, {
        daysInactive,
        ctaText: params.type === '7-day' ? 'Check Your Calendar' : 'Get Help',
        ctaUrl: params.type === '7-day' ? '/calendar' : '/settings'
      });
      console.info('[lifecycleEmails] Engagement recovery email sent:', params.type);
    } catch (error) {
      console.error('[lifecycleEmails] Failed to send engagement email:', error);
    }
  },

  /**
   * Inactive user email (alias for engagement recovery)
   */
  async sendInactiveUserEmail(
    data: LifecycleEmailData, 
    authApi: any,
    daysInactive: number
  ) {
    const type = daysInactive >= 14 ? '14-day' : '7-day';
    return this.sendEngagementRecoveryEmail(data, authApi, {
      type,
      lastActivity: new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000).toISOString()
    });
  }
};
