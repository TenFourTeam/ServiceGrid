-- Enable full row replication for quotes table
ALTER TABLE quotes REPLICA IDENTITY FULL;

-- Add quotes table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;