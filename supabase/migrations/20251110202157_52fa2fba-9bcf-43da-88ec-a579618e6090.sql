-- Add tracking columns to recurring_schedules table
ALTER TABLE recurring_schedules 
ADD COLUMN IF NOT EXISTS last_invoice_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_invoices_generated integer DEFAULT 0;

-- Add link from invoices to recurring schedules
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS recurring_schedule_id uuid REFERENCES recurring_schedules(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_schedule_id ON invoices(recurring_schedule_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_business_active ON recurring_schedules(business_id, is_active);