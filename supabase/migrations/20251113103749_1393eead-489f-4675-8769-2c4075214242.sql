-- Fix function search path security warning by recreating trigger and function
DROP TRIGGER IF EXISTS trg_update_checklist_completion ON sg_checklist_items;
DROP FUNCTION IF EXISTS update_checklist_completion();

CREATE OR REPLACE FUNCTION update_checklist_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed = true)
  INTO total_items, completed_items
  FROM sg_checklist_items
  WHERE checklist_id = NEW.checklist_id;
  
  IF completed_items = total_items THEN
    UPDATE sg_checklists
    SET completed_at = NOW(), updated_at = NOW()
    WHERE id = NEW.checklist_id AND completed_at IS NULL;
  ELSE
    UPDATE sg_checklists
    SET completed_at = NULL, updated_at = NOW()
    WHERE id = NEW.checklist_id AND completed_at IS NOT NULL;
  END IF;
  
  IF NEW.is_completed = true THEN
    UPDATE sg_checklists
    SET started_at = NOW()
    WHERE id = NEW.checklist_id AND started_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_checklist_completion
AFTER UPDATE OF is_completed ON sg_checklist_items
FOR EACH ROW
EXECUTE FUNCTION update_checklist_completion();