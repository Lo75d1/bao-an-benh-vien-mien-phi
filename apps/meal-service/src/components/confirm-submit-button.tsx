"use client";

import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Language } from "@/lib/i18n";

export function ConfirmSubmitButton({ children, title, description, name, value, disabled, destructive = false, formAction, language = "vi" }: { children: React.ReactNode; title: string; description: string; name?: string; value?: string; disabled?: boolean; destructive?: boolean; formAction?: (data: FormData) => void; language?: Language }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const submitter = useRef<HTMLButtonElement>(null);
  return <>
    <Button ref={trigger} type="button" variant={destructive ? "destructive" : "default"} disabled={disabled} onClick={() => setOpen(true)}>{children}</Button>
    <button ref={submitter} type="submit" formAction={formAction} name={name} value={value} hidden tabIndex={-1}/>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent language={language}><DialogHeader><DialogTitle className="confirm-title"><AlertTriangle aria-hidden="true"/> {title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{language === "en" ? "Go back" : "Quay lại"}</Button><Button type="button" variant={destructive ? "destructive" : "default"} onClick={() => { const form = trigger.current?.form; if (!form) return; setOpen(false); form.requestSubmit(submitter.current ?? undefined); }}>{children}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
