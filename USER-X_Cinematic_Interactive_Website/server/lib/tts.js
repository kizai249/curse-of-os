'use strict';
/*
 * Optional natural voice for Nuqta through ElevenLabs text-to-speech.
 * Enabled only when ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are set on the server.
 * Without it the browser falls back to the Web Speech API voice.
 * Endpoint per ElevenLabs public docs (POST /v1/text-to-speech/{voice_id}, header xi-api-key);
 * verify against the current docs and your plan before going live.
 */
const MAX_TTS_CHARS = 400;

function makeTTS({ apiKey, voiceId, fetchImpl = globalThis.fetch }) {
  const enabled = Boolean(apiKey && voiceId);
  return {
    enabled,
    async speak(text) {
      if (!enabled) throw Object.assign(new Error('TTS not configured'), { code: 'TTS_DISABLED' });
      const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TTS_CHARS);
      if (!clean) throw Object.assign(new Error('empty text'), { status: 400 });
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20_000);
      try {
        const res = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
          method: 'POST',
          headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: clean, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.45 } }),
          signal: ctrl.signal
        });
        if (!res.ok) throw Object.assign(new Error(`TTS provider HTTP ${res.status}`), { code: 'TTS_UPSTREAM' });
        return Buffer.from(await res.arrayBuffer());
      } finally {
        clearTimeout(t);
      }
    }
  };
}

module.exports = { makeTTS, MAX_TTS_CHARS };
