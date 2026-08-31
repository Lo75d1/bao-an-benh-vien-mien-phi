export type VoiceNotificationEvent = {
  key: string;
  message: string;
  announceOnEnable?: boolean;
};

export function voiceEventKeys(events: VoiceNotificationEvent[]) {
  return events.map((event) => event.key);
}

export function unseenVoiceEvents(previousIds: Iterable<string>, events: VoiceNotificationEvent[]) {
  const seen = new Set(previousIds);
  return events.filter((event) => !seen.has(event.key));
}

export function mergeVoiceEventKeys(previousIds: Iterable<string>, events: VoiceNotificationEvent[]) {
  return [...new Set([...previousIds, ...voiceEventKeys(events)])];
}

type AlertAudioContext = {
  currentTime: number;
  createOscillator: () => {
    type: OscillatorType;
    frequency: { value: number };
    connect: (node: unknown) => void;
    start: (when?: number) => void;
    stop: (when?: number) => void;
  };
  createGain: () => {
    gain: { value: number; linearRampToValueAtTime: (value: number, time: number) => void };
    connect: (node: unknown) => void;
  };
  destination: unknown;
  close?: () => Promise<void> | void;
  resume?: () => Promise<void> | void;
};

function getAlertAudioContext() {
  if (typeof window === "undefined") return null;
  const globalWindow = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const AudioContextCtor = globalWindow.AudioContext ?? globalWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;
  try {
    return new AudioContextCtor() as unknown as AlertAudioContext;
  } catch {
    return null;
  }
}

export async function playAlertSound() {
  const context = getAlertAudioContext();
  if (!context) return false;
  try {
    if (context.resume) await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const start = context.currentTime + 0.01;
    const stop = start + 0.12;
    gain.gain.linearRampToValueAtTime(0.04, start + 0.01);
    gain.gain.linearRampToValueAtTime(0.0001, stop);
    oscillator.start(start);
    oscillator.stop(stop);
    if (context.close) globalThis.setTimeout(() => { void Promise.resolve(context.close?.()).catch(() => undefined); }, 250);
    return true;
  } catch {
    try { await Promise.resolve(context.close?.()); } catch { /* beep blocked or unsupported */ }
    return false;
  }
}
