import { OnboardingStepConfig, OnboardingStep } from '@/types/onboarding';
import { OnboardingContext } from './useOnboardingContext';
import { 
  hasJobs, 
  hasQuotes, 
  hasCustomers, 
  isBankLinked, 
  isSubscribed,
  alwaysShow,
  shouldShowSendQuote,
  shouldShowScheduleJob
} from './guards';

export const onboardingSteps: Record<OnboardingStep, OnboardingStepConfig> = {
  welcome_intent: {
    id: 'welcome_intent',
    route: '/calendar',
    title: 'Welcome! Let\'s get you set up',
    hint: 'Choose how you\'d like to start using the platform',
    guard: alwaysShow, // Always show intent picker first
    canSkip: false,
    analyticsId: 'onb_welcome_intent',
    requiresAuth: true
  },

  create_job: {
    id: 'create_job',
    route: '/calendar',
    selector: '[data-onb="new-job-button"]',
    title: 'Create your first job',
    hint: 'Click here to create your first job. You can also tap any time slot on the calendar.',
    guard: hasJobs,
    onAdvance: () => console.log('First job created!'),
    canSkip: true,
    mobileUI: 'sheet',
    analyticsId: 'onb_create_job'
  },

  create_quote: {
    id: 'create_quote',
    route: '/quotes',
    selector: '[data-onb="new-quote-button"]',
    title: 'Create your first quote',
    hint: 'Send professional quotes to your customers in under a minute.',
    guard: hasQuotes,
    onAdvance: () => console.log('First quote created!'),
    canSkip: true,
    mobileUI: 'sheet',
    analyticsId: 'onb_create_quote'
  },

  create_customer: {
    id: 'create_customer',
    route: '/customers',
    selector: '[data-onb="add-customer-button"]',
    title: 'Add your first customer',
    hint: 'Add customer details to get started with jobs and quotes.',
    guard: hasCustomers,
    onAdvance: () => console.log('First customer added!'),
    canSkip: false,
    mobileUI: 'sheet',
    analyticsId: 'onb_create_customer'
  },

  link_bank: {
    id: 'link_bank',
    route: '/settings',
    selector: '[data-onb="link-bank-button"]',
    title: 'Link your bank account',
    hint: 'Connect your bank to accept payments and deposits (takes about 60 seconds).',
    guard: isBankLinked,
    canSkip: true,
    mobileUI: 'sheet',
    analyticsId: 'onb_link_bank'
  },

  send_quote: {
    id: 'send_quote',
    route: '/quotes',
    selector: '[data-onb="send-quote-button"]',
    title: 'Send your first quote',
    hint: 'Send this quote to your customer to get your first payment.',
    guard: shouldShowSendQuote,
    canSkip: true,
    analyticsId: 'onb_send_quote'
  },

  schedule_job: {
    id: 'schedule_job',
    route: '/calendar',
    selector: '[data-onb="schedule-button"]',
    title: 'Schedule the job',
    hint: 'Add this job to your calendar to stay organized.',
    guard: shouldShowScheduleJob,
    canSkip: true,
    analyticsId: 'onb_schedule_job'
  },

  start_subscription: {
    id: 'start_subscription',
    route: '/settings',
    selector: '[data-onb="upgrade-button"]',
    title: 'Upgrade your account',
    hint: 'Unlock all features with a paid subscription.',
    guard: isSubscribed,
    canSkip: true,
    mobileUI: 'sheet',
    analyticsId: 'onb_start_subscription'
  }
};