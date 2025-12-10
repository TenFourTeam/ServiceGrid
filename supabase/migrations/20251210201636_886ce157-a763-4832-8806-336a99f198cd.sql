-- Add customer_last_read_at column to track when customer last viewed the conversation
ALTER TABLE public.sg_conversations
ADD COLUMN customer_last_read_at TIMESTAMP WITH TIME ZONE;