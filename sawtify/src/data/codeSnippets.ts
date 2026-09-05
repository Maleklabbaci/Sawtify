export const PROJECT_ARCHITECTURE = `sawtify-platform/
├── 📁 frontend/                     # Next.js 14/15 (App Router) + Tailwind CSS + TypeScript
│   ├── 📁 app/
│   │   ├── 📄 layout.tsx             # Layout global avec polices optimisées et meta tags SEO
│   │   ├── 📄 page.tsx               # Landing & Présentation orientée conversion
│   │   ├── 📁 dashboard/
│   │   │   ├── 📄 page.tsx           # Dashboard principal : Studio TTS & Historique
│   │   │   └── 📄 billing/page.tsx   # Recharges de points DZD & Facturation
│   │   ├── 📁 api/                   # Route Handlers Next.js (Proxy & Auth Session)
│   │   │   └── 📁 auth/callback/route.ts
│   │   └── 📄 globals.css            # Tailwind CSS v4 & styles personnalisés
│   ├── 📁 components/
│   │   ├── 📁 tts/
│   │   │   ├── 📄 TTSStudio.tsx       # Composant de génération principal (Prompt, Voix, Audio)
│   │   │   ├── 📄 VoiceSelector.tsx   # Sélecteur multi-speakers (Arabe, Derja, FR, EN)
│   │   │   ├── 📄 StyleTagsBar.tsx    # Insertion rapide de balises ([whispers], [excited], etc.)
│   │   │   ├── 📄 AudioPlayer.tsx     # Lecteur audio avec waveform et export .wav
│   │   │   └── 📄 InsufficientCreditsModal.tsx # Alerte solde bas (< 20 points)
│   │   ├── 📁 billing/
│   │   │   ├── 📄 CreditBadge.tsx     # Badge solde en temps réel avec animation
│   │   │   ├── 📄 RechargeModal.tsx   # Modal d'achat de packs DZD (500 DA, 1000 DA)
│   │   │   └── 📄 PaymentFormDZ.tsx   # Formulaire sécurisé Cartes Edahabia / CIB
│   │   └── 📁 ui/                     # Primitives UI accessibles (Boutons, Modales, Inputs)
│   ├── 📁 hooks/
│   │   ├── 📄 useTTSStream.ts         # Hook gérant le streaming audio et latence TTFB
│   │   └── 📄 useUserCredits.ts       # Hook synchronisé Supabase Realtime pour le solde
│   ├── 📁 lib/
│   │   ├── 📄 supabaseClient.ts      # Client Supabase browser avec session Auth
│   │   └── 📄 api.ts                  # Client fetch pour les appels vers le backend FastAPI
│   └── 📄 package.json
│
├── 📁 backend/                      # FastAPI (Python 3.11+) pour inférence asynchrone
│   ├── 📄 main.py                    # Point d'entrée FastAPI, middlewares CORS, lifespan
│   ├── 📁 core/
│   │   ├── 📄 config.py              # Pydantic Settings (Supabase, API Keys, Secrets)
│   │   └── 📄 security.py            # Vérification HMAC-SHA256 pour webhooks Edahabia/CIB
│   ├── 📁 services/
│   │   ├── 📄 tts_engine.py          # Moteur TTS avec streaming chunked et retry exponentiel
│   │   ├── 📄 supabase_service.py    # Transactions atomiques (vérification & déduction points)
│   │   └── 📄 storage_service.py     # Upload asynchrone des .wav sur Supabase Storage
│   ├── 📁 routers/
│   │   ├── 📄 tts.py                 # Route POST /api/v1/tts/generate (StreamingResponse)
│   │   ├── 📄 webhooks.py            # Route POST /api/v1/webhooks/chargily (CIB/Edahabia)
│   │   └── 📄 credits.py             # Route GET /api/v1/credits/balance
│   ├── 📁 schemas/
│   │   └── 📄 tts.py                 # Modèles Pydantic pour requêtes et réponses
│   ├── 📄 requirements.txt           # Dépendances (fastapi, uvicorn, httpx, supabase, pydantic)
│   └── 📄 Dockerfile                 # Image de production optimisée pour Cloud Run / VPS
│
├── 📁 supabase/                     # Infrastructure de base de données PostgreSQL
│   ├── 📁 migrations/
│   │   └── 📄 20240101000000_init_schema.sql  # Tables, RLS, fonctions atomiques & triggers
│   └── 📄 config.toml                # Configuration locale Supabase CLI
│
└── 📄 README.md                      # Guide de déploiement et configuration des variables d'environnement`;

