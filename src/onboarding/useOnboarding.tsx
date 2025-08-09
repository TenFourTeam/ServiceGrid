import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useAppStore';

const LS_KEY = 'onboarding_v1';

type Persisted = {
  emailSenderDone?: boolean;
  dismissed?: boolean;
};

export function useOnboarding() {
  const store = useStore();
  const [persist, setPersist] = useState<Persisted>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Persisted) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(persist));
  }, [persist]);

  const derived = useMemo(() => {
    const hasBusinessSetup = !!store.business.phone || store.business.name !== 'TenFour Lawn';
    const hasCustomer = store.customers.length > 0;
    const hasEstimate = store.estimates.length > 0;
    const hasJob = store.jobs.length > 0;
    const emailSenderDone = !!persist.emailSenderDone; // allow user to mark done

    const steps = [
      { id: 'business', label: 'Set business details', done: hasBusinessSetup, href: '/settings' },
      { id: 'customer', label: 'Add your first customer', done: hasCustomer, href: '/customers?new=1' },
      { id: 'estimate', label: 'Create your first quote', done: hasEstimate, href: '/estimates?new=1' },
      { id: 'job', label: 'Schedule your first job', done: hasJob, href: '/calendar' },
      { id: 'email', label: 'Connect email sender', done: emailSenderDone, href: '/settings#email-sending' },
    ] as const;

    const completed = steps.filter(s => s.done).length;
    const total = steps.length;
    const complete = completed === total;

    return { steps, completed, total, complete };
  }, [store.business.name, store.business.phone, store.customers.length, store.estimates.length, store.jobs.length, persist.emailSenderDone]);

  const markEmailSenderDone = () => setPersist(p => ({ ...p, emailSenderDone: true }));
  const dismiss = () => setPersist(p => ({ ...p, dismissed: true }));
  const undismiss = () => setPersist(p => ({ ...p, dismissed: false }));

  return { ...derived, dismissed: !!persist.dismissed, markEmailSenderDone, dismiss, undismiss };
}
