/** Freundliche Stimme über die Sprachausgabe des Geräts (Deutsch). */
let enabled = true;
let voice: SpeechSynthesisVoice | null = null;

export function setVoiceEnabled(on: boolean): void {
  enabled = on;
  if (!on) stopSpeaking();
}

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('de'));
  const nice = ['Anna', 'Petra', 'Helena', 'Google Deutsch', 'Marlene', 'Vicki'];
  return voices.find((v) => nice.some((n) => v.name.includes(n))) ?? voices[0] ?? null;
}

export function voiceAvailable(): boolean {
  return !!synth();
}

export function speak(text: string, { interrupt = true }: { interrupt?: boolean } = {}): void {
  const s = synth();
  if (!enabled || !s || !text) return;
  if (!voice) voice = pickVoice();
  if (interrupt) s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 1.15;
  s.speak(u);
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = pickVoice();
  });
}
