// Centralized function URL helper
import { SUPABASE_URL } from "@/utils/edgeApi";

export const fn = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;