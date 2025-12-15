-- Phase 1: Database Schema for Conversational Memory & Context Persistence

-- Table: ai_memory_entity_refs - Track entity references mentioned in conversations
CREATE TABLE public.ai_memory_entity_refs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'job', 'customer', 'quote', 'invoice', 'member', 'request'
  entity_id UUID NOT NULL,
  entity_name TEXT, -- Cached display name for quick reference
  mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message_id UUID REFERENCES public.ai_chat_messages(id) ON DELETE SET NULL,
  context_snippet TEXT, -- Short snippet of how entity was mentioned
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX idx_ai_memory_entity_refs_conversation ON public.ai_memory_entity_refs(conversation_id);
CREATE INDEX idx_ai_memory_entity_refs_user_business ON public.ai_memory_entity_refs(user_id, business_id);
CREATE INDEX idx_ai_memory_entity_refs_entity ON public.ai_memory_entity_refs(entity_type, entity_id);
CREATE INDEX idx_ai_memory_entity_refs_recent ON public.ai_memory_entity_refs(user_id, business_id, mentioned_at DESC);

-- Table: ai_memory_preferences - Store learned user preferences
CREATE TABLE public.ai_memory_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL, -- 'assignment', 'scheduling', 'communication', 'workflow'
  preference_key TEXT NOT NULL, -- e.g., 'assign_plumbing_jobs_to', 'preferred_schedule_time'
  preference_value JSONB NOT NULL, -- e.g., {"member_id": "xxx", "member_name": "Bob"}
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5, -- 0.0 to 1.0
  learned_from TEXT, -- 'explicit' (user said), 'inferred' (from behavior), 'confirmed' (user approved)
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry for temporary preferences
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id, preference_type, preference_key)
);

-- Indexes
CREATE INDEX idx_ai_memory_preferences_user_business ON public.ai_memory_preferences(user_id, business_id);
CREATE INDEX idx_ai_memory_preferences_active ON public.ai_memory_preferences(user_id, business_id, is_active) WHERE is_active = true;
CREATE INDEX idx_ai_memory_preferences_type ON public.ai_memory_preferences(preference_type);

-- Table: ai_pending_plans - Persist pending multi-step plans across sessions
CREATE TABLE public.ai_pending_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  plan_data JSONB NOT NULL, -- Full ExecutionPlan object
  pattern_id TEXT, -- Which multi-step pattern triggered this
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executing', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  executed_at TIMESTAMP WITH TIME ZONE,
  result JSONB -- Execution result if completed
);

-- Indexes
CREATE INDEX idx_ai_pending_plans_user ON public.ai_pending_plans(user_id, status);
CREATE INDEX idx_ai_pending_plans_active ON public.ai_pending_plans(user_id, business_id, status) WHERE status = 'pending';
CREATE INDEX idx_ai_pending_plans_expires ON public.ai_pending_plans(expires_at) WHERE status = 'pending';

-- Add columns to ai_chat_conversations for summary and entity context
ALTER TABLE public.ai_chat_conversations
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS entity_context JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMP WITH TIME ZONE;

-- RLS Policies for ai_memory_entity_refs
ALTER TABLE public.ai_memory_entity_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entity refs"
ON public.ai_memory_entity_refs
FOR SELECT
USING (user_id = current_user_profile_id());

CREATE POLICY "Users can insert their own entity refs"
ON public.ai_memory_entity_refs
FOR INSERT
WITH CHECK (user_id = current_user_profile_id());

CREATE POLICY "Users can delete their own entity refs"
ON public.ai_memory_entity_refs
FOR DELETE
USING (user_id = current_user_profile_id());

CREATE POLICY "Service role can manage entity refs"
ON public.ai_memory_entity_refs
FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policies for ai_memory_preferences
ALTER TABLE public.ai_memory_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON public.ai_memory_preferences
FOR SELECT
USING (user_id = current_user_profile_id());

CREATE POLICY "Users can manage their own preferences"
ON public.ai_memory_preferences
FOR ALL
USING (user_id = current_user_profile_id());

CREATE POLICY "Service role can manage preferences"
ON public.ai_memory_preferences
FOR ALL
USING (auth.role() = 'service_role');

-- RLS Policies for ai_pending_plans
ALTER TABLE public.ai_pending_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending plans"
ON public.ai_pending_plans
FOR SELECT
USING (user_id = current_user_profile_id());

CREATE POLICY "Users can manage their own pending plans"
ON public.ai_pending_plans
FOR ALL
USING (user_id = current_user_profile_id());

CREATE POLICY "Service role can manage pending plans"
ON public.ai_pending_plans
FOR ALL
USING (auth.role() = 'service_role');

-- Function to cleanup expired pending plans
CREATE OR REPLACE FUNCTION cleanup_expired_pending_plans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ai_pending_plans
  WHERE status = 'pending' AND expires_at < now();
END;
$$;

-- Function to update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_chat_conversations
  SET message_count = (
    SELECT COUNT(*) FROM ai_chat_messages WHERE conversation_id = NEW.conversation_id
  ),
  updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Trigger to update message count on new messages
CREATE TRIGGER trg_update_conversation_message_count
AFTER INSERT ON public.ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_message_count();