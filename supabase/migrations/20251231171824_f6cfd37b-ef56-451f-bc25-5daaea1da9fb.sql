-- Fix Function Search Path Security Issues
-- This migration sets search_path on all app-specific functions that are missing it

-- Core timestamp update function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Lead Generation trigger functions
ALTER FUNCTION public.trigger_auto_assign_request() SET search_path = public;
ALTER FUNCTION public.trigger_calculate_lead_score() SET search_path = public;
ALTER FUNCTION public.trigger_queue_welcome_email() SET search_path = public;

-- Changelog and settings update functions
ALTER FUNCTION public.update_changelog_entry_updated_at() SET search_path = public;
ALTER FUNCTION public.update_roadmap_updated_at() SET search_path = public;

-- Integration update functions
ALTER FUNCTION public.update_google_drive_updated_at() SET search_path = public;
ALTER FUNCTION public.update_quickbooks_sync_schedules_updated_at() SET search_path = public;

-- Media and pages update functions  
ALTER FUNCTION public.update_sg_pages_updated_at() SET search_path = public;
ALTER FUNCTION public.update_tag_usage_count() SET search_path = public;