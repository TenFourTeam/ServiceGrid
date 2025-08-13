-- Insert profile for the current Clerk user with correct email
INSERT INTO public.profiles (clerk_user_id, email) 
VALUES ('user_31FV4RCiu78WM4BNsd88roVIA4p', 'je-tsongkhapa@pm.me')
ON CONFLICT (clerk_user_id) DO NOTHING;