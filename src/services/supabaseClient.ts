import { createClient } from '@supabase/supabase-js';

// Ces deux valeurs sont publiques (clé "anon"), à définir dans un fichier .env :
//   VITE_SUPABASE_URL=https://jjpcvevdztletxgmmzqr.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ... (Supabase Dashboard > Project Settings > API > anon public)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Sawtify] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants. Ajoute-les dans un fichier .env à la racine.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Lance la connexion Google (redirection OAuth gérée par Supabase)
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function signOutFromSupabase() {
  await supabase.auth.signOut();
}
