import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEMO } from '@/demo/flag';
import { demoSupabase } from '@/demo/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Demo mode needs no Supabase at all (see client/src/demo).
export const isSupabaseConfigured = DEMO || Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).'
  );
}

// With missing env vars every request fails, and pages show their error state
// instead of silently rendering placeholder data.
export const supabase: SupabaseClient = DEMO
  ? (demoSupabase as unknown as SupabaseClient)
  : createClient(supabaseUrl ?? 'http://supabase-not-configured.invalid', supabaseAnonKey ?? 'missing-anon-key', {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
