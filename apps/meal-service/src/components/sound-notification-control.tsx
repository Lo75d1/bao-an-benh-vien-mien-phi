"use client";

import { BellRing, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mergeSoundEventKeys, playNotificationTone, unseenSoundEvents, type SoundNotificationEvent } from "@/lib/sound-notification";

function readStoredIds(storageKey: string) {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function storeIds(storageKey: string, ids: Iterable<string>) {
  try { sessionStorage.setItem(storageKey, JSON.stringify([...new Set(ids)])); } catch { /* Storage bị chặn không được làm hỏng trang. */ }
}

export function SoundNotificationControl({ workspace, scope, events }: { workspace: "admin" | "nurse" | "kitchen"; scope: string; events: SoundNotificationEvent[] }) {
  const activeStorageKey = `meal-service:sound:${workspace}:${scope}:read`;
  const initializedStorageKey = useRef<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const storedIds = readStoredIds(activeStorageKey);
    if (initializedStorageKey.current !== activeStorageKey) {
      initializedStorageKey.current = activeStorageKey;
      storeIds(activeStorageKey, mergeSoundEventKeys(storedIds, events));
      return;
    }
    const fresh = unseenSoundEvents(storedIds, events);
    if (!fresh.length) return;
    storeIds(activeStorageKey, mergeSoundEventKeys(storedIds, fresh));
    if (enabled) playNotificationTone();
  }, [activeStorageKey, enabled, events]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    if (next) playNotificationTone();
  }

  return <button type="button" className="sound-notification-toggle" aria-pressed={enabled} onClick={toggle}>
    {enabled ? <BellRing aria-hidden="true"/> : <BellOff aria-hidden="true"/>}
    <span>{enabled ? "Đã bật âm báo" : "Bật âm báo"}</span>
  </button>;
}
