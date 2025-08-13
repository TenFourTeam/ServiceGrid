-- Create a function to get dashboard counts efficiently
CREATE OR REPLACE FUNCTION get_dashboard_counts(owner_id uuid)
RETURNS TABLE(customers bigint, jobs bigint, quotes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM customers WHERE customers.owner_id = get_dashboard_counts.owner_id),
    (SELECT COUNT(*) FROM jobs WHERE jobs.owner_id = get_dashboard_counts.owner_id),
    (SELECT COUNT(*) FROM quotes WHERE quotes.owner_id = get_dashboard_counts.owner_id);
END;
$$;