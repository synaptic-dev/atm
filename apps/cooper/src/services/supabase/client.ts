import { createClient } from '@supabase/supabase-js';
import { Env } from '@/types/env';

// Initialize with null values
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabase = async (env: Env, {
  access_token,
  refresh_token
}: {
  access_token?: string;
  refresh_token?: string;
} = {}) => {
  // If the client is already created, return it
  if (supabaseClient) return supabaseClient;
  
  // Create a new client with the env variables
  supabaseClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
  );

  // If tokens are provided, set the session
  if (access_token && refresh_token) {
    await supabaseClient.auth.setSession({
      access_token,
      refresh_token,
    });
  }
  
  return supabaseClient;
}; 