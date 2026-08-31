export type SoundNotificationEvent = {
  key: string;
  message: string;
  announceOnEnable?: boolean;
};

export function soundEventKeys(events: SoundNotificationEvent[]) {
  return events.map((event) => event.key);
}

export function unseenSoundEvents(previousIds: Iterable<string>, events: SoundNotificationEvent[]) {
  const seen = new Set(previousIds);
  return events.filter((event) => !seen.has(event.key));
}

export function mergeSoundEventKeys(previousIds: Iterable<string>, events: SoundNotificationEvent[]) {
  return [...new Set([...previousIds, ...soundEventKeys(events)])];
}

export function playNotificationTone() {
  if (typeof window === "undefined") return false;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return false;
  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
    oscillator.onended = () => void context.close();
    return true;
  } catch {
    return false;
  }
}