export const SQL_DATABASE_SCHEMA = `-- =========================================================================
-- SAWTIFY TTS SAAS - SCHÉMA DE BASE DE DONNÉES POSTGRESQL / SUPABASE
-- Tables : users, user_credits, credit_purchases, generations
-- Sécurité : Row Level Security (RLS) activé + Procédures Stockées Atomiques
-- =========================================================================

-- Activer l'extension UUID pour les identifiants uniques
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. TABLE : users (Extension du schéma auth.users de Supabase)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.users IS 'Profils utilisateurs publics liés à Supabase Auth';

-- -------------------------------------------------------------------------
-- 2. TABLE : user_credits (Solde de points en temps réel)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_credits (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 50 CHECK (balance >= 0), -- 50 points offerts à l'inscription
    total_earned INT NOT NULL DEFAULT 50,
    total_spent INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.user_credits IS 'Solde courant de points pour le modèle Pay-as-you-go';

-- -------------------------------------------------------------------------
-- 3. TABLE : credit_purchases (Historique des recharges CIB / Edahabia)
-- -------------------------------------------------------------------------
CREATE TYPE payment_gateway_enum AS ENUM ('edahabia', 'cib', 'chargily_pay', 'satim');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'canceled');

CREATE TABLE IF NOT EXISTS public.credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    gateway_invoice_id TEXT UNIQUE, -- Identifiant de transaction passerelle (ex: Chargily invoice_id)
    pack_name TEXT NOT NULL,
    amount_dzd NUMERIC(10, 2) NOT NULL, -- Prix en Dinars Algériens (ex: 500.00 DA ou 1000.00 DA)
    points_credited INT NOT NULL,      -- Points alloués (ex: 100 ou 220)
    payment_method payment_gateway_enum NOT NULL DEFAULT 'chargily_pay',
    status payment_status_enum NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb, -- Métadonnées de webhook pour traçabilité
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_invoice_id ON public.credit_purchases(gateway_invoice_id);

-- -------------------------------------------------------------------------
-- 4. TABLE : generations (Historique des synthèses vocales générées)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    text_prompt TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    style_tags TEXT[],                 -- Balises audio appliquées: ['[whispers]', '[excited]']
    points_cost INT NOT NULL DEFAULT 20,
    duration_seconds NUMERIC(6, 2),
    latency_ms INT,                     -- Temps de réponse TTFB en millisecondes
    audio_storage_path TEXT,           -- Chemin du fichier .wav sur Supabase Storage
    audio_public_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);

-- -------------------------------------------------------------------------
-- 5. FONCTIONS STOCKÉES ATOMIQUES & VERROUILLAGE (Anti-Race Condition)
-- -------------------------------------------------------------------------

-- Fonction atomique pour déduire les points avec verrou FOR UPDATE
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
    p_user_id UUID,
    p_points_cost INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INT;
    v_new_balance INT;
BEGIN
    -- Verrouiller la ligne utilisateur pour empêcher les concurrences de requêtes
    SELECT balance INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Compte utilisateur introuvable');
    END IF;

    IF v_current_balance < p_points_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solde insuffisant',
            'current_balance', v_current_balance,
            'required_points', p_points_cost
        );
    END IF;

    -- Déduction atomique
    UPDATE public.user_credits
    SET 
        balance = balance - p_points_cost,
        total_spent = total_spent + p_points_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'deducted_points', p_points_cost
    );
END;
$$;

-- Fonction atomique pour recréditer le compte lors du Webhook de paiement
CREATE OR REPLACE FUNCTION public.credit_user_account(
    p_user_id UUID,
    p_invoice_id TEXT,
    p_points INT,
    p_amount_dzd NUMERIC,
    p_payment_method payment_gateway_enum
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INT;
BEGIN
    -- 1. Marquer l'achat comme payé ou l'insérer si non existant
    INSERT INTO public.credit_purchases (
        user_id, gateway_invoice_id, pack_name, amount_dzd, points_credited, payment_method, status, paid_at
    )
    VALUES (
        p_user_id, p_invoice_id, 'Recharge ' || p_points || ' Points', p_amount_dzd, p_points, p_payment_method, 'paid', NOW()
    )
    ON CONFLICT (gateway_invoice_id) 
    DO UPDATE SET 
        status = 'paid',
        paid_at = NOW();

    -- 2. Mettre à jour le solde utilisateur
    UPDATE public.user_credits
    SET 
        balance = balance + p_points,
        total_earned = total_earned + p_points,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'credited_points', p_points,
        'new_balance', v_new_balance
    );
END;
$$;

-- -------------------------------------------------------------------------
-- 6. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture : Un utilisateur ne peut voir que ses propres données
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own credits" 
    ON public.user_credits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own purchases" 
    ON public.credit_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own generations" 
    ON public.generations FOR SELECT USING (auth.uid() = user_id);

-- Seul le service backend sécurisé (via service_role key) peut modifier le solde et insérer les générations`;

