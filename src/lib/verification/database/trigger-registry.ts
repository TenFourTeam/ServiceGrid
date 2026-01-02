/**
 * Database Trigger Registry
 * 
 * Complete registry of all database triggers and RLS configurations.
 * Auto-updated from database introspection.
 */

import { DatabaseTriggerDefinition, RLSPolicyDefinition } from '../types';

// ============================================================================
// Database Triggers - Complete List from Database
// ============================================================================

export const DATABASE_TRIGGER_REGISTRY: DatabaseTriggerDefinition[] = [
  // AI Chat
  { name: 'update_ai_conversations_updated_at', table: 'ai_chat_conversations', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp on conversations' },
  { name: 'trg_update_conversation_message_count', table: 'ai_chat_messages', timing: 'AFTER', events: ['INSERT'], functionName: 'update_conversation_message_count', description: 'Increment message count on new message' },

  // Appointment Change Requests
  { name: 'update_appointment_change_requests_updated_at', table: 'appointment_change_requests', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_updated_at_column', description: 'Update timestamp' },

  // Business Constraints
  { name: 'set_business_constraints_updated_at', table: 'business_constraints', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Business Permissions
  { name: 'update_business_permissions_updated_at', table: 'business_permissions', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Businesses
  { name: 'business_audit_trigger', table: 'businesses', timing: 'AFTER', events: ['INSERT'], functionName: 'trigger_business_audit', description: 'Audit business creation' },
  { name: 'on_business_created_automation_settings', table: 'businesses', timing: 'AFTER', events: ['INSERT'], functionName: 'create_default_automation_settings', description: 'Create default automation settings' },
  { name: 'set_business_slug_trigger', table: 'businesses', timing: 'BEFORE', events: ['INSERT'], functionName: 'set_business_slug', description: 'Generate business slug' },
  { name: 'set_updated_at_businesses', table: 'businesses', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },
  { name: 'trg_business_name_norm', table: 'businesses', timing: 'BEFORE', events: ['INSERT'], functionName: 'normalize_business_name', description: 'Normalize business name' },

  // Call Logs
  { name: 'update_call_logs_updated_at', table: 'call_logs', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_updated_at_column', description: 'Update timestamp' },

  // Changelog
  { name: 'trg_update_changelog_entry_updated_at', table: 'changelog_entries', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_changelog_entry_updated_at', description: 'Update timestamp' },

  // Customer Accounts
  { name: 'update_customer_accounts_updated_at', table: 'customer_accounts', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_updated_at_column', description: 'Update timestamp' },

  // Customers (Lead Generation)
  { name: 'auto_queue_welcome_email', table: 'customers', timing: 'AFTER', events: ['INSERT'], functionName: 'queue_welcome_email', description: 'Queue welcome email for new customer' },
  { name: 'auto_score_lead', table: 'customers', timing: 'BEFORE', events: ['INSERT'], functionName: 'calculate_lead_score', description: 'Auto-calculate lead score' },
  { name: 'set_updated_at_customers', table: 'customers', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },
  { name: 'trg_calculate_lead_score', table: 'customers', timing: 'BEFORE', events: ['INSERT'], functionName: 'trigger_calculate_lead_score', description: 'Calculate lead score via trigger' },
  { name: 'trg_queue_welcome_email', table: 'customers', timing: 'AFTER', events: ['INSERT'], functionName: 'trigger_queue_welcome_email', description: 'Queue welcome email via trigger' },

  // Google Drive
  { name: 'update_drive_connections_updated_at', table: 'google_drive_connections', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_google_drive_updated_at', description: 'Update timestamp' },
  { name: 'update_drive_file_mappings_updated_at', table: 'google_drive_file_mappings', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_google_drive_updated_at', description: 'Update timestamp' },

  // Inventory
  { name: 'set_inventory_items_updated_at', table: 'inventory_items', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Invites
  { name: 'update_invites_updated_at', table: 'invites', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Invoice Line Items
  { name: 'set_updated_at_invoice_line_items', table: 'invoice_line_items', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Invoices
  { name: 'set_updated_at_invoices', table: 'invoices', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Job Assignments
  { name: 'update_job_assignments_updated_at', table: 'job_assignments', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Jobs (Site Assessment)
  { name: 'set_updated_at_jobs', table: 'jobs', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },
  { name: 'trg_assessment_completed', table: 'jobs', timing: 'AFTER', events: ['UPDATE'], functionName: 'handle_assessment_completed', description: 'Handle assessment job completion' },
  { name: 'trg_assessment_job_created', table: 'jobs', timing: 'AFTER', events: ['INSERT'], functionName: 'handle_assessment_job_created', description: 'Handle assessment job creation' },
  { name: 'trg_sync_job_location', table: 'jobs', timing: 'AFTER', events: ['INSERT', 'UPDATE'], functionName: 'sync_job_location', description: 'Sync job location data' },
  { name: 'trigger_update_request_on_assessment_completion', table: 'jobs', timing: 'AFTER', events: ['UPDATE'], functionName: 'update_request_on_assessment_completion', description: 'Update request when assessment completes' },

  // Mail Sends
  { name: 'set_mail_sends_updated_at', table: 'mail_sends', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Messages
  { name: 'set_updated_at_messages', table: 'messages', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },
  { name: 'trg_update_messages_updated_at', table: 'messages', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Notes
  { name: 'set_updated_at_notes', table: 'notes', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Phone Numbers
  { name: 'set_phone_numbers_updated_at', table: 'phone_numbers', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Pricing Rules
  { name: 'set_pricing_rules_updated_at', table: 'pricing_rules', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Profiles
  { name: 'set_updated_at_profiles', table: 'profiles', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // QuickBooks
  { name: 'set_quickbooks_items_updated_at', table: 'quickbooks_items', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },
  { name: 'update_qb_sync_schedules_updated_at', table: 'quickbooks_sync_schedules', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_quickbooks_sync_schedules_updated_at', description: 'Update timestamp' },

  // Quote Line Items
  { name: 'set_updated_at_quote_line_items', table: 'quote_line_items', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Quotes
  { name: 'set_updated_at_quotes', table: 'quotes', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Recurring Schedules
  { name: 'set_updated_at_recurring_schedules', table: 'recurring_schedules', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Referrals
  { name: 'set_referrals_updated_at', table: 'referrals', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Requests (Lead Generation)
  { name: 'auto_assign_request_trigger', table: 'requests', timing: 'AFTER', events: ['INSERT'], functionName: 'trigger_auto_assign_request', description: 'Auto-assign request to team member' },
  { name: 'set_updated_at_requests', table: 'requests', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Roadmap Features
  { name: 'trg_update_roadmap_updated_at', table: 'roadmap_features', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_roadmap_updated_at', description: 'Update timestamp' },

  // Service Catalog
  { name: 'set_service_catalog_items_updated_at', table: 'service_catalog_items', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // SG Checklist Events
  { name: 'set_updated_at_sg_checklist_events', table: 'sg_checklist_events', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // SG Checklist Items
  { name: 'set_updated_at_sg_checklist_items', table: 'sg_checklist_items', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // SG Checklist Template Items
  { name: 'set_updated_at_sg_checklist_template_items', table: 'sg_checklist_template_items', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // SG Checklist Templates
  { name: 'set_updated_at_sg_checklist_templates', table: 'sg_checklist_templates', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // SG Checklists
  { name: 'set_updated_at_sg_checklists', table: 'sg_checklists', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // SG Media (Site Assessment)
  { name: 'trg_assessment_photo_uploaded', table: 'sg_media', timing: 'AFTER', events: ['INSERT'], functionName: 'handle_assessment_photo_uploaded', description: 'Handle assessment photo upload' },
  { name: 'set_updated_at_sg_media', table: 'sg_media', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // SG Media Tags
  { name: 'trg_update_tag_usage_count', table: 'sg_media_tags', timing: 'AFTER', events: ['INSERT', 'DELETE'], functionName: 'update_tag_usage_count', description: 'Update tag usage count' },

  // SG Pages
  { name: 'trg_update_sg_pages_updated_at', table: 'sg_pages', timing: 'BEFORE', events: ['UPDATE'], functionName: 'update_sg_pages_updated_at', description: 'Update timestamp' },

  // Subscriptions
  { name: 'set_subscriptions_updated_at', table: 'subscriptions', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Team Members
  { name: 'set_updated_at_team_members', table: 'team_members', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Time Off
  { name: 'set_updated_at_time_off', table: 'time_off', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },

  // Timesheet Entries
  { name: 'set_updated_at_timesheet_entries', table: 'timesheet_entries', timing: 'BEFORE', events: ['UPDATE'], functionName: 'set_updated_at', description: 'Update timestamp' },
];

// ============================================================================
// RLS Table Registry - Complete List
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
  { table: 'requests', rlsEnabled: true, policies: ['business_access'], description: 'Service requests' },

  // Supporting tables
  { table: 'invoice_line_items', rlsEnabled: true, policies: ['via_invoice'], description: 'Invoice line items' },
  { table: 'quote_line_items', rlsEnabled: true, policies: ['via_quote'], description: 'Quote line items' },
  { table: 'job_assignments', rlsEnabled: true, policies: ['business_access'], description: 'Job assignments' },
  { table: 'team_members', rlsEnabled: true, policies: ['business_access'], description: 'Team members' },

  // Communication
  { table: 'conversations', rlsEnabled: true, policies: ['business_access'], description: 'Conversation threads' },
  { table: 'messages', rlsEnabled: true, policies: ['via_conversation'], description: 'Messages' },
  { table: 'notes', rlsEnabled: true, policies: ['business_access'], description: 'Notes' },
  { table: 'mail_sends', rlsEnabled: true, policies: ['business_access'], description: 'Email sends' },

  // Scheduling
  { table: 'recurring_schedules', rlsEnabled: true, policies: ['business_access'], description: 'Recurring schedules' },
  { table: 'time_off', rlsEnabled: true, policies: ['business_access', 'own_time_off'], description: 'Time off requests' },
  { table: 'timesheet_entries', rlsEnabled: true, policies: ['business_access', 'own_timesheet'], description: 'Timesheet entries' },

  // Media
  { table: 'sg_media', rlsEnabled: true, policies: ['business_access'], description: 'Media files' },
  { table: 'sg_media_tags', rlsEnabled: true, policies: ['business_access'], description: 'Media tags' },

  // AI
  { table: 'ai_chat_conversations', rlsEnabled: true, policies: ['own_conversations'], description: 'AI chat conversations' },
  { table: 'ai_chat_messages', rlsEnabled: true, policies: ['via_conversation'], description: 'AI chat messages' },
  { table: 'ai_activity_log', rlsEnabled: true, policies: ['business_access'], description: 'AI activity log' },
  { table: 'ai_memory_entity_refs', rlsEnabled: true, policies: ['business_access'], description: 'AI memory entity refs' },
  { table: 'ai_memory_preferences', rlsEnabled: true, policies: ['business_access'], description: 'AI memory preferences' },
  { table: 'ai_pending_plans', rlsEnabled: true, policies: ['business_access'], description: 'AI pending plans' },

  // Checklists
  { table: 'sg_checklists', rlsEnabled: true, policies: ['business_access'], description: 'Checklists' },
  { table: 'sg_checklist_items', rlsEnabled: true, policies: ['via_checklist'], description: 'Checklist items' },
  { table: 'sg_checklist_templates', rlsEnabled: true, policies: ['business_access'], description: 'Checklist templates' },
  { table: 'sg_checklist_template_items', rlsEnabled: true, policies: ['via_template'], description: 'Checklist template items' },
  { table: 'sg_checklist_events', rlsEnabled: true, policies: ['via_checklist'], description: 'Checklist events' },

  // Integrations
  { table: 'google_drive_connections', rlsEnabled: true, policies: ['business_access'], description: 'Google Drive connections' },
  { table: 'google_drive_file_mappings', rlsEnabled: true, policies: ['business_access'], description: 'Google Drive file mappings' },
  { table: 'google_drive_sync_log', rlsEnabled: true, policies: ['business_access'], description: 'Google Drive sync log' },
  { table: 'quickbooks_connections', rlsEnabled: true, policies: ['business_access'], description: 'QuickBooks connections' },
  { table: 'quickbooks_items', rlsEnabled: true, policies: ['business_access'], description: 'QuickBooks items' },
  { table: 'quickbooks_sync_schedules', rlsEnabled: true, policies: ['business_access'], description: 'QuickBooks sync schedules' },
  { table: 'phone_numbers', rlsEnabled: true, policies: ['business_access'], description: 'VoIP phone numbers' },
  { table: 'call_logs', rlsEnabled: true, policies: ['business_access'], description: 'Call logs' },

  // Settings
  { table: 'automation_settings', rlsEnabled: true, policies: ['business_access'], description: 'Automation settings' },
  { table: 'business_constraints', rlsEnabled: true, policies: ['business_access'], description: 'Business constraints' },
  { table: 'pricing_rules', rlsEnabled: true, policies: ['business_access'], description: 'Pricing rules' },
  { table: 'business_permissions', rlsEnabled: true, policies: ['business_access'], description: 'Business permissions' },

  // Admin
  { table: 'audit_logs', rlsEnabled: true, policies: ['business_access'], description: 'Audit logs' },
  { table: 'invites', rlsEnabled: true, policies: ['business_access', 'invited_user'], description: 'Team invites' },
  { table: 'referrals', rlsEnabled: true, policies: ['own_referrals'], description: 'Referrals' },
  { table: 'subscriptions', rlsEnabled: true, policies: ['own_subscription'], description: 'Subscriptions' },
  { table: 'email_queue', rlsEnabled: true, policies: ['business_access'], description: 'Email queue' },

  // Customer Portal
  { table: 'customer_accounts', rlsEnabled: true, policies: ['own_account', 'business_access'], description: 'Customer accounts' },
  { table: 'customer_sessions', rlsEnabled: true, policies: ['own_session'], description: 'Customer sessions' },
  { table: 'customer_portal_invites', rlsEnabled: true, policies: ['business_access'], description: 'Customer portal invites' },
  { table: 'customer_account_links', rlsEnabled: true, policies: ['business_access'], description: 'Customer account links' },
  { table: 'appointment_change_requests', rlsEnabled: true, policies: ['business_access', 'customer_access'], description: 'Appointment change requests' },

  // Inventory
  { table: 'inventory_items', rlsEnabled: true, policies: ['business_access'], description: 'Inventory items' },
  { table: 'inventory_transactions', rlsEnabled: true, policies: ['business_access'], description: 'Inventory transactions' },

  // Service Catalog
  { table: 'service_catalog_items', rlsEnabled: true, policies: ['business_access'], description: 'Service catalog items' },

  // Pages/Content
  { table: 'sg_pages', rlsEnabled: true, policies: ['business_access'], description: 'Pages' },
  { table: 'sg_ai_artifacts', rlsEnabled: true, policies: ['business_access'], description: 'AI artifacts' },

  // Public/system tables (may not need RLS or have special policies)
  { table: 'changelog_entries', rlsEnabled: true, policies: ['public_read'], description: 'Changelog entries' },
  { table: 'changelog_sections', rlsEnabled: true, policies: ['public_read'], description: 'Changelog sections' },
  { table: 'changelog_items', rlsEnabled: true, policies: ['public_read'], description: 'Changelog items' },
  { table: 'roadmap_features', rlsEnabled: true, policies: ['public_read', 'admin_write'], description: 'Roadmap features' },

  // PostGIS system table (cannot modify, acceptable)
  { table: 'spatial_ref_sys', rlsEnabled: false, policies: [], description: 'PostGIS spatial reference system (system table)' },
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

export function getTriggerCount(): number {
  return DATABASE_TRIGGER_REGISTRY.length;
}

export function getTableCount(): number {
  return RLS_TABLE_REGISTRY.length;
}
