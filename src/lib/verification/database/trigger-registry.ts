/**
 * Database Trigger Registry
 * 
 * Registry of all expected database triggers and RLS configurations.
 */

import { DatabaseTriggerDefinition, RLSPolicyDefinition } from '../types';

// ============================================================================
// Database Triggers
// ============================================================================

export const DATABASE_TRIGGER_REGISTRY: DatabaseTriggerDefinition[] = [
  // Timestamp triggers
  {
    name: 'update_businesses_updated_at',
    table: 'businesses',
    timing: 'BEFORE',
    events: ['UPDATE'],
    functionName: 'update_updated_at_column',
    description: 'Automatically update updated_at timestamp'
  },
  {
    name: 'update_customers_updated_at',
    table: 'customers',
    timing: 'BEFORE',
    events: ['UPDATE'],
    functionName: 'update_updated_at_column',
    description: 'Automatically update updated_at timestamp'
  },
  {
    name: 'update_jobs_updated_at',
    table: 'jobs',
    timing: 'BEFORE',
    events: ['UPDATE'],
    functionName: 'update_updated_at_column',
    description: 'Automatically update updated_at timestamp'
  },
  {
    name: 'update_invoices_updated_at',
    table: 'invoices',
    timing: 'BEFORE',
    events: ['UPDATE'],
    functionName: 'update_updated_at_column',
    description: 'Automatically update updated_at timestamp'
  },
  {
    name: 'update_quotes_updated_at',
    table: 'quotes',
    timing: 'BEFORE',
    events: ['UPDATE'],
    functionName: 'update_updated_at_column',
    description: 'Automatically update updated_at timestamp'
  },
  {
    name: 'update_profiles_updated_at',
    table: 'profiles',
    timing: 'BEFORE',
    events: ['UPDATE'],
    functionName: 'update_updated_at_column',
    description: 'Automatically update updated_at timestamp'
  },

  // Business logic triggers
  {
    name: 'on_job_status_change',
    table: 'jobs',
    timing: 'AFTER',
    events: ['UPDATE'],
    functionName: 'handle_job_status_change',
    description: 'Handle job status transitions and notifications'
  },
  {
    name: 'on_invoice_paid',
    table: 'invoices',
    timing: 'AFTER',
    events: ['UPDATE'],
    functionName: 'handle_invoice_payment',
    description: 'Handle invoice payment processing'
  },
  {
    name: 'on_quote_accepted',
    table: 'quotes',
    timing: 'AFTER',
    events: ['UPDATE'],
    functionName: 'handle_quote_acceptance',
    description: 'Handle quote acceptance and job creation'
  },

  // Audit triggers
  {
    name: 'audit_business_changes',
    table: 'businesses',
    timing: 'AFTER',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    functionName: 'log_audit_event',
    description: 'Log changes to businesses table'
  },
  {
    name: 'audit_customer_changes',
    table: 'customers',
    timing: 'AFTER',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    functionName: 'log_audit_event',
    description: 'Log changes to customers table'
  },

  // Sequence triggers
  {
    name: 'set_invoice_number',
    table: 'invoices',
    timing: 'BEFORE',
    events: ['INSERT'],
    functionName: 'generate_invoice_number',
    description: 'Auto-generate invoice numbers'
  },
  {
    name: 'set_quote_number',
    table: 'quotes',
    timing: 'BEFORE',
    events: ['INSERT'],
    functionName: 'generate_quote_number',
    description: 'Auto-generate quote numbers'
  },
];

// ============================================================================
// RLS Table Registry
// ============================================================================

interface RLSTableEntry {
  table: string;
  rlsEnabled: boolean;
  policies?: string[];
  description?: string;
}

