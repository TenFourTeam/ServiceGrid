-- Make job_id nullable since media can be attached to conversations, checklists, or notes
ALTER TABLE public.sg_media 
  ALTER COLUMN job_id DROP NOT NULL;

-- Add check constraint to ensure media is attached to at least one entity
ALTER TABLE public.sg_media
  ADD CONSTRAINT sg_media_must_have_parent CHECK (
    job_id IS NOT NULL OR 
    conversation_id IS NOT NULL OR 
    checklist_item_id IS NOT NULL OR 
    note_id IS NOT NULL
  );