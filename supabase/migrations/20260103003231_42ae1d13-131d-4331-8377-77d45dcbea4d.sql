-- Create missing business for user d6890284-7bf5-403f-bff4-f91b31591c00
INSERT INTO public.businesses (
  owner_id,
  name,
  name_customized
)
VALUES (
  'd6890284-7bf5-403f-bff4-f91b31591c00',
  'My Business',
  false
)
ON CONFLICT DO NOTHING
RETURNING id;