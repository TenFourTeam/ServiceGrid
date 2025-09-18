-- Fix search_path for security compliance
CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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

-- Fix search_path for trigger function
CREATE OR REPLACE FUNCTION public.set_business_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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