Sawtify Agent voice + navigation update
Date: 2026-10-11

Changed paths (copy these into the repository at the same relative paths):
- server.ts
- docs/SAWTIFY-V5-LIVECALL.md
- src/App.tsx
- src/components/AgentCallPage.tsx
- src/components/AgentSawtifyPage.tsx
- src/components/Header.tsx
- src/components/TTSStudio.tsx
- src/services/agentLive.ts
- src/types/index.ts
- tts/engine.ts
- tts/selftest.ts

Alternative: apply sawtify-agent-voice-and-navigation.patch from the repository root with `git apply`.

Navigation change:
- Agent Sawtify replaces Developer in the main desktop navigation and mobile bottom navigation.
- The promotional Agent Sawtify card has been removed from Studio.
- The existing Agent Sawtify section bar now includes “Développement”; it contains the previous Developer page/API tools.

Voice change:
Gemini Live remains the conversation and tool-calling model. Default Live responses are text and are voiced by Sawtify TTS using the shop's selected Agent voice. French, Algerian Darija, and English registers are explicit. Native Gemini Live audio is still available by setting AGENT_LIVE_OUTPUT_MODE=gemini_live (default: sawtify_tts).

Cost guardrails:
- Maximum 700 characters per spoken reply and 4,000 generated characters per live call.
- 18 speech requests per minute per IP, the existing Gemini daily limit, and the shared TTS concurrency queue.
- Agent responses skip the general TTS intro ellipsis/filler and target concise 1–2 sentence replies.
- On Live TTS failure, the reply remains visible as text.

Validation after these changes:
- `npm run lint` passed.
- `npm run build` passed (with existing non-blocking Vite chunk warnings).
- `npm run test:tts` has the same 8 pre-existing failing assertions; the new English-register tests pass.

No database migration or API secret is included.
