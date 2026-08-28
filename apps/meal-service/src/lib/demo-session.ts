import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { FeedingRoute, Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { deleteStoredEvidence } from "./evidence-storage";
import {
  DEMO_TOUR_STEPS,
  canTransitionTour,
  normalizeTourProgress,
  type DemoTourProgress,
  type DemoTourWorkspaceProgress,
} from "./demo-tour";

export const DEMO_SESSION_COOKIE = "meal_service_demo_session";
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("base64url");
const DEMO_MAX_AGE = 60 * 60 * 8;

export const DEMO_WORKSPACES = [
  "NURSE",
  "DIETITIAN",
  "KITCHEN_NORMAL",
  "ADMIN",
  "KITCHEN_SONDE",
] as const;
export type DemoWorkspace = (typeof DEMO_WORKSPACES)[number];
export type DemoReport = {
  mealEventId: string;
  departmentId: string;
  reportedByName: string;
  submittedAt: string;
  lines: Array<{
    dietTypeId: string;
    quantity: number;
    internalNote: string | null;
    patientVisibleNote: string | null;
  }>;
};
export type DemoReceipt = {
  mealEventId: string;
  departmentId: string;
  status: "FULL" | "SHORT";
  expectedQuantity: number;
  receivedQuantity: number;
  note: string | null;
  confirmedAt: string;
  confirmedBy: string;
};
export type DemoEvidence = {
  kind: "MEAL_PHOTO" | "FOOD_SAMPLE";
  dietMealId?: string;
  mealEventId?: string;
  storagePath: string;
  note: string | null;
  uploadedAt: string;
  uploadedBy: string;
};
export type DemoAddition = {
  id: string;
  mealEventId: string;
  departmentId: string;
  dietTypeId: string;
  feedingRoute: FeedingRoute;
  quantity: number;
  reason: string;
  kind: "SUPPLEMENT" | "URGENT_POST_SERVE";
  ackStatus: "PENDING" | "RECEIVED" | "INSUFFICIENT" | "SUBSTITUTE";
  submittedAt: string;
  submittedBy: string;
  kitchenNote: string | null;
};
export type DemoSessionState = {
  reports: DemoReport[];
  receipts: DemoReceipt[];
  dietStatuses: Record<string, string>;
  evidence: DemoEvidence[];
  additions: DemoAddition[];
  menus: Record<string, unknown>;
  tour: DemoTourProgress;
};

export const emptyDemoState = (): DemoSessionState => ({
  reports: [],
  receipts: [],
  dietStatuses: {},
  evidence: [],
  additions: [],
  menus: {},
  tour: {},
});
export const demoSessionEnabled = (
  env: Record<string, string | undefined> = process.env,
) => env.DEMO_MODE === "1" && env.DEMO_DATASET === "1";
export const isDemoWorkspace = (value: unknown): value is DemoWorkspace =>
  typeof value === "string" &&
  (DEMO_WORKSPACES as readonly string[]).includes(value);
const WORKSPACE_IDENTITIES = {
  NURSE: {
    email: "nurse@demo.local",
    role: "NURSE",
    kitchenRoute: null,
    href: "/bao-suat",
  },
  DIETITIAN: {
    email: "dietitian@demo.local",
    role: "DIETITIAN",
    kitchenRoute: null,
    href: "/thuc-don",
  },
  KITCHEN_NORMAL: {
    email: "kitchen@demo.local",
    role: "KITCHEN",
    kitchenRoute: "NORMAL",
    href: "/bep",
  },
  ADMIN: {
    email: "admin@demo.local",
    role: "ADMIN",
    kitchenRoute: null,
    href: "/quan-ly",
  },
  KITCHEN_SONDE: {
    email: "sonde@demo.local",
    role: "KITCHEN",
    kitchenRoute: "SONDE",
    href: "/bep",
  },
} satisfies Record<
  DemoWorkspace,
  { email: string; role: Role; kitchenRoute: FeedingRoute | null; href: string }
>;
export const demoWorkspaceIdentity = (workspace: DemoWorkspace) =>
  WORKSPACE_IDENTITIES[workspace];

async function discardEvidence(state: DemoSessionState) {
  await Promise.all(
    state.evidence.map((item) => deleteStoredEvidence(item.storagePath)),
  );
}

function parseState(value: unknown): DemoSessionState {
  const state =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<DemoSessionState>)
      : {};
  return {
    reports: Array.isArray(state.reports) ? state.reports : [],
    receipts: Array.isArray(state.receipts) ? state.receipts : [],
    dietStatuses:
      state.dietStatuses &&
      typeof state.dietStatuses === "object" &&
      !Array.isArray(state.dietStatuses)
        ? state.dietStatuses
        : {},
    evidence: Array.isArray(state.evidence) ? state.evidence : [],
    additions: Array.isArray(state.additions) ? state.additions : [],
    menus:
      state.menus &&
      typeof state.menus === "object" &&
      !Array.isArray(state.menus)
        ? state.menus
        : {},
    tour: normalizeTourProgress(state.tour),
  } as DemoSessionState;
}

