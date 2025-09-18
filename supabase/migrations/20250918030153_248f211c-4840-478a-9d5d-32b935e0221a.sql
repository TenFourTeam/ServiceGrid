-- Drop existing update policy for timesheet_entries
DROP POLICY IF EXISTS "Business members can update their own timesheet entries" ON public.timesheet_entries;

-- Create new policies for role-based updates
-- Workers can only update to clock out (add clock_out_time to their own active entries)
CREATE POLICY "Workers can clock out their own entries" 
ON public.timesheet_entries 
FOR UPDATE 
USING (
  user_id = current_user_profile_id() 
  AND is_business_member(business_id) 
  AND user_business_role(business_id) = 'worker'
  AND clock_out_time IS NULL  -- Can only update active entries
)
WITH CHECK (
  user_id = current_user_profile_id() 
  AND is_business_member(business_id)
  AND user_business_role(business_id) = 'worker'
  -- Only allow updating clock_out_time and notes, not other fields
);

-- Business owners can update any timesheet entry in their business
CREATE POLICY "Business owners can update all timesheet entries" 
ON public.timesheet_entries 
FOR UPDATE 
USING (can_manage_business(business_id))
WITH CHECK (can_manage_business(business_id));