export const RLS_TABLE_REGISTRY: RLSTableEntry[] = [
  // Core tables
  { table: 'businesses', rlsEnabled: true, policies: ['owner_access', 'member_access'], description: 'Business entity' },
  { table: 'customers', rlsEnabled: true, policies: ['business_access'], description: 'Customer records' },
  { table: 'jobs', rlsEnabled: true, policies: ['business_access', 'assigned_access'], description: 'Job records' },
  { table: 'invoices', rlsEnabled: true, policies: ['business_access', 'customer_access'], description: 'Invoice records' },
  { table: 'quotes', rlsEnabled: true, policies: ['business_access', 'customer_access'], description: 'Quote records' },
  { table: 'profiles', rlsEnabled: true, policies: ['own_profile', 'team_view'], description: 'User profiles' },

  // Supporting tables
  { table: 'invoice_line_items', rlsEnabled: true, policies: ['via_invoice'], description: 'Invoice line items' },
  { table: 'quote_line_items', rlsEnabled: true, policies: ['via_quote'], description: 'Quote line items' },
  { table: 'job_assignments', rlsEnabled: true, policies: ['business_access'], description: 'Job assignments' },
  { table: 'team_members', rlsEnabled: true, policies: ['business_access'], description: 'Team members' },

  // Communication
  { table: 'conversations', rlsEnabled: true, policies: ['business_access'], description: 'Conversation threads' },
  { table: 'messages', rlsEnabled: true, policies: ['via_conversation'], description: 'Messages' },
  { table: 'notes', rlsEnabled: true, policies: ['business_access'], description: 'Notes' },

  // Scheduling
  { table: 'recurring_schedules', rlsEnabled: true, policies: ['business_access'], description: 'Recurring schedules' },
  { table: 'time_off', rlsEnabled: true, policies: ['business_access', 'own_time_off'], description: 'Time off requests' },
  { table: 'timesheets', rlsEnabled: true, policies: ['business_access', 'own_timesheet'], description: 'Timesheets' },

  // Media
  { table: 'sg_media', rlsEnabled: true, policies: ['business_access'], description: 'Media files' },
  { table: 'sg_media_tags', rlsEnabled: true, policies: ['business_access'], description: 'Media tags' },

  // AI
  { table: 'ai_chat_conversations', rlsEnabled: true, policies: ['own_conversations'], description: 'AI chat conversations' },
  { table: 'ai_chat_messages', rlsEnabled: true, policies: ['via_conversation'], description: 'AI chat messages' },
  { table: 'ai_activity_log', rlsEnabled: true, policies: ['business_access'], description: 'AI activity log' },

  // Checklists
  { table: 'sg_checklists', rlsEnabled: true, policies: ['business_access'], description: 'Checklists' },
  { table: 'sg_checklist_items', rlsEnabled: true, policies: ['via_checklist'], description: 'Checklist items' },
  { table: 'sg_checklist_templates', rlsEnabled: true, policies: ['business_access'], description: 'Checklist templates' },

  // Integrations
  { table: 'google_drive_connections', rlsEnabled: true, policies: ['business_access'], description: 'Google Drive connections' },
  { table: 'quickbooks_connections', rlsEnabled: true, policies: ['business_access'], description: 'QuickBooks connections' },
  { table: 'phone_numbers', rlsEnabled: true, policies: ['business_access'], description: 'VoIP phone numbers' },

  // Settings
  { table: 'automation_settings', rlsEnabled: true, policies: ['business_access'], description: 'Automation settings' },
  { table: 'business_constraints', rlsEnabled: true, policies: ['business_access'], description: 'Business constraints' },
  { table: 'pricing_rules', rlsEnabled: true, policies: ['business_access'], description: 'Pricing rules' },

  // Admin
  { table: 'audit_logs', rlsEnabled: true, policies: ['business_access'], description: 'Audit logs' },
  { table: 'invites', rlsEnabled: true, policies: ['business_access', 'invited_user'], description: 'Team invites' },
  { table: 'referrals', rlsEnabled: true, policies: ['own_referrals'], description: 'Referrals' },

  // Public/system tables (may not need RLS or have special policies)
  { table: 'changelog_entries', rlsEnabled: true, policies: ['public_read'], description: 'Changelog entries' },
  { table: 'roadmap_features', rlsEnabled: true, policies: ['public_read', 'admin_write'], description: 'Roadmap features' },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getTriggersByTable(table: string): DatabaseTriggerDefinition[] {
  return DATABASE_TRIGGER_REGISTRY.filter(t => t.table === table);
}

export function getRLSStatusForTable(table: string): RLSTableEntry | undefined {
  return RLS_TABLE_REGISTRY.find(t => t.table === table);
}

export function getTablesWithoutRLS(): string[] {
  return RLS_TABLE_REGISTRY.filter(t => !t.rlsEnabled).map(t => t.table);
}

export function getAllTrackedTables(): string[] {
  return RLS_TABLE_REGISTRY.map(t => t.table);
}
