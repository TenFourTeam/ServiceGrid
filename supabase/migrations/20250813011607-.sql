-- Tighten INSERT policy for subscribers to prevent arbitrary inserts
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

CREATE POLICY "insert_own_subscription"
ON public.subscribers
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR (auth.email() = email)
);
