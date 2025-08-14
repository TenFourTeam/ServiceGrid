// Centralized function URL helper
const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export const fn = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;