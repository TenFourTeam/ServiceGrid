-- Add sender_type column to sg_messages for customer messaging
ALTER TABLE public.sg_messages 
ADD COLUMN sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'customer'));