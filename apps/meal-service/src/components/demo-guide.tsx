"use client";

import { CheckCircle2, CircleHelp, Clock3, LoaderCircle, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionUser } from "@/lib/auth";
import {
  DEMO_TOUR_STEPS,
  type DemoTourProgress,
  type DemoTourWorkspaceProgress,
} from "@/lib/demo-tour";
import type { DemoWorkspace } from "@/lib/demo-session";
import { DEMO_TIME_PARAM, DEMO_TOUR_TIME_PARAM } from "@/lib/page-demo-time";
import { applyDemoTourMealContext } from "@/lib/demo-tour-clock";

const EMPTY_PROGRESS: DemoTourWorkspaceProgress = {
  status: "NOT_STARTED",
  step: 0,
};

type TourClock = {
  nowIso: string;
  timeLabel: string;
  mealName: string;
  stageLabel: string;
  responsibility: string;
  cutoffTime: string;
  serviceTime: string;
  route: "NORMAL" | "SONDE";
  mealEventId: string;
  dietMealId: string | null;
  mealDate: string;
};

function workspaceOf(user: SessionUser): DemoWorkspace | null {
  return user.demoWorkspace ?? null;
}

async function saveProgress(progress: DemoTourWorkspaceProgress) {
  const response = await fetch("/api/demo/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "tour", ...progress }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Không thể lưu tiến độ hướng dẫn.");
  }
}

function matchesInteraction(event: Event, selector: string) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const control = target.closest(selector);
  if (!control) return false;
  if (
    control.matches(":disabled") ||
    control.getAttribute("aria-disabled") === "true"
  )
    return false;
  if (event.type === "input" && control instanceof HTMLInputElement)
    return Number(control.value) > 0;
  if (
    event.type === "change" &&
    control instanceof HTMLInputElement &&
    control.type === "file"
  )
    return Boolean(control.files?.length);
  return true;
}

