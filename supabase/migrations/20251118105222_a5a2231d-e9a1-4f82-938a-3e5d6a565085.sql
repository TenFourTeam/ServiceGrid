-- Drop the constraint that requires sg_media to have a parent
-- AI chat media is tracked by mediaId and doesn't need a parent reference
ALTER TABLE sg_media DROP CONSTRAINT IF EXISTS sg_media_must_have_parent;