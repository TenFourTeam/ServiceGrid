-- Clear existing migration history to start fresh
DELETE FROM supabase_migrations.schema_migrations;

-- Insert the baseline migration record
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '00000000000000',
  ARRAY['-- Baseline migration applied'],
  'baseline'
);