# Sigma AI Assistant 0.2.0

Personal WhatsApp assistant for Android 9+: rule replies plus an opt-in AI assistant
mode that converses, gathers details and files owner summaries. Backend: Cloudflare
Workers + Durable Objects (cloudflare/), provider adapters (server/), Android app
(app/), management panel (web/, also bundled in the APK).

- Build: `ANDROID_HOME=<sdk with platform 35 + build-tools 35.0.0> ./build-android.sh`, then sign the aligned APK with your own keystore (apksigner). Never commit keystores, passwords or provider keys.
- Backend tests: `cd cloudflare && node --test` and `cd server && node --test`.
- Provider keys live only in hosting secrets. AI is disabled until the owner sets AI_ENABLED=true, AI_PROVIDER and the provider key.
