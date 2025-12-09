-- Create sg_conversation_reads table for tracking unread messages
CREATE TABLE IF NOT EXISTS public.sg_conversation_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.sg_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.sg_conversation_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for sg_conversation_reads
CREATE POLICY "Users can read their own read status"
ON public.sg_conversation_reads
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own read status"
ON public.sg_conversation_reads
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
ON public.sg_conversation_reads
FOR UPDATE
USING (user_id = auth.uid());

-- Update get_conversations_with_preview to calculate actual unread count
DROP FUNCTION IF EXISTS public.get_conversations_with_preview(uuid);

CREATE FUNCTION public.get_conversations_with_preview(p_business_id uuid)
RETURNS TABLE(
  id uuid,
  business_id uuid,
  title text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  is_archived boolean,
  metadata jsonb,
  latest_message text,
  latest_sender_name text,
  latest_sender_type text,
  unread_count integer,
  customer_id uuid,
  customer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.business_id,
    c.title,
    c.created_by,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.is_archived,
    c.metadata,
    m.content as latest_message,
    COALESCE(p.full_name, m.customer_name_from_meta) as latest_sender_name,
    m.sender_type as latest_sender_type,
    COALESCE(
      (
        SELECT COUNT(*)::integer
        FROM sg_messages msg
        WHERE msg.conversation_id = c.id
          AND msg.created_at > COALESCE(
            (SELECT r.last_read_at FROM sg_conversation_reads r WHERE r.conversation_id = c.id AND r.user_id = v_user_id),
            '1970-01-01'::timestamptz
          )
          AND msg.sender_id != v_user_id
      ),
      0
    ) as unread_count,
    c.customer_id,
    cust.name as customer_name
  FROM sg_conversations c
  LEFT JOIN LATERAL (
    SELECT 
      msg.content, 
      msg.sender_id, 
      msg.created_at,
      msg.sender_type,
      msg.metadata->>'customer_name' as customer_name_from_meta
    FROM sg_messages msg
    WHERE msg.conversation_id = c.id
    ORDER BY msg.created_at DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN profiles p ON p.id = m.sender_id AND m.sender_type = 'user'
  LEFT JOIN customers cust ON cust.id = c.customer_id
  WHERE c.business_id = p_business_id
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;