export function DemoGuide({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const workspace = workspaceOf(user);
  const steps = useMemo(
    () => (workspace ? DEMO_TOUR_STEPS[workspace] : []),
    [workspace],
  );
  const [tour, setTour] = useState<DemoTourProgress>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tourClock, setTourClock] = useState<TourClock | null>(null);
  const [clockReady, setClockReady] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const advancing = useRef(false);
  const progress = workspace
    ? (tour[workspace] ?? EMPTY_PROGRESS)
    : EMPTY_PROGRESS;
  const step =
    progress.status === "ACTIVE"
      ? steps[Math.min(progress.step, Math.max(steps.length - 1, 0))]
      : null;
  const completedCount = Object.values(tour).filter(
    (item) => item?.status === "DONE",
  ).length;

  const returnToRealTime = useCallback(() => {
    const url = new URL(window.location.href);
    const hadTourTime =
      url.searchParams.has(DEMO_TIME_PARAM) ||
      url.searchParams.has(DEMO_TOUR_TIME_PARAM);
    url.searchParams.delete(DEMO_TIME_PARAM);
    url.searchParams.delete(DEMO_TOUR_TIME_PARAM);
    setClockReady(false);
    setTourClock(null);
    if (hadTourTime)
      router.replace(`${url.pathname}${url.search}${url.hash}`, {
        scroll: false,
      });
  }, [router]);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    fetch("/api/demo/session")
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể đọc tiến độ hướng dẫn.");
        return response.json();
      })
      .then((body) => {
        if (!active) return;
        const next = (body.tour ?? {}) as DemoTourProgress;
        setTour(next);
        setOpen((next[workspace]?.status ?? "NOT_STARTED") === "ACTIVE");
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không thể mở hướng dẫn.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspace]);

  useEffect(() => {
    if (!workspace || !open || !step || pathname !== step.href) return;
    let active = true;
    let readyTimer: number | undefined;
    queueMicrotask(() => {
      if (!active) return;
      setClockLoading(true);
      setClockReady(false);
    });
    fetch(`/api/demo/tour-clock?stage=${encodeURIComponent(step.timeline.stage)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(body.error ?? "Không thể chuẩn bị mốc giờ hướng dẫn.");
        return body as TourClock;
      })
      .then((body) => {
        if (!active) return;
        setTourClock(body);
        const url = new URL(window.location.href);
        const contextApplied = workspace === "ADMIN"
          ? url.searchParams.get("date") === body.mealDate && url.searchParams.get("meal") === body.serviceTime
          : url.searchParams.get("meal") === (workspace === "DIETITIAN" ? body.dietMealId : body.mealEventId);
        const alreadyApplied =
          url.searchParams.get(DEMO_TIME_PARAM) === body.nowIso &&
          url.searchParams.get(DEMO_TOUR_TIME_PARAM) === "1" &&
          contextApplied;
        if (alreadyApplied) {
          setClockReady(true);
          return;
        }
        applyDemoTourMealContext(url, workspace, body);
        url.searchParams.set(DEMO_TIME_PARAM, body.nowIso);
        url.searchParams.set(DEMO_TOUR_TIME_PARAM, "1");
        router.replace(`${url.pathname}${url.search}${url.hash}`, {
          scroll: false,
        });
        readyTimer = window.setTimeout(() => {
          if (active) setClockReady(true);
        }, 350);
      })
      .catch((reason) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Không thể chuẩn bị mốc giờ hướng dẫn.",
        );
      })
      .finally(() => {
        if (active) setClockLoading(false);
      });
    return () => {
      active = false;
      if (readyTimer) window.clearTimeout(readyTimer);
    };
  }, [open, pathname, router, step, workspace]);

  const advance = useCallback(async () => {
    if (!workspace || progress.status !== "ACTIVE" || advancing.current) return;
    advancing.current = true;
    setSaving(true);
    const isLast = progress.step >= steps.length - 1;
    const next: DemoTourWorkspaceProgress = isLast
      ? { status: "DONE", step: steps.length }
      : { status: "ACTIVE", step: progress.step + 1 };
    try {
      await saveProgress(next);
      setTour((current) => ({ ...current, [workspace]: next }));
      if (isLast) returnToRealTime();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể lưu tiến độ hướng dẫn.",
      );
    } finally {
      advancing.current = false;
      setSaving(false);
    }
  }, [progress.status, progress.step, returnToRealTime, steps.length, workspace]);

  useEffect(() => {
    if (!open || !step || pathname !== step.href || !clockReady) return;
    const expectation = step.expectation;
    const onInteraction = (event: Event) => {
      if (expectation.type === "action") return;
      if (
        event.type !== expectation.type ||
        !matchesInteraction(event, expectation.selector)
      )
        return;
      void advance();
    };
    const onAction = (event: Event) => {
      if (expectation.type !== "action") return;
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail
        ?.actionId;
      if (actionId === expectation.actionId) void advance();
    };
    document.addEventListener("click", onInteraction, true);
    document.addEventListener("input", onInteraction, true);
    document.addEventListener("change", onInteraction, true);
    window.addEventListener("demo:action-success", onAction);
    return () => {
      document.removeEventListener("click", onInteraction, true);
      document.removeEventListener("input", onInteraction, true);
      document.removeEventListener("change", onInteraction, true);
      window.removeEventListener("demo:action-success", onAction);
    };
  }, [advance, clockReady, open, pathname, step]);

  useEffect(() => {
    document
      .querySelectorAll("[data-demo-highlight]")
      .forEach((node) => node.removeAttribute("data-demo-highlight"));
    if (!open || !step || pathname !== step.href || !clockReady) return;
    let highlighted: Element | null = null;
    const highlight = () => {
      const next = document.querySelector(step.target);
      if (!next || next === highlighted) return;
      highlighted?.removeAttribute("data-demo-highlight");
      highlighted = next;
      next.setAttribute("data-demo-highlight", "true");
      window.requestAnimationFrame(() =>
        next.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
    };
    highlight();
    const observer = new MutationObserver(highlight);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      highlighted?.removeAttribute("data-demo-highlight");
    };
  }, [clockReady, open, pathname, step]);

  if (!workspace || loading) return null;

  async function start() {
    const next =
      progress.status === "DONE"
        ? { status: "DONE" as const, step: steps.length }
        : {
            status: "ACTIVE" as const,
            step: Math.min(progress.step, Math.max(steps.length - 1, 0)),
          };
    setError("");
    try {
      await saveProgress(next);
      setTour((current) => ({ ...current, [workspace!]: next }));
      setOpen(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể bắt đầu hướng dẫn.",
      );
    }
  }

  function closeGuide() {
    setOpen(false);
    returnToRealTime();
  }

  if (!open)
    return (
      <button className="demo-guide-reopen" type="button" onClick={start}>
        <CircleHelp />
        {progress.status === "ACTIVE"
          ? "Tiếp tục hướng dẫn"
          : progress.status === "DONE"
            ? "Đã hoàn thành"
            : "Bắt đầu hướng dẫn"}
      </button>
    );

  if (progress.status === "DONE")
    return (
      <aside className="demo-guide-card is-complete" aria-live="polite">
        <header>
          <span>Hướng dẫn Demo</span>
          <button
            type="button"
            onClick={closeGuide}
            aria-label="Đóng hướng dẫn"
          >
            <X />
          </button>
        </header>
        <CheckCircle2 />
        <strong>
          Đã hoàn thành{" "}
          {workspace === "KITCHEN_SONDE"
            ? "Bếp Sonde"
            : workspace === "KITCHEN_NORMAL"
              ? "Bếp thường"
              : workspace === "NURSE"
                ? "Điều dưỡng"
                : workspace === "DIETITIAN"
                  ? "Dinh dưỡng"
                  : "Quản trị"}
        </strong>
        <p>
          {completedCount}/5 workspace đã hoàn thành. Dùng thanh Demo phía trên
          để chuyển vai trò tiếp theo.
        </p>
      </aside>
    );

  if (!step) return null;
  return (
    <aside className="demo-guide-card is-interactive" aria-live="polite">
      <header>
        <span>
          Thao tác Demo · {progress.step + 1}/{steps.length}
        </span>
        <button
          type="button"
          onClick={closeGuide}
          aria-label="Thoát hướng dẫn"
        >
          <X />
        </button>
      </header>
      <strong>{step.title}</strong>
      <section className="demo-tour-timeline" aria-live="polite">
        <Clock3 aria-hidden="true" />
        <div>
          <span>Thời gian mô phỏng</span>
          <strong>
            {tourClock
              ? `${tourClock.timeLabel} · ${tourClock.stageLabel}`
              : "Đang xác định theo lịch bữa…"}
          </strong>
          {tourClock ? (
            <small>
              {tourClock.mealName} · Chốt {tourClock.cutoffTime} · Phục vụ {tourClock.serviceTime}
            </small>
          ) : null}
        </div>
      </section>
      <p className="demo-tour-milestone">
        <strong>{step.timeline.milestone}</strong>
        {tourClock?.responsibility ?? "Đang chuẩn bị vai trò và mốc thời gian phù hợp."}
      </p>
      <p>{step.instruction}</p>
      {pathname !== step.href ? <a href={step.href}>Mở đúng màn hình</a> : null}
      <footer>
        <span>
          {error ||
            (clockLoading || !clockReady
              ? "Đang chuyển tới mốc thời gian mô phỏng…"
              : pathname === step.href
              ? "Thao tác đúng vào vùng đang được làm nổi bật."
              : "Đang chờ control sẵn sàng…")}
        </span>
        {saving ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <b>Không thể bỏ qua bước bắt buộc</b>
        )}
      </footer>
    </aside>
  );
}
