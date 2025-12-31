/**
 * Edge Function Registry
 * 
 * Complete registry of all 161 edge functions with their expected
 * configuration, dependencies, and verification requirements.
 */

import { EdgeFunctionDefinition, EdgeFunctionCategory } from '../types';

// ============================================================================
// Edge Function Registry
// ============================================================================

export const EDGE_FUNCTION_REGISTRY: EdgeFunctionDefinition[] = [
  // Auth & Profile
  { name: 'accept-invite', path: 'supabase/functions/accept-invite/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'customer-auth', path: 'supabase/functions/customer-auth/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'decline-invite', path: 'supabase/functions/decline-invite/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'get-profile', path: 'supabase/functions/get-profile/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'update-profile', path: 'supabase/functions/update-profile/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'complete-profile-email', path: 'supabase/functions/complete-profile-email/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'clerk-publishable-key', path: 'supabase/functions/clerk-publishable-key/index.ts', requiresAuth: false, requiredSecrets: ['CLERK_PUBLISHABLE_KEY'], hasCors: true, category: 'auth' },
  { name: 'leave-business', path: 'supabase/functions/leave-business/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'create-invites', path: 'supabase/functions/create-invites/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'search-invite-users', path: 'supabase/functions/search-invite-users/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'user-businesses', path: 'supabase/functions/user-businesses/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },
  { name: 'user-pending-invites', path: 'supabase/functions/user-pending-invites/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'auth' },

  // AI
  { name: 'ai-chat', path: 'supabase/functions/ai-chat/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'ai-chat-messages', path: 'supabase/functions/ai-chat-messages/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'ai' },
  { name: 'ai-generations-analytics', path: 'supabase/functions/ai-generations-analytics/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'ai' },
  { name: 'ai-schedule-optimizer', path: 'supabase/functions/ai-schedule-optimizer/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'estimate-job-from-photo', path: 'supabase/functions/estimate-job-from-photo/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'extract-invoice-from-photo', path: 'supabase/functions/extract-invoice-from-photo/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'generate-checklist-from-photo', path: 'supabase/functions/generate-checklist-from-photo/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'generate-overview-doc', path: 'supabase/functions/generate-overview-doc/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'generate-property-visualization', path: 'supabase/functions/generate-property-visualization/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'generate-sop-infographic', path: 'supabase/functions/generate-sop-infographic/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'generate-summary', path: 'supabase/functions/generate-summary/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'predict-scheduling', path: 'supabase/functions/predict-scheduling/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },
  { name: 'populate-industry-sops', path: 'supabase/functions/populate-industry-sops/index.ts', requiresAuth: true, requiredSecrets: ['ANTHROPIC_API_KEY'], hasCors: true, category: 'ai' },

  // Billing & Payments
  { name: 'create-checkout', path: 'supabase/functions/create-checkout/index.ts', requiresAuth: true, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'stripe-config', path: 'supabase/functions/stripe-config/index.ts', requiresAuth: false, requiredSecrets: ['STRIPE_PUBLISHABLE_KEY'], hasCors: true, category: 'billing' },
  { name: 'stripe-connect-crud', path: 'supabase/functions/stripe-connect-crud/index.ts', requiresAuth: true, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'stripe-webhooks', path: 'supabase/functions/stripe-webhooks/index.ts', requiresAuth: false, requiredSecrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], hasCors: true, category: 'billing' },
  { name: 'check-subscription', path: 'supabase/functions/check-subscription/index.ts', requiresAuth: true, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'check-subscription-status', path: 'supabase/functions/check-subscription-status/index.ts', requiresAuth: true, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'connect-account-status', path: 'supabase/functions/connect-account-status/index.ts', requiresAuth: true, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'connect-disconnect', path: 'supabase/functions/connect-disconnect/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'billing' },
  { name: 'connect-onboarding-link', path: 'supabase/functions/connect-onboarding-link/index.ts', requiresAuth: true, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'create-invoice-payment', path: 'supabase/functions/create-invoice-payment/index.ts', requiresAuth: true, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'create-invoice-payment-public', path: 'supabase/functions/create-invoice-payment-public/index.ts', requiresAuth: false, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'verify-payment', path: 'supabase/functions/verify-payment/index.ts', requiresAuth: false, requiredSecrets: ['STRIPE_SECRET_KEY'], hasCors: true, category: 'billing' },
  { name: 'payments-crud', path: 'supabase/functions/payments-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'billing' },
  { name: 'subscriptions-crud', path: 'supabase/functions/subscriptions-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'billing' },
  { name: 'manage-quote-subscription', path: 'supabase/functions/manage-quote-subscription/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'billing' },

  // Customer Portal
  { name: 'customer-portal', path: 'supabase/functions/customer-portal/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-portal-invite', path: 'supabase/functions/customer-portal-invite/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-portal-invite-validate', path: 'supabase/functions/customer-portal-invite-validate/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-portal-status', path: 'supabase/functions/customer-portal-status/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-invoice-detail', path: 'supabase/functions/customer-invoice-detail/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-job-data', path: 'supabase/functions/customer-job-data/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-messages-crud', path: 'supabase/functions/customer-messages-crud/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-quote-actions', path: 'supabase/functions/customer-quote-actions/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-service-request', path: 'supabase/functions/customer-service-request/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-switch-business', path: 'supabase/functions/customer-switch-business/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-upload-media', path: 'supabase/functions/customer-upload-media/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customer-appointment-requests', path: 'supabase/functions/customer-appointment-requests/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'appointment-requests-manage', path: 'supabase/functions/appointment-requests-manage/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customers-crud', path: 'supabase/functions/customers-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'customers-bulk-delete', path: 'supabase/functions/customers-bulk-delete/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'customer' },
  { name: 'bulk-import-customers', path: 'supabase/functions/bulk-import-customers/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'customer' },

  // Scheduling
  { name: 'auto-schedule-request', path: 'supabase/functions/auto-schedule-request/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'check-scheduling-capacity', path: 'supabase/functions/check-scheduling-capacity/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'jobs-crud', path: 'supabase/functions/jobs-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'jobs-crud-assign', path: 'supabase/functions/jobs-crud-assign/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'jobs-location-query', path: 'supabase/functions/jobs-location-query/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'jobs-status-batch', path: 'supabase/functions/jobs-status-batch/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'job-confirm', path: 'supabase/functions/job-confirm/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'job-media-crud', path: 'supabase/functions/job-media-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'recurring-jobs-crud', path: 'supabase/functions/recurring-jobs-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'recurring-schedules-crud', path: 'supabase/functions/recurring-schedules-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'generate-recurring-jobs', path: 'supabase/functions/generate-recurring-jobs/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'auto-generate-recurring-jobs', path: 'supabase/functions/auto-generate-recurring-jobs/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'optimize-job-route', path: 'supabase/functions/optimize-job-route/index.ts', requiresAuth: true, requiredSecrets: ['GOOGLE_MAPS_API_KEY'], hasCors: true, category: 'scheduling' },
  { name: 'optimize-recurring-route', path: 'supabase/functions/optimize-recurring-route/index.ts', requiresAuth: true, requiredSecrets: ['GOOGLE_MAPS_API_KEY'], hasCors: true, category: 'scheduling' },
  { name: 'priority-reschedule', path: 'supabase/functions/priority-reschedule/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'suggest-reschedule', path: 'supabase/functions/suggest-reschedule/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'team-availability-crud', path: 'supabase/functions/team-availability-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'team-utilization', path: 'supabase/functions/team-utilization/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'time-off-crud', path: 'supabase/functions/time-off-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'unified-assignments', path: 'supabase/functions/unified-assignments/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },
  { name: 'calculate-route-directions', path: 'supabase/functions/calculate-route-directions/index.ts', requiresAuth: true, requiredSecrets: ['GOOGLE_MAPS_API_KEY'], hasCors: true, category: 'scheduling' },
  { name: 'calculate-travel-times', path: 'supabase/functions/calculate-travel-times/index.ts', requiresAuth: true, requiredSecrets: ['GOOGLE_MAPS_API_KEY'], hasCors: true, category: 'scheduling' },
  { name: 'send-work-order-confirmations', path: 'supabase/functions/send-work-order-confirmations/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'scheduling' },

  // Invoicing & Quotes
  { name: 'invoices-crud', path: 'supabase/functions/invoices-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'invoicing' },
  { name: 'auto-generate-recurring-invoices', path: 'supabase/functions/auto-generate-recurring-invoices/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'invoicing' },
  { name: 'quotes-crud', path: 'supabase/functions/quotes-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'invoicing' },
  { name: 'quote-view', path: 'supabase/functions/quote-view/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'invoicing' },
  { name: 'quote-events', path: 'supabase/functions/quote-events/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'invoicing' },
  { name: 'generate-document-pdf', path: 'supabase/functions/generate-document-pdf/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'invoicing' },
  { name: 'pricing-rules-crud', path: 'supabase/functions/pricing-rules-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'invoicing' },
  { name: 'service-catalog-crud', path: 'supabase/functions/service-catalog-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'invoicing' },

  // Media
  { name: 'upload-job-photo', path: 'supabase/functions/upload-job-photo/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'upload-request-photo', path: 'supabase/functions/upload-request-photo/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'upload-business-logo', path: 'supabase/functions/upload-business-logo/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'upload-conversation-media', path: 'supabase/functions/upload-conversation-media/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'upload-invoice-media', path: 'supabase/functions/upload-invoice-media/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'update-media-tags', path: 'supabase/functions/update-media-tags/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'update-media-annotations', path: 'supabase/functions/update-media-annotations/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'bulk-update-media-tags', path: 'supabase/functions/bulk-update-media-tags/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'process-media-thumbnail', path: 'supabase/functions/process-media-thumbnail/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'transcode-media-video', path: 'supabase/functions/transcode-media-video/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },
  { name: 'conversation-media-fetch', path: 'supabase/functions/conversation-media-fetch/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'media' },

  // Integrations - Google Drive
  { name: 'google-drive-oauth', path: 'supabase/functions/google-drive-oauth/index.ts', requiresAuth: true, requiredSecrets: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], hasCors: true, category: 'integrations' },
  { name: 'google-drive-disconnect', path: 'supabase/functions/google-drive-disconnect/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-list-files', path: 'supabase/functions/google-drive-list-files/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-upload-file', path: 'supabase/functions/google-drive-upload-file/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-create-folder-structure', path: 'supabase/functions/google-drive-create-folder-structure/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-create-share-link', path: 'supabase/functions/google-drive-create-share-link/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-create-shared-doc', path: 'supabase/functions/google-drive-create-shared-doc/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-share-with-email', path: 'supabase/functions/google-drive-share-with-email/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-share-with-team', path: 'supabase/functions/google-drive-share-with-team/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-sync-media', path: 'supabase/functions/google-drive-sync-media/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-import-document', path: 'supabase/functions/google-drive-import-document/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-export-invoice-pdf', path: 'supabase/functions/google-drive-export-invoice-pdf/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-export-quote-pdf', path: 'supabase/functions/google-drive-export-quote-pdf/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-export-report', path: 'supabase/functions/google-drive-export-report/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-get-access-log', path: 'supabase/functions/google-drive-get-access-log/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-get-file-mappings', path: 'supabase/functions/google-drive-get-file-mappings/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-health-check', path: 'supabase/functions/google-drive-health-check/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-drive-revoke-access', path: 'supabase/functions/google-drive-revoke-access/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'google-maps-api-key', path: 'supabase/functions/google-maps-api-key/index.ts', requiresAuth: false, requiredSecrets: ['GOOGLE_MAPS_API_KEY'], hasCors: true, category: 'integrations' },

  // Integrations - QuickBooks
  { name: 'quickbooks-oauth', path: 'supabase/functions/quickbooks-oauth/index.ts', requiresAuth: true, requiredSecrets: ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET'], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-connection-status', path: 'supabase/functions/quickbooks-connection-status/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-bulk-sync', path: 'supabase/functions/quickbooks-bulk-sync/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-conflicts', path: 'supabase/functions/quickbooks-conflicts/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-entity-mappings', path: 'supabase/functions/quickbooks-entity-mappings/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-field-mappings', path: 'supabase/functions/quickbooks-field-mappings/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-health-check', path: 'supabase/functions/quickbooks-health-check/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-sync-customers', path: 'supabase/functions/quickbooks-sync-customers/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-sync-invoices', path: 'supabase/functions/quickbooks-sync-invoices/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-sync-payments', path: 'supabase/functions/quickbooks-sync-payments/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-sync-scheduler', path: 'supabase/functions/quickbooks-sync-scheduler/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-sync-schedules', path: 'supabase/functions/quickbooks-sync-schedules/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-sync-time', path: 'supabase/functions/quickbooks-sync-time/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'quickbooks-webhook', path: 'supabase/functions/quickbooks-webhook/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'integrations' },

  // Integrations - VoIP
  { name: 'voip-get-access-token', path: 'supabase/functions/voip-get-access-token/index.ts', requiresAuth: true, requiredSecrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'], hasCors: true, category: 'integrations' },
  { name: 'voip-initiate-call', path: 'supabase/functions/voip-initiate-call/index.ts', requiresAuth: true, requiredSecrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'], hasCors: true, category: 'integrations' },
  { name: 'voip-phone-numbers-list', path: 'supabase/functions/voip-phone-numbers-list/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'integrations' },
  { name: 'voip-purchase-number', path: 'supabase/functions/voip-purchase-number/index.ts', requiresAuth: true, requiredSecrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'], hasCors: true, category: 'integrations' },
  { name: 'voip-webhook-handler', path: 'supabase/functions/voip-webhook-handler/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'integrations' },

  // Admin & Internal
  { name: 'analytics-summary', path: 'supabase/functions/analytics-summary/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'audit-logs-crud', path: 'supabase/functions/audit-logs-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'business-constraints-crud', path: 'supabase/functions/business-constraints-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'business-members', path: 'supabase/functions/business-members/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'business-update', path: 'supabase/functions/business-update/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'changelog-crud', path: 'supabase/functions/changelog-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'time-breakdown-report', path: 'supabase/functions/time-breakdown-report/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'time-tracking-analytics', path: 'supabase/functions/time-tracking-analytics/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'timesheet-crud', path: 'supabase/functions/timesheet-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'roadmap-features-crud', path: 'supabase/functions/roadmap-features-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'roadmap-vote', path: 'supabase/functions/roadmap-vote/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },

  // Communication
  { name: 'conversations-crud', path: 'supabase/functions/conversations-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'conversation-activity', path: 'supabase/functions/conversation-activity/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'messages-crud', path: 'supabase/functions/messages-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'notes-crud', path: 'supabase/functions/notes-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'note-presence', path: 'supabase/functions/note-presence/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'resend-send-email', path: 'supabase/functions/resend-send-email/index.ts', requiresAuth: true, requiredSecrets: ['RESEND_API_KEY'], hasCors: true, category: 'admin' },
  { name: 'send-lifecycle-email', path: 'supabase/functions/send-lifecycle-email/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'process-email-queue', path: 'supabase/functions/process-email-queue/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'internal' },

  // Checklists & QA
  { name: 'checklists-crud', path: 'supabase/functions/checklists-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'checklist-templates-crud', path: 'supabase/functions/checklist-templates-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'checklist-activity', path: 'supabase/functions/checklist-activity/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'checklist-item-complete', path: 'supabase/functions/checklist-item-complete/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'my-checklist-tasks', path: 'supabase/functions/my-checklist-tasks/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'my-completed-tasks', path: 'supabase/functions/my-completed-tasks/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'artifacts-list', path: 'supabase/functions/artifacts-list/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'requests-crud', path: 'supabase/functions/requests-crud/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },

  // Public
  { name: 'public-request-submit', path: 'supabase/functions/public-request-submit/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'public' },
  { name: 'public-upload-request-photo', path: 'supabase/functions/public-upload-request-photo/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'public' },
  { name: 'serve-business-page', path: 'supabase/functions/serve-business-page/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'public' },

  // Referrals
  { name: 'create-referral-code', path: 'supabase/functions/create-referral-code/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'complete-referral', path: 'supabase/functions/complete-referral/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'get-referral-stats', path: 'supabase/functions/get-referral-stats/index.ts', requiresAuth: true, requiredSecrets: [], hasCors: true, category: 'admin' },
  { name: 'track-referral', path: 'supabase/functions/track-referral/index.ts', requiresAuth: false, requiredSecrets: [], hasCors: true, category: 'public' },

  // Geo
  { name: 'batch-geocode', path: 'supabase/functions/batch-geocode/index.ts', requiresAuth: true, requiredSecrets: ['GOOGLE_MAPS_API_KEY'], hasCors: true, category: 'scheduling' },
  { name: 'geo-reverse', path: 'supabase/functions/geo-reverse/index.ts', requiresAuth: true, requiredSecrets: ['GOOGLE_MAPS_API_KEY'], hasCors: true, category: 'scheduling' },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getEdgeFunctionByName(name: string): EdgeFunctionDefinition | undefined {
  return EDGE_FUNCTION_REGISTRY.find(fn => fn.name === name);
}

export function getEdgeFunctionsByCategory(category: EdgeFunctionCategory): EdgeFunctionDefinition[] {
  return EDGE_FUNCTION_REGISTRY.filter(fn => fn.category === category);
}

export function getAllRequiredSecrets(): string[] {
  const secrets = new Set<string>();
  for (const fn of EDGE_FUNCTION_REGISTRY) {
    for (const secret of fn.requiredSecrets) {
      secrets.add(secret);
    }
  }
  return Array.from(secrets).sort();
}

export function getEdgeFunctionCount(): number {
  return EDGE_FUNCTION_REGISTRY.length;
}

export function getEdgeFunctionCountByCategory(): Record<EdgeFunctionCategory, number> {
  const counts = {} as Record<EdgeFunctionCategory, number>;
  for (const fn of EDGE_FUNCTION_REGISTRY) {
    counts[fn.category] = (counts[fn.category] || 0) + 1;
  }
  return counts;
}
