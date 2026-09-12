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

const SIGNUP_INTENT_KEY = 'sawtify_signup_intent';

// Lance la connexion Google (redirection OAuth gérée par Supabase).
// intent='signup' marque qu'on vient de l'inscription : au retour, App.tsx
// saura qu'il faut proposer de créer un mot de passe.
export async function signInWithGoogle(intent: 'login' | 'signup' = 'login') {
  if (intent === 'signup') {
    sessionStorage.setItem(SIGNUP_INTENT_KEY, 'true');
  } else {
    sessionStorage.removeItem(SIGNUP_INTENT_KEY);
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      // Force Google à réafficher le sélecteur de compte à chaque clic, au lieu de
      // ré-utiliser silencieusement le dernier compte Google connecté dans ce navigateur.
      // Sans ça, on ne peut pas tester/se connecter avec un autre compte.
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

// À appeler une fois la session Google confirmée : dit si cette connexion
// venait du bouton "Créer un compte" (donc s'il faut proposer un mot de passe).
export function consumeSignupIntent(): boolean {
  const isSignup = sessionStorage.getItem(SIGNUP_INTENT_KEY) === 'true';
  sessionStorage.removeItem(SIGNUP_INTENT_KEY);
  return isSignup;
}

// Connexion classique par e-mail + mot de passe (le mot de passe est celui
// défini juste après l'inscription via Google, sur ce même e-mail Gmail).
export async function signInWithEmailPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Définit le mot de passe du compte connecté (appelé juste après le tout premier
// Google Sign-In pour permettre ensuite une connexion classique email + mot de passe).
export async function setAccountPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOutFromSupabase() {
  await supabase.auth.signOut();
}

/**
 * Jeton de session Supabase de l'utilisateur connecté, à envoyer en
 * "Authorization: Bearer <token>" vers le backend (server.ts) pour qu'il sache
 * qui créditer après un paiement (voir /api/slickpay/create-invoice & confirm-payment).
 */
export async function getMyAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Uploade le WAV généré vers Supabase Storage (bucket privé "audio-generations")
 * sous {user_id}/{fileId}.wav, pour qu'il reste lisible/téléchargeable dans
 * l'historique après un rechargement de page. Retourne le chemin de stockage
 * (à transmettre à deductCreditsRPC), ou null si l'upload échoue (dégradation
 * silencieuse : la génération reste utilisable dans la session en cours).
 */
export async function uploadGenerationAudio(userId: string, fileId: string, blob: Blob): Promise<string | null> {
  try {
    const path = `${userId}/${fileId}.wav`;
    const { error } = await supabase.storage
      .from('audio-generations')
      .upload(path, blob, { contentType: 'audio/wav', upsert: false });
    if (error) {
      console.warn('[Sawtify] Upload audio échoué:', error.message);
      return null;
    }
    return path;
  } catch (e) {
    console.warn('[Sawtify] Upload audio exception:', e);
    return null;
  }
}

// Envoie un e-mail de réinitialisation de mot de passe. Le lien reçu ramène
// l'utilisateur sur l'app avec l'évènement Supabase 'PASSWORD_RECOVERY'
// (géré dans App.tsx), qui réutilise l'écran SetPasswordScreen existant.
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
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
 * Récupère l'historique réel des générations vocales de l'utilisateur (table voice_generations),
 * avec une URL signée temporaire (1h) pour chaque audio réellement stocké sur Supabase Storage.
 */
export async function fetchMyGenerations(limit: number = 100): Promise<GenerationRecord[]> {
  const { data, error } = await supabase
    .from('voice_generations')
    .select('id, voice_id, voice_name, text_prompt, points_deducted, audio_duration_seconds, latency_ms, created_at, audio_storage_path')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[Sawtify] Erreur récupération historique:', error.message);
    return [];
  }

  const rows = data || [];

  // Génère les URLs signées en parallèle pour toutes les lignes qui ont un
  // fichier réellement stocké (les anciennes générations d'avant cette
  // correction n'en ont pas -> pas de lecteur/téléchargement pour elles).
  const signedUrls = await Promise.all(
    rows.map(async (row) => {
      if (!row.audio_storage_path) return null;
      try {
        const { data: signed, error: signErr } = await supabase.storage
          .from('audio-generations')
          .createSignedUrl(row.audio_storage_path, 3600);
        if (signErr) return null;
        return signed?.signedUrl ?? null;
      } catch {
        return null;
      }
    })
  );

  return rows.map((row, i) => ({
    id: row.id,
    text: row.text_prompt,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    pointsDeducted: row.points_deducted,
    durationSec: row.audio_duration_seconds || 0,
    latencyMs: row.latency_ms || 0,
    createdAt: row.created_at,
    audioUrl: signedUrls[i] || undefined,
  }));
}

/**
 * Récupère l'historique réel des achats/recharges de points de l'utilisateur
 * (table transactions). Remplace l'ancien achat "pur_free_welcome" mocké en
 * dur côté client, qui n'existait pas forcément réellement en base.
 */
export async function fetchMyPurchases(limit: number = 50): Promise<import('../types').PurchaseRecord[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, pack_id, gateway, gateway_reference, amount_dzd, points_credited, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[Sawtify] Erreur récupération achats:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    packId: row.pack_id || '',
    packName: `${row.points_credited} Points`,
    pointsCredited: row.points_credited,
    amountDZD: row.amount_dzd,
    paymentMethod: row.gateway === 'cib' ? 'cib' : 'edahabia',
    transactionId: row.gateway_reference,
    status: row.status === 'completed' ? 'paid' : row.status === 'refunded' ? 'failed' : (row.status as 'paid' | 'pending' | 'failed'),
    createdAt: row.created_at,
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

/**
 * À appeler une seule fois, juste après une inscription (SIGNED_IN + intent
 * signup) : demande au serveur de vérifier si l'IP a déjà servi à créer un
 * compte et de retirer le bonus de 50 points si c'est le cas.
 */
export async function claimWelcomeBonus(): Promise<'granted' | 'denied' | 'error'> {
  try {
    const token = await getMyAccessToken();
    if (!token) return 'error';
    const { API_BASE_URL } = await import('../config/apiBase');
    const res = await fetch(`${API_BASE_URL}/api/auth/claim-welcome-bonus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return 'error';
    return data.welcomeGranted === true ? 'granted' : 'denied';
  } catch (e) {
    console.warn('[Sawtify] Erreur vérification bonus de bienvenue:', e);
    return 'error';
  }
}

export async function saveOnboardingData(params: { phone: string; useCase: string; source: string; fullName: string }): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Session utilisateur introuvable.');

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name: params.fullName.trim(), phone_number: params.phone.trim(), onboarding_use_case: params.useCase, acquisition_source: params.source, onboarding_completed_at: new Date().toISOString() },
  });
  if (metadataError) throw new Error(metadataError.message);
}

export async function updateGenerationStoragePath(generationId: string, storagePath: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_generation_storage_path', {
    p_generation_id: generationId,
    p_storage_path: storagePath,
  });

  if (error) {
    console.warn('[Sawtify] Erreur mise à jour storage path:', error.message);
    return false;
  }

  return data?.success || false;
}
