import { useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStore } from '@/store/useAppStore';
import { useCustomersCount } from '@/hooks/useCustomersCount';
import { useJobsCount } from '@/hooks/useJobsCount';
import { useQuotesCount } from '@/hooks/useQuotesCount';
import { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useProfile } from '@/queries/useProfile';
import { steps, stepOrder, type OnbCtx, type StepId } from './steps';

function clamp(n: number, min = 0, max = 100) { 
  return Math.max(min, Math.min(max, n)); 
}

export type StepStatus = 'complete' | 'active' | 'pending' | 'locked';

export function useOnboardingState() {
  const { user } = useUser();
  const { business } = useStore();
  const { data: customersCount } = useCustomersCount();
  const { data: jobsCount } = useJobsCount();
  const { data: quotesCount } = useQuotesCount();
  const { data: stripeStatus } = useStripeConnectStatus();
  const { data: subscription } = useSubscriptionStatus();
  const { data: profile } = useProfile();

  const ctx: OnbCtx = useMemo(() => ({
    profile: { 
      fullName: profile?.full_name ?? null, 
      phoneE164: profile?.phone_e164 ?? null 
    },
    business: { 
      name: business?.name ?? null,
      nameCustomized: business?.name_customized ?? false
    },
    counts: { 
      customers: customersCount ?? 0, 
      jobs: jobsCount ?? 0, 
      quotes: quotesCount ?? 0 
    },
    billing: { 
      bankLinked: !!stripeStatus?.chargesEnabled, 
      subscribed: !!subscription?.subscribed 
    }
  }), [profile, business, customersCount, jobsCount, quotesCount, stripeStatus, subscription]);

  const completionByStep: Record<StepId, boolean> = useMemo(() => {
    const res = {} as Record<StepId, boolean>;
    for (const id of stepOrder) {
      res[id] = steps[id].guard(ctx);
    }
    return res;
  }, [ctx]);

  // First incomplete step in order becomes "active"
  const currentStepId: StepId | null = useMemo(() => {
    for (const id of stepOrder) {
      if (!completionByStep[id]) return id;
    }
    return null; // everything complete
  }, [completionByStep]);

  // Status per step (progressive gating)
  const statuses: Record<StepId, StepStatus> = useMemo(() => {
    const out = {} as Record<StepId, StepStatus>;
    for (const id of stepOrder) {
      if (completionByStep[id]) { 
        out[id] = 'complete'; 
        continue; 
      }
      if (id === currentStepId) { 
        out[id] = 'active'; 
        continue; 
      }
      const deps = steps[id].dependsOn ?? [];
      const depsOk = deps.every(d => completionByStep[d]);
      out[id] = depsOk ? 'pending' : 'locked';
    }
    return out;
  }, [completionByStep, currentStepId]);

  const completedCount = stepOrder.filter(id => completionByStep[id]).length;
  const progressPct = clamp(Math.round((completedCount / stepOrder.length) * 100));

  // Legacy compatibility
  const legacyState = useMemo(() => {
    const hasNameAndBusiness = completionByStep.profile;
    const hasCustomers = completionByStep.customers;
    const hasJobs = ctx.counts.jobs > 0;
    const hasQuotes = ctx.counts.quotes > 0;
    const bankLinked = ctx.billing.bankLinked;
    const subscribed = ctx.billing.subscribed;

    let nextAction: string | null = null;
    if (currentStepId) {
      nextAction = steps[currentStepId].title;
    }

    return {
      hasNameAndBusiness,
      hasCustomers,
      hasJobs,
      hasQuotes,
      bankLinked,
      subscribed,
      completionPercentage: progressPct,
      nextAction,
      isComplete: currentStepId === null,
      showIntentPicker: hasNameAndBusiness && !hasCustomers && !hasJobs && !hasQuotes
    };
  }, [completionByStep, ctx, progressPct, currentStepId]);

  return {
    ...legacyState,
    ctx,
    steps,
    stepOrder,
    completionByStep,
    statuses,
    currentStepId,
    allComplete: currentStepId === null,
    progressPct
  };
}