-- Enable realtime for invoices and invoice_line_items with full row data
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.invoice_line_items REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'invoices'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'invoice_line_items'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_line_items';
  END IF;
END$$;