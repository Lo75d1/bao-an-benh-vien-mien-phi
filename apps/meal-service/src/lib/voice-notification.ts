export type OperationalVoiceEvent = {
  id: string;
  scope: "NORMAL" | "SONDE";
};

export function voiceEventKeys(events: OperationalVoiceEvent[]) {
  return events.map((event) => `${event.scope}:${event.id}`);
}

export function unseenVoiceEvents(previousIds: Iterable<string>, events: OperationalVoiceEvent[]) {
  const seen = new Set(previousIds);
  return events.filter((event) => !seen.has(`${event.scope}:${event.id}`));
}

export function speakVietnamese(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return false;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("vi"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
