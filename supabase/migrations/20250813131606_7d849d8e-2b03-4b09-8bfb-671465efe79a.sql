-- Drop existing function and recreate with new signature
DROP FUNCTION public.get_dashboard_counts(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_counts(owner_id uuid)
 RETURNS TABLE(
   customers bigint, 
   jobs bigint, 
   quotes bigint,
   customer_data jsonb,
   invoice_data jsonb
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM customers WHERE customers.owner_id = get_dashboard_counts.owner_id),
    (SELECT COUNT(*) FROM jobs WHERE jobs.owner_id = get_dashboard_counts.owner_id),
    (SELECT COUNT(*) FROM quotes WHERE quotes.owner_id = get_dashboard_counts.owner_id),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'email', email,
      'phone', phone,
      'address', address
    )), '[]'::jsonb) FROM customers WHERE customers.owner_id = get_dashboard_counts.owner_id),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'number', number,
      'customerId', customer_id,
      'jobId', job_id,
      'taxRate', tax_rate,
      'discount', discount,
      'subtotal', subtotal,
      'total', total,
      'status', status,
      'dueAt', due_at,
      'createdAt', created_at,
      'updatedAt', updated_at,
      'publicToken', public_token
    )), '[]'::jsonb) FROM invoices WHERE invoices.owner_id = get_dashboard_counts.owner_id);
END;
$function$