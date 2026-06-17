import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Access Supabase variables from Vite VITE_ prefix, or fall back to standard process.env structure
const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

// Check if variables are valid and not placeholders
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder-project') && 
  !supabaseAnonKey.includes('placeholder');

let supabaseClientInstance: SupabaseClient | null = null;

try {
  supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  });
  console.log('[Wagon AI Supabase] Client initialized successfully.', {
    configured: isSupabaseConfigured,
    url: supabaseUrl
  });
} catch (error) {
  console.error('[Wagon AI Supabase] Failed to initialize client:', error);
}

export const supabase = supabaseClientInstance as SupabaseClient;

/**
 * Handle system errors gracefully
 */
export function getSupabaseErrorMsg(error: any): string {
  if (!error) return 'Erro desconhecido.';
  
  if (error.status === 400 || error.code === 'invalid_credentials') {
    return 'Credenciais incorretas ou inválidas. Por favor, revise o e-mail e senha.';
  }
  if (error.message) {
    if (error.message.includes('Email not confirmed')) {
      return 'E-mail cadastrado, mas ainda não foi confirmado no Supabase.';
    }
    return error.message;
  }
  return JSON.stringify(error);
}
