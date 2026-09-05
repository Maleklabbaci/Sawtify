import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
// @ts-ignore
import * as lamejsModule from 'lamejs';

const lamejs = (lamejsModule as any).default || lamejsModule;

export interface ConversionResult {
  mp3Blob: Blob;
  mp3Url: string;
  wavSize: number;
  mp3Size: number;
  compressionRatio: number; // percentage, e.g. 75 means 75% smaller
  engineUsed: 'ffmpeg.wasm' | 'lamejs-fallback';
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

/**
 * Initializes and loads ffmpeg.wasm with fallback URLs.
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (ffmpegLoadingPromise) {
    return ffmpegLoadingPromise;
  }

  ffmpegLoadingPromise = (async () => {
    const ffmpeg = new FFmpeg();

    // Load ffmpeg-core from unpkg CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadingPromise;
}

/**
 * Encodes an AudioBuffer or raw WAV arrayBuffer into MP3 using lamejs.
 * Ultra-fast, reliable in all browser sandboxes (including iframes without COOP/COEP).
 */
async function convertWavToMp3WithLame(wavBlob: Blob): Promise<Blob> {
  const arrayBuffer = await wavBlob.arrayBuffer();
  
  // Use AudioContext to decode WAV PCM
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128); // 128 kbps
  
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152;
  
  // Extract channels
  const leftFloat = audioBuffer.getChannelData(0);
  const leftInt = new Int16Array(leftFloat.length);
  for (let i = 0; i < leftFloat.length; i++) {
    const s = Math.max(-1, Math.min(1, leftFloat[i]));
    leftInt[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  if (channels === 1) {
    for (let i = 0; i < leftInt.length; i += sampleBlockSize) {
      const chunk = leftInt.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }
  } else {
    const rightFloat = audioBuffer.getChannelData(1);
    const rightInt = new Int16Array(rightFloat.length);
    for (let i = 0; i < rightFloat.length; i++) {
      const s = Math.max(-1, Math.min(1, rightFloat[i]));
      rightInt[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    for (let i = 0; i < leftInt.length; i += sampleBlockSize) {
      const chunkL = leftInt.subarray(i, i + sampleBlockSize);
      const chunkR = rightInt.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunkL, chunkR);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  audioCtx.close().catch(() => {});
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

/**
 * Converts a WAV Blob into an MP3 Blob on the client side.
 * First tries `ffmpeg.wasm` as requested, and gracefully falls back to client-side encoder.
 */
export async function convertWavToMp3(
  wavBlob: Blob,
  onProgress?: (status: string) => void
): Promise<ConversionResult> {
  const wavSize = wavBlob.size;
  let mp3Blob: Blob | null = null;
  let engineUsed: 'ffmpeg.wasm' | 'lamejs-fallback' = 'ffmpeg.wasm';

  // 1. Try ffmpeg.wasm
  try {
    onProgress?.('Initialisation de ffmpeg.wasm...');
    const ffmpeg = await getFFmpeg();
    
    onProgress?.('Conversion .wav vers .mp3 (ffmpeg.wasm)...');
    const inputName = `input_${Date.now()}.wav`;
    const outputName = `output_${Date.now()}.mp3`;

    await ffmpeg.writeFile(inputName, await fetchFile(wavBlob));
    
    // Convert to MP3 with 128k bitrate for optimal size / quality ratio
    await ffmpeg.exec(['-i', inputName, '-codec:a', 'libmp3lame', '-b:a', '128k', outputName]);

    const data = await ffmpeg.readFile(outputName);
    mp3Blob = new Blob([data], { type: 'audio/mp3' });

    // Cleanup virtual memory files
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    engineUsed = 'ffmpeg.wasm';
  } catch (ffmpegErr) {
    console.warn('ffmpeg.wasm indisponible dans ce contexte navigateur, bascule automatique sur encodeur audio local:', ffmpegErr);
    
    // 2. Reliable Client-side Fallback
    onProgress?.('Compression audio MP3 en cours...');
    mp3Blob = await convertWavToMp3WithLame(wavBlob);
    engineUsed = 'lamejs-fallback';
  }

  const mp3Size = mp3Blob.size;
  const mp3Url = URL.createObjectURL(mp3Blob);
  const compressionRatio = wavSize > 0 ? Math.round(((wavSize - mp3Size) / wavSize) * 100) : 0;

  return {
    mp3Blob,
    mp3Url,
    wavSize,
    mp3Size,
    compressionRatio: Math.max(0, compressionRatio),
    engineUsed,
  };
}

/**
 * Formats bytes to human-readable size (e.g., "450 KB", "1.2 MB").
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
