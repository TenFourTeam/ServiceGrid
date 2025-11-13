-- Create conversations table
CREATE TABLE public.sg_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_conversations_business_id ON public.sg_conversations(business_id);
CREATE INDEX idx_conversations_last_message ON public.sg_conversations(business_id, last_message_at DESC);
CREATE INDEX idx_conversations_created_by ON public.sg_conversations(created_by);

-- Create messages table
CREATE TABLE public.sg_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.sg_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited BOOLEAN DEFAULT false,
  mentions JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON public.sg_messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.sg_messages(sender_id);
CREATE INDEX idx_messages_mentions ON public.sg_messages USING GIN(mentions);
CREATE INDEX idx_messages_business ON public.sg_messages(business_id);

-- Enable RLS
ALTER TABLE public.sg_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sg_messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS policies
-- Business owners can view conversations
CREATE POLICY "Business owners can view conversations"
ON public.sg_conversations FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR business_id IN (
    SELECT business_id FROM public.business_permissions WHERE user_id = auth.uid()
  )
);

-- Business members can create conversations
CREATE POLICY "Business members can create conversations"
ON public.sg_conversations FOR INSERT
WITH CHECK (
  (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR business_id IN (
    SELECT business_id FROM public.business_permissions WHERE user_id = auth.uid()
  ))
  AND created_by = auth.uid()
);

-- Conversation creator or owner can update
CREATE POLICY "Conversation creator or owner can update"
ON public.sg_conversations FOR UPDATE
USING (
  created_by = auth.uid()
  OR business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Messages RLS policies
-- Business members can view messages
CREATE POLICY "Business members can view messages"
ON public.sg_messages FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR business_id IN (
    SELECT business_id FROM public.business_permissions WHERE user_id = auth.uid()
  )
);

-- Business members can send messages
CREATE POLICY "Business members can send messages"
ON public.sg_messages FOR INSERT
WITH CHECK (
  (business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR business_id IN (
    SELECT business_id FROM public.business_permissions WHERE user_id = auth.uid()
  ))
  AND sender_id = auth.uid()
);

-- Sender can edit own messages
CREATE POLICY "Sender can edit own messages"
ON public.sg_messages FOR UPDATE
USING (sender_id = auth.uid());

-- Sender or owner can delete messages
CREATE POLICY "Sender or owner can delete messages"
ON public.sg_messages FOR DELETE
USING (
  sender_id = auth.uid()
  OR business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Trigger to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sg_conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_conversation_timestamp
AFTER INSERT ON public.sg_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();

-- Function to get conversations with latest message preview
CREATE OR REPLACE FUNCTION get_conversations_with_preview(p_business_id UUID)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  title TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN,
  latest_message TEXT,
  latest_sender_name TEXT,
  unread_count BIGINT
) AS $$
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
    m.content AS latest_message,
    p.full_name AS latest_sender_name,
    0::BIGINT AS unread_count
  FROM public.sg_conversations c
  LEFT JOIN LATERAL (
    SELECT content, sender_id
    FROM public.sg_messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE c.business_id = p_business_id
    AND c.is_archived = false
  ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sg_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sg_messages;