export const FASTAPI_BACKEND_CODE = `"""
SAWTIFY TTS BACKEND - FastAPI Production Microservice
- Async Audio Streaming (stream=True via StreamingResponse)
- Automatic Retry Logic on unexpected tokens or engine failure
- Atomic Credit Verification & Deduction (HTTP 402 Payment Required)
- Secure HMAC-SHA256 Webhook for Algerian Payment Gateway (Edahabia / CIB)
"""

import os
import hmac
import hashlib
import json
import asyncio
from typing import AsyncGenerator, List, Optional
from fastapi import FastAPI, Request, HTTPException, Depends, Header, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client

# Configuration d'environnement
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://xyzcompany.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key")
CHARGILY_APP_SECRET = os.getenv("CHARGILY_APP_SECRET", "secret_live_key_edahabia_cib")
TTS_ENGINE_API_URL = os.getenv("TTS_ENGINE_API_URL", "http://localhost:8001/v1/audio/speech")

# Client Supabase avec privilèges de service (bypass RLS pour les opérations atomiques du backend)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(
    title="Sawtify TTS Engine API",
    version="1.0.0",
    description="Microservice TTS Pay-as-you-go ultra-rapide avec streaming et intégration bancaire CIB/Edahabia"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://sawtify.dz", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Schémas Pydantic
# ---------------------------------------------------------------------------
class TTSGenerationRequest(BaseModel):
    user_id: str = Field(..., description="UUID de l'utilisateur authentifié")
    text: str = Field(..., min_length=2, max_length=3000, description="Texte avec balises de style")
    voice_id: str = Field(default="voice_dz_amine", description="ID de la voix")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.5, le=1.5)
    points_cost: int = Field(default=20, description="Coût standard par génération")

# ---------------------------------------------------------------------------
# Service Moteur TTS avec Streaming & Retries
# ---------------------------------------------------------------------------
async def generate_speech_stream(
    text: str,
    voice_id: str,
    speed: float,
    pitch: float,
    max_retries: int = 3
) -> AsyncGenerator[bytes, None]:
    """
    Appelle le moteur d'inférence avec streaming activé.
    Gère les retries automatiques si des tokens inattendus surviennent.
    """
    attempt = 0
    while attempt < max_retries:
        attempt += 1
        try:
            # Simulation / Appel d'inférence en streaming réel
            # En production: httpx.AsyncClient().stream("POST", url, json={...})
            chunk_size = 4096
            
            # En-tête WAV 44.1kHz 16-bit mono
            yield b"RIFF" + (36 + 44100 * 2).to_bytes(4, "little") + b"WAVEfmt "
            yield (16).to_bytes(4, "little") + (1).to_bytes(2, "little") + (1).to_bytes(2, "little")
            yield (44100).to_bytes(4, "little") + (88200).to_bytes(4, "little")
            yield (2).to_bytes(2, "little") + (16).to_bytes(2, "little") + b"data"
            yield (44100 * 2).to_bytes(4, "little")

            # Stream progressif de paquets audio PCM avec faible latence (TTFB < 150ms)
            for chunk_idx in range(25):
                await asyncio.sleep(0.04) # Simule le streaming de synthèse en direct
                # Génération de samples audio modulés
                pcm_chunk = bytes([((chunk_idx * 17) % 256) for _ in range(chunk_size)])
                yield pcm_chunk

            # Si le flux s'est terminé sans encombre, on quitte la boucle de retry
            return

        except Exception as exc:
            if attempt >= max_retries:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Échec du moteur vocal après {max_retries} tentatives: {str(exc)}"
                )
            await asyncio.sleep(0.2 * (2 ** attempt)) # Backoff exponentiel

# ---------------------------------------------------------------------------
# Route 1 : POST /api/v1/tts/generate (Streaming & Déduction Atomique)
# ---------------------------------------------------------------------------
@app.post("/api/v1/tts/generate")
async def generate_tts(req: TTSGenerationRequest):
    """
    1. Vérifie et déduit de manière atomique les points de l'utilisateur.
    2. Si solde insuffisant, renvoie HTTP 402 (Payment Required).
    3. Lance le flux audio en streaming avec StreamingResponse (audio/wav).
    4. Enregistre l'historique de génération en tâche d'arrière-plan.
    """
    # 1. Déduction atomique via la procédure stockée PostgreSQL
    rpc_result = supabase.rpc(
        "deduct_user_credits",
        {"p_user_id": req.user_id, "p_points_cost": req.points_cost}
    ).execute()

    res_data = rpc_result.data
    if not res_data or not res_data.get("success"):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "message": "Solde de points insuffisant pour cette génération.",
                "required_points": req.points_cost,
                "current_balance": res_data.get("current_balance", 0) if res_data else 0,
                "recharge_url": "/dashboard/billing"
            }
        )

    # 2. Création de l'enregistrement dans la table generations
    try:
        supabase.table("generations").insert({
            "user_id": req.user_id,
            "text_prompt": req.text,
            "voice_id": req.voice_id,
            "points_cost": req.points_cost,
            "latency_ms": 135
        }).execute()
    except Exception as e:
        print(f"[Warning] Erreur logging génération: {e}")

    # 3. Retour du flux audio en streaming (audio/wav)
    return StreamingResponse(
        generate_speech_stream(req.text, req.voice_id, req.speed, req.pitch),
        media_type="audio/wav",
        headers={
            "X-Points-Deducted": str(req.points_cost),
            "X-Remaining-Balance": str(res_data.get("new_balance")),
            "Cache-Control": "no-cache",
            "Transfer-Encoding": "chunked"
        }
    )

# ---------------------------------------------------------------------------
# Route 2 : POST /api/v1/webhooks/chargily (Paiement Sécurisé Edahabia / CIB)
# ---------------------------------------------------------------------------
@app.post("/api/v1/webhooks/chargily")
async def handle_payment_webhook(
    request: Request,
    signature: Optional[str] = Header(None, alias="Signature")
):
    """
    Webhook sécurisé recevant la notification de paiement CIB / Edahabia.
    Vérifie la signature cryptographique HMAC-SHA256 pour garantir l'authenticité.
    Crédite instantanément le compte de l'utilisateur sans race condition.
    """
    if not signature:
        raise HTTPException(status_code=400, detail="Signature header manquant")

    raw_body = await request.body()

    # 1. Vérification cryptographique HMAC-SHA256
    computed_signature = hmac.new(
        key=CHARGILY_APP_SECRET.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, signature):
        raise HTTPException(status_code=403, detail="Signature HMAC invalide. Requête rejetée.")

    # 2. Parsing du payload JSON
    payload = json.loads(raw_body)
    event_type = payload.get("event")

    # Si la facture est payée avec succès (CIB ou Edahabia)
    if event_type == "invoice.paid":
        invoice = payload.get("data", {})
        metadata = invoice.get("metadata", {})
        
        user_id = metadata.get("user_id")
        points_to_add = int(metadata.get("points", 100))
        amount_dzd = float(invoice.get("amount", 500.0))
        invoice_id = str(invoice.get("id"))
        payment_method = invoice.get("payment_method", "edahabia")

        if not user_id:
            raise HTTPException(status_code=422, detail="user_id manquant dans les métadonnées")

        # 3. Crédit atomique du solde en base de données
        credit_result = supabase.rpc(
            "credit_user_account",
            {
                "p_user_id": user_id,
                "p_invoice_id": invoice_id,
                "p_points": points_to_add,
                "p_amount_dzd": amount_dzd,
                "p_payment_method": payment_method
            }
        ).execute()

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Paiement validé avec succès. Points crédités.",
                "details": credit_result.data
            }
        )

    return JSONResponse(status_code=200, content={"status": "ignored", "event": event_type})
`;

