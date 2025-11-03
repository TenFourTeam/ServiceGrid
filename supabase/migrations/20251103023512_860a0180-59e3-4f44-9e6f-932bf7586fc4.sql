-- Create AI chat conversations table
CREATE TABLE ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI chat messages table
CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ai_conversations_business ON ai_chat_conversations(business_id);
CREATE INDEX idx_ai_conversations_user ON ai_chat_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation ON ai_chat_messages(conversation_id);
CREATE INDEX idx_ai_messages_created ON ai_chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their business conversations"
  ON ai_chat_conversations FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "Users can create conversations for their business"
  ON ai_chat_conversations FOR INSERT
  WITH CHECK (is_business_member(business_id) AND user_id = current_user_profile_id());

CREATE POLICY "Users can update their own conversations"
  ON ai_chat_conversations FOR UPDATE
  USING (user_id = current_user_profile_id());

CREATE POLICY "Users can delete their own conversations"
  ON ai_chat_conversations FOR DELETE
  USING (user_id = current_user_profile_id());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON ai_chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_chat_conversations
    WHERE id = conversation_id AND is_business_member(business_id)
  ));

CREATE POLICY "Users can create messages in their conversations"
  ON ai_chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_chat_conversations
    WHERE id = conversation_id AND user_id = current_user_profile_id()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();