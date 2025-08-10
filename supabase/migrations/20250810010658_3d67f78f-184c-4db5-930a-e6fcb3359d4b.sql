-- Add updated_at triggers for quotes and quote_line_items to ensure timestamps are correct on updates
-- Use DROP IF EXISTS to make the migration idempotent

-- quotes.updated_at trigger
DROP TRIGGER IF EXISTS set_quotes_updated_at ON public.quotes;
CREATE TRIGGER set_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- quote_line_items.updated_at trigger
DROP TRIGGER IF EXISTS set_quote_line_items_updated_at ON public.quote_line_items;
CREATE TRIGGER set_quote_line_items_updated_at
BEFORE UPDATE ON public.quote_line_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();