-- Enable realtime on public.quote_events safely
-- 1) Set REPLICA IDENTITY FULL if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'quote_events'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.quote_events REPLICA IDENTITY FULL';
  END IF;
END $$;

-- 2) Add the table to the supabase_realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'quote_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_events';
  END IF;
END $$;