import { createClient } from '@supabase/supabase-js';
import { GenerationRecord } from '../types';

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

/**
 * Récupère le solde de points réel de l'utilisateur connecté (table profiles).
 * Retourne null si aucune session active ou en cas d'erreur réseau.
 */
export async function fetchMyBalance(): Promise<number | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userData.user.id)
    .single();

  if (error) {
    console.warn('[Sawtify] Erreur récupération solde:', error.message);
    return null;
  }
  return data?.credits_balance ?? null;
}

/**
 * Récupère l'historique réel des générations vocales de l'utilisateur (table voice_generations).
 */
export async function fetchMyGenerations(limit: number = 100): Promise<GenerationRecord[]> {
  const { data, error } = await supabase
    .from('voice_generations')
    .select('id, voice_id, voice_name, text_prompt, points_deducted, audio_duration_seconds, latency_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[Sawtify] Erreur récupération historique:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    text: row.text_prompt,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    pointsDeducted: row.points_deducted,
    durationSec: row.audio_duration_seconds || 0,
    latencyMs: row.latency_ms || 0,
    createdAt: row.created_at,
    // L'audio n'est pas encore uploadé vers Supabase Storage : pas de lecture/téléchargement
    // possible pour les anciennes générations après un reload (voir note séparée).
    audioUrl: undefined,
  }));
}

export interface DeductCreditsParams {
  amount: number;
  voiceId: string;
  voiceName: string;
  prompt: string;
  charCount: number;
  durationSec: number;
  latencyMs: number;
  storagePath?: string | null;
}

export interface DeductCreditsResult {
  success: boolean;
  error?: string;
  balance?: number;
  generation_id?: string;
  remaining_balance?: number;
}

/**
 * Déduit les points de manière atomique côté base de données (fonction RPC
 * SECURITY DEFINER liée à auth.uid()) et enregistre la génération dans
 * voice_generations. C'est LA seule source de vérité pour le solde — plus de
 * calcul de solde uniquement en mémoire côté client.
 */
export async function deductCreditsRPC(params: DeductCreditsParams): Promise<DeductCreditsResult> {
  const { data, error } = await supabase.rpc('deduct_user_credits', {
    p_amount: params.amount,
    p_voice_id: params.voiceId,
    p_voice_name: params.voiceName,
    p_prompt: params.prompt,
    p_char_count: params.charCount,
    p_duration: params.durationSec,
    p_latency: params.latencyMs,
    p_storage_path: params.storagePath ?? null,
  });

  if (error) {
    console.error('[Sawtify] Erreur RPC deduct_user_credits:', error.message);
    return { success: false, error: error.message };
  }

  return data as DeductCreditsResult;
}
