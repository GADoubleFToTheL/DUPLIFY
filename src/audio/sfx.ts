/**
 * Geräusche – komplett synthetisch per Web Audio erzeugt (keine Audiodateien, keine Lizenzen).
 */
export type Sfx = 'klick' | 'pop' | 'whoosh' | 'fanfare' | 'boing' | 'tap' | 'sparkle';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Muss einmal nach einer Berührung aufgerufen werden (iOS gibt Ton erst dann frei). */
export function unlockAudio(): void {
  const a = audio();
  if (a && a.state === 'suspended') void a.resume();
}

function tone(
  a: AudioContext,
  { freq, to, start = 0, dur = 0.15, type = 'sine', gain = 0.25 }: { freq: number; to?: number; start?: number; dur?: number; type?: OscillatorType; gain?: number },
) {
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(a: AudioContext, { start = 0, dur = 0.08, gain = 0.2, freq = 2000, q = 1, sweepTo }: { start?: number; dur?: number; gain?: number; freq?: number; q?: number; sweepTo?: number }) {
  const t0 = a.currentTime + start;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

export function play(name: Sfx): void {
  if (!enabled) return;
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') void a.resume();
  switch (name) {
    case 'klick':
      noise(a, { dur: 0.05, gain: 0.5, freq: 3200, q: 2 });
      tone(a, { freq: 900, to: 500, dur: 0.07, type: 'triangle', gain: 0.25 });
      tone(a, { freq: 1500, to: 1300, start: 0.03, dur: 0.05, type: 'sine', gain: 0.12 });
      break;
    case 'pop':
      tone(a, { freq: 520, to: 980, dur: 0.1, type: 'sine', gain: 0.22 });
      break;
    case 'tap':
      tone(a, { freq: 700, to: 600, dur: 0.06, type: 'triangle', gain: 0.15 });
      break;
    case 'whoosh':
      noise(a, { dur: 0.6, gain: 0.35, freq: 400, q: 0.8, sweepTo: 2400 });
      break;
    case 'boing':
      tone(a, { freq: 180, to: 520, dur: 0.35, type: 'triangle', gain: 0.25 });
      break;
    case 'sparkle':
      [1320, 1760, 2093].forEach((f, i) => tone(a, { freq: f, start: i * 0.06, dur: 0.18, gain: 0.08 }));
      break;
    case 'fanfare': {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => tone(a, { freq: f, start: i * 0.13, dur: 0.22, type: 'square', gain: 0.07 }));
      tone(a, { freq: 1047, start: 0.52, dur: 0.6, type: 'triangle', gain: 0.18 });
      tone(a, { freq: 784, start: 0.52, dur: 0.6, type: 'triangle', gain: 0.12 });
      tone(a, { freq: 659, start: 0.52, dur: 0.6, type: 'triangle', gain: 0.1 });
      break;
    }
  }
}
