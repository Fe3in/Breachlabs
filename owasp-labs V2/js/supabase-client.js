// Requires: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// and config.js loaded before this file.
window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
