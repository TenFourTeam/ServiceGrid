// Unified onboarding step configuration with progressive dependencies
export type StepId = 'profile' | 'customers' | 'content' | 'bank' | 'subscription';

export type OnbCtx = {
  profile: { 
    fullName?: string | null; 
    phoneE164?: string | null; 
  };
  business: { 
    name?: string | null;
  };
  counts: { 
    customers: number; 
    jobs: number; 
    quotes: number; 
  };
  billing: { 
    bankLinked: boolean; 
    subscribed: boolean; 
  };
};

export type StepConfig = {
  id: StepId;
  title: string;
  route: string;
  focus?: string;              // optional component focus key for spotlight
  guard: (ctx: OnbCtx) => boolean;  // completion condition
  dependsOn?: StepId[];        // optional hard deps for gating
};

export const stepOrder: StepId[] = ['profile', 'customers', 'content', 'bank', 'subscription'];

export const steps: Record<StepId, StepConfig> = {
  profile: {
    id: 'profile',
    title: 'Set up your profile',
    route: '/settings',
    focus: 'profile',
    guard: (ctx) => {
      const okName = !!ctx.profile.fullName?.trim();
      const okBiz = !!ctx.business.name?.trim();
      const okPhone = !!ctx.profile.phoneE164; // server-normalized
      return okName && okBiz && okPhone;
    }
  },
  customers: {
    id: 'customers',
    title: 'Add your first customer',
    route: '/customers',
    guard: (ctx) => ctx.counts.customers > 0,
    dependsOn: ['profile']
  },
  content: {
    id: 'content',
    title: 'Create a job or quote',
    route: '/calendar', // or '/quotes'
    guard: (ctx) => ctx.counts.jobs > 0 || ctx.counts.quotes > 0,
    dependsOn: ['profile', 'customers']
  },
  bank: {
    id: 'bank',
    title: 'Link your bank account',
    route: '/settings',
    focus: 'bank',
    guard: (ctx) => ctx.billing.bankLinked,
    dependsOn: ['profile', 'customers', 'content']
  },
  subscription: {
    id: 'subscription',
    title: 'Start your subscription',
    route: '/settings',
    focus: 'subscription',
    guard: (ctx) => ctx.billing.subscribed,
    dependsOn: ['profile', 'customers', 'content', 'bank']
  }
};