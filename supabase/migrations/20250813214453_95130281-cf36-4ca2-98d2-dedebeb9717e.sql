-- Check if profiles table exists and create it if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Create profiles table
        CREATE TABLE public.profiles (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            clerk_user_id TEXT UNIQUE,
            email TEXT,
            first_name TEXT,
            last_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view their own profile" 
        ON public.profiles 
        FOR SELECT 
        USING (clerk_user_id = auth.jwt() ->> 'sub');

        CREATE POLICY "Users can update their own profile" 
        ON public.profiles 
        FOR UPDATE 
        USING (clerk_user_id = auth.jwt() ->> 'sub');

        CREATE POLICY "Users can insert their own profile" 
        ON public.profiles 
        FOR INSERT 
        WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

        -- Add trigger for timestamps
        CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();

        -- Insert a profile for the current test user (if we can determine it)
        -- This will help with immediate testing
    END IF;
END $$;