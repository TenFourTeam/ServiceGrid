-- Drop the migration_history_backup table to fix RLS security vulnerability
-- This table is not part of the application logic and is safe to remove
DROP TABLE IF EXISTS public.migration_history_backup;