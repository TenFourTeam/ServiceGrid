// Centralized function URL helper
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ijudkzqfriazabiosnvb.supabase.co";

export const fn = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;