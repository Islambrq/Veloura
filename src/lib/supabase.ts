import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  // Deliberately not throwing here. createClient() below builds a URL object
  // internally — if it's ever called with undefined/empty strings, that
  // throws synchronously at module-load time, which crashes the entire React
  // app before anything can render (a blank page with no error shown to the
  // user). Falling back to syntactically-valid placeholders means the app
  // still mounts and shows its normal loading/error states per-request
  // instead of a silent white screen.
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or set them in your ' +
      'hosting provider\'s environment variables). Falling back to placeholder ' +
      'values so the app still renders, but no data will load.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
