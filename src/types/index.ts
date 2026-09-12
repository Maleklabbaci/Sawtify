export interface Voice {
  id: string;
  name: string;
  geminiVoice?: string;
  locale: string;
  dialect: string;
  gender: 'male' | 'female';
  icon: string;
  category: 'commercial' | 'narrative' | 'social' | 'formal';
  sampleText: string;
  sampleAudioUrl?: string;
  badge?: string;
  styles: string[];
  /** Extrait audio fixe (déjà enregistré) — évite un appel API à chaque écoute d'aperçu. */
  sampleAudioUrl?: string;
}

export interface CreditPack {
  id: string;
  name: string;
  points: number;
  priceDZD: number;
  bonusPercent?: number;
  isPopular?: boolean;
  tagline: string;
}

export interface GenerationRecord {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
  pointsDeducted: number;
  durationSec: number;
  latencyMs: number;
  createdAt: string;
  audioUrl?: string;
  wavBlob?: Blob;
  mp3Blob?: Blob;
  mp3Url?: string;
  wavSize?: number;
  mp3Size?: number;
  compressionRatio?: number;
}

export interface PurchaseRecord {
  id: string;
  packId: string;
  packName: string;
  pointsCredited: number;
  amountDZD: number;
  paymentMethod: 'edahabia' | 'cib';
  transactionId: string;
  status: 'paid' | 'pending' | 'failed';
  createdAt: string;
}

export interface UserCredits {
  balance: number;
  totalGenerated: number;
  totalPurchasedPoints: number;
  lastUpdated: string;
}
