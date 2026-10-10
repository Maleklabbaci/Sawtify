import {
  GoogleGenAI,
  type FunctionCall,
  type LiveConnectConfig,
  type LiveServerMessage,
  type Session,
} from '@google/genai';

export type AgentLiveCallbacks = {
  onInputTranscription: (text: string) => void;
  onOutputTranscription: (text: string) => void;
  onSpeaking: (speaking: boolean) => void;
  onTurnComplete: () => void;
  onToolCall: (call: FunctionCall) => Promise<Record<string, unknown> | null>;
  onError: () => void;
  onClose: () => void;
};

export type AgentLiveSession = {
  sendText: (text: string) => void;
  close: () => void;
};

type ConnectOptions = {
  token: string;
  model: string;
  config: LiveConnectConfig;
  microphone: MediaStream;
  audioContext?: AudioContext;
  callbacks: AgentLiveCallbacks;
};

const INPUT_SAMPLE_RATE = 16_000;
const FALLBACK_OUTPUT_SAMPLE_RATE = 24_000;

function resampleToPcm16(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === INPUT_SAMPLE_RATE) {
    const sameRate = new Int16Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, input[index]));
      sameRate[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return sameRate;
  }

  const ratio = inputSampleRate / INPUT_SAMPLE_RATE;
  const output = new Int16Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let total = 0;
    let count = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      total += input[sampleIndex];
      count += 1;
    }
    const sample = Math.max(-1, Math.min(1, count ? total / count : 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodePcm16(base64: string): Int16Array {
  const bytes = base64ToBytes(base64);
  const sampleCount = Math.floor(bytes.length / 2);
  const samples = new Int16Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const value = bytes[index * 2] | (bytes[index * 2 + 1] << 8);
    samples[index] = value > 0x7fff ? value - 0x10000 : value;
  }
  return samples;
}

function getSampleRate(mimeType: string | undefined): number {
  const rate = mimeType?.match(/rate=(\d+)/i)?.[1];
  const parsed = Number(rate);
  return Number.isFinite(parsed) && parsed >= 8_000 && parsed <= 96_000
    ? parsed
    : FALLBACK_OUTPUT_SAMPLE_RATE;
}

export async function connectAgentLive(options: ConnectOptions): Promise<AgentLiveSession> {
  const { token, model, config, microphone, callbacks } = options;
  const audioContext = options.audioContext || new AudioContext();
  const scheduledSources = new Set<AudioBufferSourceNode>();
  let session: Session | null = null;
  let microphoneSource: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silentGain: GainNode | null = null;
  let nextPlaybackTime = audioContext.currentTime;
  let closed = false;
  let turnComplete = false;

  const stopPlayback = () => {
    scheduledSources.forEach((source) => {
      try { source.stop(); } catch { /* Source may already have ended. */ }
      try { source.disconnect(); } catch { /* Ignore closed audio nodes. */ }
    });
    scheduledSources.clear();
    nextPlaybackTime = audioContext.currentTime;
    callbacks.onSpeaking(false);
  };

  const cleanupAudio = () => {
    closed = true;
    if (processor) {
      processor.onaudioprocess = null;
      try { processor.disconnect(); } catch { /* Ignore closed audio nodes. */ }
    }
    try { microphoneSource?.disconnect(); } catch { /* Ignore closed audio nodes. */ }
    try { silentGain?.disconnect(); } catch { /* Ignore closed audio nodes. */ }
    microphone.getTracks().forEach((track) => track.stop());
    stopPlayback();
    if (audioContext.state !== 'closed') void audioContext.close().catch(() => undefined);
  };

  const playPcm = (base64: string, mimeType?: string) => {
    if (closed || !base64 || audioContext.state === 'closed') return;
    try {
      const samples = decodePcm16(base64);
      if (!samples.length) return;
      const buffer = audioContext.createBuffer(1, samples.length, getSampleRate(mimeType));
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 0x8000;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      const startAt = Math.max(nextPlaybackTime, audioContext.currentTime + 0.015);
      source.onended = () => {
        scheduledSources.delete(source);
        try { source.disconnect(); } catch { /* Ignore closed audio nodes. */ }
        if (turnComplete && scheduledSources.size === 0) callbacks.onSpeaking(false);
      };
      scheduledSources.add(source);
      source.start(startAt);
      nextPlaybackTime = startAt + buffer.duration;
      callbacks.onSpeaking(true);
      turnComplete = false;
    } catch {
      callbacks.onError();
    }
  };

  const handleToolCalls = async (calls: FunctionCall[]) => {
    if (!session || closed) return;
    const responses: Array<{ id?: string; name?: string; response: Record<string, unknown> }> = [];
    for (const call of calls) {
      if (!call.name) continue;
      const response = await callbacks.onToolCall(call);
      if (response === null || closed || !session) return;
      responses.push({ id: call.id, name: call.name, response });
    }
    if (!closed && session && responses.length) session.sendToolResponse({ functionResponses: responses });
  };

  try {
    await audioContext.resume();
    const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1beta' } });
    session = await ai.live.connect({
      model,
      config,
      callbacks: {
        onopen: () => undefined,
        onmessage: (message: LiveServerMessage) => {
          if (closed) return;
          const content = message.serverContent;
          const inputText = content?.inputTranscription?.text || content?.interimInputTranscription?.text;
          if (inputText) callbacks.onInputTranscription(inputText);
          const outputText = content?.outputTranscription?.text;
          if (outputText) callbacks.onOutputTranscription(outputText);

          if (content?.interrupted) stopPlayback();
          for (const part of content?.modelTurn?.parts || []) {
            if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
              playPcm(part.inlineData.data, part.inlineData.mimeType);
            }
          }
          if (content?.turnComplete) {
            turnComplete = true;
            callbacks.onTurnComplete();
            if (scheduledSources.size === 0) callbacks.onSpeaking(false);
          }
          const calls = message.toolCall?.functionCalls;
          if (calls?.length) void handleToolCalls(calls);
        },
        onerror: () => callbacks.onError(),
        onclose: () => callbacks.onClose(),
      },
    });

    microphoneSource = audioContext.createMediaStreamSource(microphone);
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    processor.onaudioprocess = (event) => {
      if (closed || !session) return;
      const input = event.inputBuffer.getChannelData(0);
      const pcm = resampleToPcm16(input, audioContext.sampleRate);
      if (pcm.length) {
        session.sendRealtimeInput({
          audio: { data: pcmToBase64(pcm), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
        });
      }
      event.outputBuffer.getChannelData(0).fill(0);
    };
    microphoneSource.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    return {
      sendText: (text: string) => {
        if (closed || !session || !text.trim()) return;
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: text.trim() }] }],
          turnComplete: true,
        });
      },
      close: () => {
        if (closed) return;
        cleanupAudio();
        try { session?.close(); } catch { /* Connection may already be closed. */ }
      },
    };
  } catch (error) {
    cleanupAudio();
    try { session?.close(); } catch { /* Connection may already be closed. */ }
    callbacks.onError();
    throw error;
  }
}
