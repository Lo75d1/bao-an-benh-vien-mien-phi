"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { speakVietnamese, unseenVoiceEvents, voiceEventKeys, type OperationalVoiceEvent } from "@/lib/voice-notification";

const READ_KEY = "meal-service:admin-voice-read-ids";
const ANNOUNCEMENT = "Có báo bổ sung suất ăn mới. Vui lòng kiểm tra.";

function readStoredIds() {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(READ_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function storeIds(ids: Iterable<string>) {
  try { sessionStorage.setItem(READ_KEY, JSON.stringify([...new Set(ids)])); } catch { /* Storage bị chặn không được làm hỏng trang. */ }
}

export function AdminVoiceNotifications({ events }: { events: OperationalVoiceEvent[] }) {
  const initialized = useRef(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const currentKeys = voiceEventKeys(events);
    const storedIds = readStoredIds();
    if (!initialized.current) {
      initialized.current = true;
      storeIds([...storedIds, ...currentKeys]);
      return;
    }
    const fresh = unseenVoiceEvents(storedIds, events);
    if (!fresh.length) return;
    storeIds([...storedIds, ...voiceEventKeys(fresh)]);
    if (enabled) speakVietnamese(ANNOUNCEMENT);
  }, [enabled, events]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    if (next) speakVietnamese("Đã bật thông báo giọng nói.");
    else if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  return <button type="button" className="admin-voice-toggle" aria-pressed={enabled} onClick={toggle}>
    {enabled ? <Volume2 aria-hidden="true"/> : <VolumeX aria-hidden="true"/>}
    <span>{enabled ? "Đã bật giọng nói" : "Bật thông báo giọng nói"}</span>
  </button>;
}
