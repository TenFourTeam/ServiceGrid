-- Add signature storage column to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS signature_data_url text;

-- Add 'Edits Requested' to quote_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Edits Requested' AND enumtypid = 'quote_status'::regtype) THEN
    ALTER TYPE quote_status ADD VALUE 'Edits Requested';
  END IF;
END$$;