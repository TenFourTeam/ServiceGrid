-- Create timesheet_entries table for simple clock in/out functionality
CREATE TABLE public.timesheet_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  business_id uuid NOT NULL,
  clock_in_time timestamp with time zone NOT NULL DEFAULT now(),
  clock_out_time timestamp with time zone NULL,
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for timesheet access
CREATE POLICY "Business members can read their own timesheet entries"
ON public.timesheet_entries
FOR SELECT
USING (
  user_id = auth.uid() AND is_business_member(business_id)
);

CREATE POLICY "Business members can insert their own timesheet entries"
ON public.timesheet_entries
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND is_business_member(business_id)
);

CREATE POLICY "Business members can update their own timesheet entries"
ON public.timesheet_entries
FOR UPDATE
USING (
  user_id = auth.uid() AND is_business_member(business_id)
);

CREATE POLICY "Business owners can view all timesheet entries"
ON public.timesheet_entries
FOR SELECT
USING (
  can_manage_business(business_id)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_timesheet_entries_updated_at
BEFORE UPDATE ON public.timesheet_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();