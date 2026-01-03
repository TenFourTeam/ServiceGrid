-- Insert missing profile for user d6890284-7bf5-403f-bff4-f91b31591c00
INSERT INTO public.profiles (id, email, full_name, phone_e164, default_business_id)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name',
  NULL,
  NULL
FROM auth.users
WHERE id = 'd6890284-7bf5-403f-bff4-f91b31591c00'
ON CONFLICT (id) DO NOTHING;