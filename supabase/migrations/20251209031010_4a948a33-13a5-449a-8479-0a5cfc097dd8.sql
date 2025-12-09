-- Allow NULL content in sg_messages for attachment-only messages
ALTER TABLE sg_messages ALTER COLUMN content DROP NOT NULL;