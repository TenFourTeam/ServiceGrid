-- Remove the unused get_dashboard_counts function
-- This function was part of the old dashboard data aggregation layer
-- that has been replaced with individual count hooks for better performance
-- and data consistency

DROP FUNCTION IF EXISTS public.get_dashboard_counts(owner_id uuid);