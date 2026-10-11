# Sawtify Gateway Android relay

This is the source scaffold for the lightweight Android/SIM relay. The Android side accepts short-lived pairing JSON from the merchant dashboard, stores its device credential with AndroidX encrypted preferences, keeps a foreground notification while connected, reports device-derived telemetry, and executes only server-issued, expiring JSON commands.

## Build

Requirements: JDK 17, Android SDK Platform 35, Android Gradle Plugin 8.7.3, and a release signing configuration managed outside this repository.

```sh
cd android
# Use an installed Gradle 8.9+ distribution, or add a standard Gradle wrapper.
gradle :app:assembleDebug
gradle :app:assembleRelease
```

A production APK must be signed through the release pipeline and installed at:

```text
downloads/sawtify-gateway.apk
```

The signed APK is intentionally not committed. The backend serves `/downloads/sawtify-gateway.apk` only when that real file exists; otherwise it returns 404 and the dashboard disables the download button. No demo or placeholder APK is generated.

## Pairing and relay protocol

Apply `supabase/agent_sawtify_gateway.sql` manually before enabling the dashboard; no remote schema has been changed from this workspace.

- The dashboard creates a five-minute, one-use QR token. Supabase stores only its SHA-256 hash.
- The Android app claims the token over WSS. The server returns a unique `swt_gw_…` device key once; the app encrypts it locally, while Supabase stores only its hash and a lookup prefix.
- A reconnect authenticates with that key. The Android app does not hold store logic, prompts, customer/order policy, or command-generation logic.
- Device telemetry is sampled locally and posted over the persistent WebSocket. SIM identifiers, phone numbers, call audio, and SMS contents are not included in telemetry. Incoming SMS events contain metadata only.
- SMS jobs can only be created server-side for an existing, confirmed customer request, with explicit consent and an audit reference; rate limits and idempotency are enforced by the API. The native call command handler is scaffolded, but the backend deliberately rejects outgoing GSM calls until a real server-side Live-audio bridge exists.

## Important Android/telephony limitations

- This source has not been built, signed, installed, or exercised with a physical SIM in this environment.
- Android/OEM/carrier APIs differ. Per-SIM outgoing call routing depends on the device's `PhoneAccountHandle` mapping; if a selected SIM cannot be resolved, the app fails the job rather than silently using another SIM. SMS routing uses the selected subscription when the platform exposes it.
- The PCM component uses `AudioRecord` microphone input at 16 kHz and `AudioTrack` output at 24 kHz. It does not use privileged `VOICE_CALL` capture. Most ordinary Android apps cannot record both cellular call uplink and downlink; acoustic microphone capture is not equivalent to a reliable two-way GSM audio bridge.
- Therefore, an AI conversation over a cellular call is **not production-ready** until a server-side Live-audio session bridge is connected to this PCM transport and the intended devices/carriers are validated. The merchant UI/API must not treat a telephony call by itself as an AI voice session.
- Sending SMS and placing calls require user-granted Android permissions, carrier service, and compliance with applicable laws and platform policies. The app never answers incoming calls automatically and never uploads incoming SMS content.
