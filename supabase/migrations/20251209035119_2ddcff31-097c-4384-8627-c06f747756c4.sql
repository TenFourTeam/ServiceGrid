-- Fix existing stuck conversation media records
UPDATE public.sg_media 
SET upload_status = 'completed' 
WHERE upload_status = 'processing' 
  AND conversation_id IS NOT NULL;