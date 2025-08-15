-- Restore our consolidated migration record
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
VALUES (
  '20250815022947', 
  'Consolidated baseline migration',
  ARRAY['CREATE SCHEMA IF NOT EXISTS public'],
  'system'
);

-- Verify it's restored
SELECT version, name FROM supabase_migrations.schema_migrations;