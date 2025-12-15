-- Change default from [] to {} for entity_context
ALTER TABLE ai_chat_conversations 
ALTER COLUMN entity_context SET DEFAULT '{}'::jsonb;

-- Update existing rows that have [] to {}
UPDATE ai_chat_conversations 
SET entity_context = '{}'::jsonb 
WHERE entity_context = '[]'::jsonb OR entity_context IS NULL;