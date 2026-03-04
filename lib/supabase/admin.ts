import { createClient } from "@supabase/supabase-js";

// Admin client bypasses RLS — use for admin operations only
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
