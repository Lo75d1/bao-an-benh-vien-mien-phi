"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getTranslations, readClientLocale } from "@/lib/locale";
import { mergeVoiceEventKeys, speakVietnamese, unseenVoiceEvents, type VoiceNotificationEvent } from "@/lib/voice-notification";

function readStoredIds(storageKey: string) {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function storeIds(storageKey: string, ids: Iterable<string>) {
  try { sessionStorage.setItem(storageKey, JSON.stringify([...new Set(ids)])); } catch { /* Blocked storage must not break the page. */ }
}

export function VoiceNotificationControl({ workspace, scope, events }: { workspace: "admin" | "nurse" | "kitchen"; scope: string; events: VoiceNotificationEvent[] }) {
  const t = getTranslations(readClientLocale()).management.voiceNotification;
  const activeStorageKey = `meal-service:voice:${workspace}:${scope}:read`;
  const initializedStorageKey = useRef<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const storedIds = readStoredIds(activeStorageKey);
    if (initializedStorageKey.current !== activeStorageKey) {
      initializedStorageKey.current = activeStorageKey;
      storeIds(activeStorageKey, mergeVoiceEventKeys(storedIds, events));
      return;
    }
    const fresh = unseenVoiceEvents(storedIds, events);
    if (!fresh.length) return;
    storeIds(activeStorageKey, mergeVoiceEventKeys(storedIds, fresh));
    if (enabled) speakVietnamese(fresh.map((event) => event.message));
  }, [activeStorageKey, enabled, events]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    if (next) speakVietnamese([t.enabledMessage, ...events.filter((event) => event.announceOnEnable).map((event) => event.message)]);
    else if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  return <button type="button" className="voice-notification-toggle" aria-pressed={enabled} onClick={toggle}>
    {enabled ? <Volume2 aria-hidden="true"/> : <VolumeX aria-hidden="true"/>}
    <span>{enabled ? t.enabledLabel : t.disabledLabel}</span>
  </button>;
}
