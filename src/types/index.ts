export interface Voice {
  id: string;
  name: string;
  geminiVoice?: string;
  locale: string;
  dialect: string;
  /**
   * « unknown » = genre non publié par Google. On refuse de deviner :
   * il se renseigne après écoute (npm run apercus:voix).
   */
  gender: 'male' | 'female' | 'unknown';
  icon: string;
  category: 'commercial' | 'narrative' | 'social' | 'formal';
  sampleText: string;
  sampleAudioUrl?: string;
  badge?: string;
  styles: string[];
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
