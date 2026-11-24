import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Frontend selalu pakai anon/publishable key — JANGAN pakai service role key di browser
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Konfigurasi .env tidak lengkap:", { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
  throw new Error("Konfigurasi Supabase frontend belum lengkap. Periksa file .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Simpan sesi ke localStorage otomatis
    autoRefreshToken: true,     // Refresh token otomatis
    detectSessionInUrl: true    // Tangkap session dari URL (email confirm, oauth)
  }
});
