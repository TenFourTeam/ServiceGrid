/// <reference types="vite/client" />

interface ImportMetaEnv {
  // VITE_GOOGLE_MAPS_API_KEY is now fetched from Supabase edge function
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
