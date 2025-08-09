-- Deduplicate email_senders so we can enforce one row per user
WITH ranked AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.email_senders
)
DELETE FROM public.email_senders e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

-- Enforce one sender per user
ALTER TABLE public.email_senders
ADD CONSTRAINT email_senders_user_id_unique UNIQUE (user_id);