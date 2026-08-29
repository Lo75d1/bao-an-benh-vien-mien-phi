export type VoiceNotificationEvent = {
  key: string;
  message: string;
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

export function speakVietnamese(messages: string | string[]) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return false;
  try {
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("vi"));
    for (const message of typeof messages === "string" ? [messages] : messages) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "vi-VN";
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
    return true;
  } catch {
    return false;
  }
}
