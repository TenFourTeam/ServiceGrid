-- Add customer_id to sg_conversations for customer portal messaging
ALTER TABLE public.sg_conversations 
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;

-- Create index for fast customer lookups
CREATE INDEX idx_sg_conversations_customer_id ON public.sg_conversations(customer_id);

-- Enable realtime for sg_messages if not already enabled
ALTER TABLE public.sg_messages REPLICA IDENTITY FULL;

-- Add sg_messages to realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'sg_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sg_messages;
  END IF;
END $$;