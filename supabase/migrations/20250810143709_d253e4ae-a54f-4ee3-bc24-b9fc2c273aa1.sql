-- Enable realtime for jobs and add useful indexes for range queries
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs';
  END IF;
END$$;

-- Indexes to optimize calendar range queries and filters
CREATE INDEX IF NOT EXISTS idx_jobs_starts_at ON public.jobs (starts_at);
CREATE INDEX IF NOT EXISTS idx_jobs_ends_at ON public.jobs (ends_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_owner_id_starts_at ON public.jobs (owner_id, starts_at);
