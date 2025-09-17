-- Enable Row Level Security on requests table
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for requests table to match other tables pattern
CREATE POLICY "Business members can read requests" 
ON public.requests 
FOR SELECT 
USING (is_business_member(business_id));

CREATE POLICY "Business members can insert requests" 
ON public.requests 
FOR INSERT 
WITH CHECK (is_business_member(business_id));

CREATE POLICY "Business members can update requests" 
ON public.requests 
FOR UPDATE 
USING (is_business_member(business_id));

CREATE POLICY "Business members can delete requests" 
ON public.requests 
FOR DELETE 
USING (is_business_member(business_id));