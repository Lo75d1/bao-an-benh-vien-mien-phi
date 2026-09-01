"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTranslations, readClientLocale } from "@/lib/locale";

export function PhaseTransitionNotice({ scope, mealName, phase }: { scope: string; mealName: string; phase: string }) {
  const t = getTranslations(readClientLocale()).management.phaseTransition;
  const labels: Record<string, string> = { BEFORE_CUTOFF: t.BEFORE_CUTOFF, PREPARING: t.PREPARING, SERVING: t.SERVING, PASSED: t.PASSED };
  const [previous, setPrevious] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = `meal-phase:${scope}`;
    const stored = sessionStorage.getItem(key);
    sessionStorage.setItem(key, `${mealName}:${phase}`);
    if (stored && stored !== `${mealName}:${phase}`) { const timer = window.setTimeout(() => { setPrevious(stored.split(":").at(-1) ?? null); setOpen(true); }, 0); return () => window.clearTimeout(timer); }
  }, [mealName, phase, scope]);
  const title = t.title.replace("{phase}", labels[phase] ?? t.newPhase);
  const previousText = previous ? t.previousEnded.replace("{phase}", labels[previous] ?? t.previousPhase) : "";
  const description = `${previousText}${t.description.replace("{meal}", mealName)}`;
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><button type="button" className="primary-action" onClick={() => setOpen(false)}>{t.confirm}</button></DialogContent></Dialog>;
}
