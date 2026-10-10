"use strict";

function normalizeTranscript(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}
function detectLanguage(text) {
  return /[\u0600-\u06FF]/.test(text) ? "fa" : "en";
}
function createVoiceEnvelope(input) {
  const transcript = normalizeTranscript(input && input.transcript);
  if (!transcript) throw new Error("VOICE_TRANSCRIPT_REQUIRED");
  return {
    type: "voice.command.v1",
    id: input && input.id || "voice-" + Date.now(),
    transcript,
    language: input && input.language || detectLanguage(transcript),
    confidence: Number.isFinite(input && input.confidence) ? input.confidence : null,
    source: input && input.source || "browser-speech",
    createdAt: new Date().toISOString()
  };
}
function isSafeVoiceEnvelope(envelope, minimumConfidence) {
  if (!envelope || envelope.type !== "voice.command.v1" || !envelope.transcript) return false;
  if (envelope.confidence == null) return true;
  return envelope.confidence >= (minimumConfidence == null ? 0.45 : minimumConfidence);
}
function voiceToJobIntent(envelope) {
  if (!isSafeVoiceEnvelope(envelope)) throw new Error("VOICE_CONFIDENCE_TOO_LOW");
  return { kind: "natural-language-job-intent", source: "voice", text: envelope.transcript, language: envelope.language, voiceId: envelope.id };
}
module.exports = { normalizeTranscript, detectLanguage, createVoiceEnvelope, isSafeVoiceEnvelope, voiceToJobIntent };
