-- Backup current migration history
CREATE TABLE IF NOT EXISTS migration_history_backup AS 
SELECT * FROM supabase_migrations.schema_migrations;

-- Delete all old migration records except the consolidated one
DELETE FROM supabase_migrations.schema_migrations 
WHERE version != '20250815022947';

-- Verify only our consolidated migration remains
SELECT COUNT(*) as remaining_migrations FROM supabase_migrations.schema_migrations;