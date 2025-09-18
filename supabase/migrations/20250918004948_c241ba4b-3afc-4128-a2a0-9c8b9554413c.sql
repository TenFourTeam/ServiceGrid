-- Add slug column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN slug text;

-- Create function to generate URL-safe slugs
CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN 'business';
  END IF;
  
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s&-]', '', 'g'),
        '&', 'and', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$;

-- Populate existing businesses with unique slugs
DO $$
DECLARE
  business_record RECORD;
  base_slug text;
  final_slug text;
  counter integer;
BEGIN
  FOR business_record IN SELECT id, name FROM public.businesses ORDER BY created_at LOOP
    base_slug := public.generate_slug(business_record.name);
    final_slug := base_slug;
    counter := 1;
    
    -- Ensure slug uniqueness
    WHILE EXISTS (
      SELECT 1 FROM public.businesses 
      WHERE slug = final_slug AND id != business_record.id
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    UPDATE public.businesses 
    SET slug = final_slug 
    WHERE id = business_record.id;
  END LOOP;
END;
$$;

-- Create trigger function to auto-generate slugs
CREATE OR REPLACE FUNCTION public.set_business_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Generate base slug from business name
  base_slug := public.generate_slug(NEW.name);
  final_slug := base_slug;
  
  -- Ensure slug uniqueness
  WHILE EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate slugs on insert/update
CREATE TRIGGER set_business_slug_trigger
  BEFORE INSERT OR UPDATE OF name ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_slug();

-- Add unique constraint on slug
ALTER TABLE public.businesses 
ADD CONSTRAINT businesses_slug_unique UNIQUE (slug);