export const FRONTEND_NEXTJS_CODE = `// =========================================================================
// SAWTIFY FRONTEND - Composant Next.js 14/15 (App Router) + Tailwind CSS
// Interface de Génération TTS Pay-as-you-go avec Déduction de Points
// =========================================================================

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, Volume2, Sparkles, AlertCircle, CreditCard, Loader2 } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  dialect: string;
  gender: string;
}

const VOICES: Voice[] = [
  { id: "voice_dz_amine", name: "Amine", dialect: "Derja Algéroise (Chaleureux)", gender: "Homme" },
  { id: "voice_dz_yasmine", name: "Yasmine", dialect: "Derja Oranaise (Énergique)", gender: "Femme" },
  { id: "voice_ar_sofiane", name: "Sofiane", dialect: "Arabe Fusha (Corporate)", gender: "Homme" },
  { id: "voice_fr_ines", name: "Inès", dialect: "Français Maghrébin (Pro)", gender: "Femme" },
];

const STYLE_TAGS = ["[whispers]", "[excited]", "[calm]", "[dramatic]", "[fast]", "[breathing]"];

export default function TTSGenerationDashboard() {
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("voice_dz_amine");
  const [pointsBalance, setPointsBalance] = useState(120); // Solde utilisateur
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [ttfbLatency, setTtfbLatency] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const POINTS_PER_GENERATION = 20;

  // Insérer une balise de style à la position courante du curseur
  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newText = text.substring(0, start) + " " + tag + " " + text.substring(end);
    setText(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 10);
  };

  // Gestionnaire de génération TTS avec déduction de points
  const handleGenerate = async () => {
    if (!text.trim()) return;

    // 1. Vérification préventive du solde côté client
    if (pointsBalance < POINTS_PER_GENERATION) {
      setShowLowBalanceModal(true);
      return;
    }

    setIsGenerating(true);
    const startTimestamp = performance.now();

    try {
      // Appel vers le backend FastAPI
      const response = await fetch("/api/v1/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "usr_algeria_123",
          text: text,
          voice_id: selectedVoice,
          points_cost: POINTS_PER_GENERATION
        })
      });

      if (response.status === 402) {
        setShowLowBalanceModal(true);
        setIsGenerating(false);
        return;
      }

      if (!response.ok) throw new Error("Erreur de génération du moteur");

      // Calcul de la latence au premier chunk (Time To First Byte)
      setTtfbLatency(Math.round(performance.now() - startTimestamp));

      // Réception du flux audio en streaming
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Déduction immédiate des points en temps réel
      setPointsBalance(prev => Math.max(0, prev - POINTS_PER_GENERATION));

      // Lecture automatique
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);

    } catch (error) {
      console.error("Erreur TTS:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* En-tête avec Solde de Points */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Studio Vocal Sawtify</h1>
          <p className="text-sm text-gray-500">Générez des voix réalistes avec déduction Pay-as-you-go</p>
        </div>
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <div className="text-right">
            <span className="text-xs text-amber-700 block font-medium">Solde actuel</span>
            <span className="text-lg font-extrabold text-amber-900">{pointsBalance} points</span>
          </div>
        </div>
      </div>

      {/* Alerte Solde Insuffisant */}
      {pointsBalance < POINTS_PER_GENERATION && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm text-rose-800">
              Solde insuffisant pour générer. Il vous reste <strong>{pointsBalance} points</strong> (20 points requis).
            </p>
          </div>
          <button 
            onClick={() => alert("Ouvrir la modale d'achat de pack 500 DA / 1000 DA")}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
          >
            Recharger en Dinars (DA)
          </button>
        </div>
      )}

      {/* Sélecteur de Voix */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Choisir une voix</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VOICES.map(voice => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={\`p-3 text-left rounded-xl border transition \${
                selectedVoice === voice.id 
                  ? "border-purple-600 bg-purple-50/50 shadow-sm" 
                  : "border-gray-200 hover:border-gray-300"
              }\`}
            >
              <span className="block font-bold text-gray-900">{voice.name}</span>
              <span className="block text-xs text-gray-500 mt-1">{voice.dialect}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Barre d'insertion des Balises de Style */}
      <div>
        <span className="block text-xs font-medium text-gray-500 mb-1.5">Balises d'intonation et émotions :</span>
        <div className="flex flex-wrap gap-2">
          {STYLE_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(tag)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono px-2.5 py-1 rounded-md"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Zone de saisie du texte */}
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Écrivez ou collez votre texte ici... Utilisez les balises [whispers] ou [excited] pour moduler le ton."
          className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{text.length} caractères</span>
          <span>Coût : <strong className="text-gray-700">20 points</strong> (~100 DA équivalent)</span>
        </div>
      </div>

      {/* Bouton de génération */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !text.trim()}
        className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Synthèse en cours (Streaming audio...)...
          </>
        ) : (
          <>
            <Volume2 className="w-5 h-5" />
            Générer la voix (Déduire 20 points)
          </>
        )}
      </button>

      {/* Lecteur Audio Intégré & Téléchargement .wav */}
      {audioUrl && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Audio généré prêt</span>
            {ttfbLatency && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-mono">
                TTFB: {ttfbLatency}ms
              </span>
            )}
          </div>
          
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="w-full" controls />

          <div className="flex justify-end pt-2">
            <a
              href={audioUrl}
              download="sawtify_vocal.wav"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-black transition"
            >
              <Download className="w-4 h-4" />
              Télécharger le fichier .WAV
            </a>
          </div>
        </div>
      )}
    </div>
  );
}`;
