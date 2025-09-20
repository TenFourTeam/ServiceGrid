-- Add quote_id column to invoices table to support quote-to-invoice conversion
ALTER TABLE public.invoices 
ADD COLUMN quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Add index for better performance on quote_id lookups
CREATE INDEX idx_invoices_quote_id ON public.invoices(quote_id);