export async function readDemoSession() {
  if (!demoSessionEnabled()) return null;
  const token = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.demoSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    !isDemoWorkspace(session.workspace)
  )
    return null;
  return {
    id: session.id,
    workspace: session.workspace,
    state: parseState(session.stateJson),
  };
}

export async function startDemoSession(workspace: DemoWorkspace = "NURSE") {
  if (!demoSessionEnabled())
    throw new Error("Demo Session chỉ hoạt động trên máy chủ Demo riêng.");
  const store = await cookies();
  const previous = store.get(DEMO_SESSION_COOKIE)?.value;
  if (previous) {
    const oldSession = await prisma.demoSession.findUnique({
      where: { tokenHash: hashToken(previous) },
      select: { id: true, stateJson: true },
    });
    if (oldSession) {
      await discardEvidence(parseState(oldSession.stateJson));
      await prisma.demoSession.delete({ where: { id: oldSession.id } });
    }
  }
  const token = randomBytes(32).toString("base64url");
  await prisma.demoSession.create({
    data: {
      tokenHash: hashToken(token),
      workspace,
      stateJson: emptyDemoState() as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + DEMO_MAX_AGE * 1000),
    },
  });
  store.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.INSECURE_COOKIES !== "1" &&
      process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_MAX_AGE,
  });
}

export async function setDemoWorkspace(workspace: DemoWorkspace) {
  const session = await readDemoSession();
  if (!session) throw new Error("Phiên Demo đã hết hạn.");
  await prisma.demoSession.update({
    where: { id: session.id },
    data: { workspace },
  });
}
export async function resetDemoSession() {
  const session = await readDemoSession();
  if (!session) throw new Error("Phiên Demo đã hết hạn.");
  await discardEvidence(session.state);
  await prisma.demoSession.update({
    where: { id: session.id },
    data: { stateJson: emptyDemoState() as unknown as Prisma.InputJsonValue },
  });
}
export async function exitDemoSession() {
  const store = await cookies();
  const token = store.get(DEMO_SESSION_COOKIE)?.value;
  if (demoSessionEnabled() && token) {
    const session = await prisma.demoSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (session) {
      await discardEvidence(parseState(session.stateJson));
      await prisma.demoSession.delete({ where: { id: session.id } });
    }
  }
  store.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export async function updateDemoState(
  mutator: (state: DemoSessionState) => DemoSessionState | void,
) {
  const session = await readDemoSession();
  if (!session) return null;
  const next = structuredClone(session.state);
  mutator(next);
  await prisma.demoSession.update({
    where: { id: session.id },
    data: { stateJson: next as unknown as Prisma.InputJsonValue },
  });
  return next;
}

export async function updateDemoTourProgress(
  workspace: DemoWorkspace,
  progress: DemoTourWorkspaceProgress,
) {
  const session = await readDemoSession();
  if (!session || session.workspace !== workspace)
    throw new Error("Workspace Demo không hợp lệ.");
  const current = session.state.tour[workspace] ?? {
    status: "NOT_STARTED",
    step: 0,
  };
  if (!canTransitionTour(current, progress, DEMO_TOUR_STEPS[workspace].length))
    throw new Error("Không thể bỏ qua bước hướng dẫn bắt buộc.");
  await updateDemoState((state) => {
    state.tour[workspace] = progress;
  });
}
