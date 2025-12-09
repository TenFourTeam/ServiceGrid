-- Drop the foreign key constraint that prevents customer messages
-- The sender_type column already distinguishes between 'user' (profiles) and 'customer' (customers)
ALTER TABLE public.sg_messages
DROP CONSTRAINT IF EXISTS sg_messages_sender_id_fkey;