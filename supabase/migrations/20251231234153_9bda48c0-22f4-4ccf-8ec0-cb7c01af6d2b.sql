-- Clean database for fresh auth testing
-- Delete all legacy data in dependency order (only base tables, no views)

-- Step 1: Delete child records first
DELETE FROM public.invoice_line_items;
DELETE FROM public.quote_line_items;
DELETE FROM public.quote_events;
DELETE FROM public.job_assignments;
DELETE FROM public.timesheet_entries;
DELETE FROM public.payments;

-- Step 2: Delete SG-specific tables
DELETE FROM public.sg_checklist_items;
DELETE FROM public.sg_checklist_events;
DELETE FROM public.sg_checklist_template_items;
DELETE FROM public.sg_checklists;
DELETE FROM public.sg_checklist_templates;
DELETE FROM public.sg_messages;
DELETE FROM public.sg_conversation_reads;
DELETE FROM public.sg_conversation_events;
DELETE FROM public.sg_conversations;
DELETE FROM public.sg_note_versions;
DELETE FROM public.sg_note_collaborators;
DELETE FROM public.sg_notes;
DELETE FROM public.sg_documents;
DELETE FROM public.sg_media_tags;
DELETE FROM public.sg_media;
DELETE FROM public.sg_esign_envelopes;
DELETE FROM public.sg_timeline_shares;
DELETE FROM public.sg_ai_generations;
DELETE FROM public.sg_ai_artifacts;

-- Step 3: Delete jobs and invoices
DELETE FROM public.jobs;
DELETE FROM public.invoices;
DELETE FROM public.quotes;
DELETE FROM public.requests;
DELETE FROM public.recurring_job_templates;
DELETE FROM public.recurring_schedules;

-- Step 4: Delete customer-related data
DELETE FROM public.customer_account_links;
DELETE FROM public.customer_sessions;
DELETE FROM public.customer_portal_invites;
DELETE FROM public.customer_accounts;
DELETE FROM public.customers;

-- Step 5: Delete business-related data
DELETE FROM public.business_sessions;
DELETE FROM public.business_permissions;
DELETE FROM public.business_constraints;
DELETE FROM public.automation_settings;
DELETE FROM public.invites;
DELETE FROM public.ai_chat_messages;
DELETE FROM public.ai_chat_conversations;
DELETE FROM public.ai_activity_log;
DELETE FROM public.ai_pending_plans;
DELETE FROM public.ai_memory_preferences;
DELETE FROM public.ai_memory_entity_refs;
DELETE FROM public.audit_logs;
DELETE FROM public.inventory_transactions;
DELETE FROM public.inventory_items;
DELETE FROM public.call_logs;
DELETE FROM public.email_queue;
DELETE FROM public.google_drive_file_mappings;
DELETE FROM public.google_drive_sync_log;
DELETE FROM public.google_drive_connections;
DELETE FROM public.appointment_change_requests;
DELETE FROM public.pricing_rules;
DELETE FROM public.mail_sends;
DELETE FROM public.lifecycle_emails_sent;
DELETE FROM public.phone_numbers;
DELETE FROM public.service_catalog;
DELETE FROM public.quickbooks_conflict_resolutions;
DELETE FROM public.quickbooks_entity_mappings;
DELETE FROM public.quickbooks_field_mappings;
DELETE FROM public.quickbooks_sync_log;
DELETE FROM public.quickbooks_sync_schedules;
DELETE FROM public.quickbooks_webhook_events;
DELETE FROM public.quickbooks_connections;
DELETE FROM public.referrals;
DELETE FROM public.team_availability;
DELETE FROM public.time_off_requests;
DELETE FROM public.travel_time_cache;
DELETE FROM public.voip_devices;
DELETE FROM public.roadmap_votes;
DELETE FROM public.roadmap_features;
DELETE FROM public.subscribers;

-- Step 6: Delete businesses
DELETE FROM public.businesses;

-- Step 7: Finally delete profiles
DELETE FROM public.profiles;