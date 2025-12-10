-- Drop the broken policy that only checks business_permissions (workers only)
DROP POLICY IF EXISTS "Business members can view conversation events" 
ON sg_conversation_events;

-- Create fixed policy that includes both owners and workers
CREATE POLICY "Business members can view conversation events"
ON sg_conversation_events FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM sg_conversations 
    WHERE business_id IN (
      -- Include business owners
      SELECT id FROM businesses WHERE owner_id = auth.uid()
      UNION
      -- Include workers (non-owners with permissions)
      SELECT business_id FROM business_permissions WHERE user_id = auth.uid()
    )
  )
);