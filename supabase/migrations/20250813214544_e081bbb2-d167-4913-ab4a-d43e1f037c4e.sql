-- Insert profile for the current Clerk user
INSERT INTO public.profiles (clerk_user_id, email) 
VALUES ('user_31FV4RCiu78WM4BNsd88roVIA4p', 'your-email@example.com')
ON CONFLICT (clerk_user_id) DO NOTHING;