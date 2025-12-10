-- Conversation Events Table (audit trail)
CREATE TABLE sg_conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES sg_conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'reassigned', 'archived', 'unarchived'
  user_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_sg_conversation_events_conversation_id ON sg_conversation_events(conversation_id);
CREATE INDEX idx_sg_conversation_events_created_at ON sg_conversation_events(created_at DESC);

-- Enable RLS
ALTER TABLE sg_conversation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy for service role (edge functions use service role)
CREATE POLICY "Service role can manage conversation events"
ON sg_conversation_events FOR ALL
USING (true);

-- Enable Realtime for activity updates
ALTER PUBLICATION supabase_realtime ADD TABLE sg_conversation_events;