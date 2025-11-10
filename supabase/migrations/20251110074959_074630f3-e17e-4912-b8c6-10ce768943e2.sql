-- Add 'weekly' to the quote_frequency enum
-- This will allow weekly subscription options
ALTER TYPE quote_frequency ADD VALUE IF NOT EXISTS 'weekly';

-- Add 'quarterly' to the quote_frequency enum  
-- This will allow quarterly subscription options
ALTER TYPE quote_frequency ADD VALUE IF NOT EXISTS 'quarterly';