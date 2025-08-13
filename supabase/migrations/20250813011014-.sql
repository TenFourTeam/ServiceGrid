-- Harden RLS for public.quote_events to prevent public data exposure
-- 1) Ensure RLS is enabled (idempotent)
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;

-- 2) Remove overly-permissive public read access
DROP POLICY IF EXISTS "Public can read quote_events" ON public.quote_events;

-- 3) Allow only authenticated owners to read quote events for their own quotes
CREATE POLICY "Owner can read their quote events"
ON public.quote_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.quotes q
    WHERE q.id::text = quote_events.quote_id
      AND q.owner_id = auth.uid()
  )
);
