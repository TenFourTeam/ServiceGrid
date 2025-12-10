-- Add SELECT policy for business members to enable Realtime subscriptions
CREATE POLICY "Business members can view conversation events"
ON sg_conversation_events FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM sg_conversations 
    WHERE business_id IN (
      SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
    )
  )
);