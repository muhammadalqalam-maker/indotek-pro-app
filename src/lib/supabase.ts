import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;

export type SupabaseConfigStatus = {
  isConfigured: boolean;
  url: string;
  anonKey: string;
  errors: string[];
};

export function getSupabaseConfig(): SupabaseConfigStatus {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

  const url = envUrl;
  const anonKey = envAnonKey;

  const errors: string[] = [];
  if (!url) errors.push('VITE_SUPABASE_URL belum diisi.');
  else if (!SUPABASE_URL_PATTERN.test(url)) errors.push('VITE_SUPABASE_URL harus berupa URL Supabase yang valid.');

  if (!anonKey) errors.push('VITE_SUPABASE_ANON_KEY belum diisi.');
  else if (anonKey.length < 20) errors.push('VITE_SUPABASE_ANON_KEY terlihat tidak valid.');

  return {
    isConfigured: errors.length === 0,
    url,
    anonKey,
    errors,
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

export function getSupabase(): SupabaseClient | null {
  const { isConfigured, url, anonKey } = getSupabaseConfig();
  if (!isConfigured || !url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseInstance;
}
