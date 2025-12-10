-- Drop and recreate the function with new return type
DROP FUNCTION IF EXISTS public.get_conversations_with_preview(uuid);

-- Update get_conversations_with_preview to include job_id, assigned_worker_id and their display names
CREATE OR REPLACE FUNCTION public.get_conversations_with_preview(p_business_id uuid)
 RETURNS TABLE(
   id uuid, 
   business_id uuid, 
   title text, 
   created_by uuid, 
   created_at timestamp with time zone, 
   updated_at timestamp with time zone, 
   last_message_at timestamp with time zone, 
   is_archived boolean, 
   metadata jsonb, 
   latest_message text, 
   latest_sender_name text, 
   latest_sender_type text, 
   unread_count integer, 
   customer_id uuid, 
   customer_name text,
   job_id uuid,
   job_title text,
   assigned_worker_id uuid,
   assigned_worker_name text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    cust.name as customer_name,
    c.job_id,
    j.title as job_title,
    c.assigned_worker_id,
    worker.full_name as assigned_worker_name
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
  LEFT JOIN jobs j ON j.id = c.job_id
  LEFT JOIN profiles worker ON worker.id = c.assigned_worker_id
  WHERE c.business_id = p_business_id
  ORDER BY c.last_message_at DESC NULLS LAST;
END;
$function$;